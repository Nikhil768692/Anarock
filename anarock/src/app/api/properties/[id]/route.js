import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getPropertyById,
  getPropertiesCacheInfo,
} from "@/lib/propertiesCache";
import {
  catalystFetch,
  projectId,
  PROPERTY_IMAGES_BUCKET,
} from "@/lib/catalyst";
import { getOrFetchCache } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_BASE_URL = "https://property-images.zohostratus.in";
const CATALYST_API_URL = "https://api.catalyst.zoho.in";

// Image formats browsers show. Other formats are not looked for.
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"];

// The image list of a property folder is kept for 1 hour, like the
// properties data.
const GALLERY_CACHE_TTL = 60 * 60 * 1000;

// If listing the bucket fails (for example the token lacks the Stratus
// read scope), file-by-file checks are used for a while instead.
const LISTING_RETRY_AFTER_MS = 6 * 60 * 60 * 1000;
let listingBlockedUntil = 0;

const IMAGE_FILES = [
  { key: "project", name: "Project Picture 1", baseName: "Project_Picture_1" },
  { key: "floor-plan", name: "Floor Plan 1", baseName: "Floor_Plan_1" },
  ...Array.from({ length: 10 }, (_, index) => ({
    key: `property-${index + 1}`,
    name: `Property Photo ${index + 1}`,
    baseName: `Property_Photo_${index + 1}`,
  })),
];

async function checkImageUrl(url) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      cache: "force-cache",
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) return true;
    if ([403, 405, 501].includes(response.status)) {
      const getResponse = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        cache: "force-cache",
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      });

      const exists = getResponse.ok;
      await getResponse.body?.cancel().catch(() => { });
      return exists;
    }

    return false;
  } catch {
    return false;
  }
}

// One call lists every file in the property folder; the gallery is then
// matched by file name. Returns null when listing is not possible.
async function listFolderFileNames(folder) {
  if (Date.now() < listingBlockedUntil) return null;

  const names = new Map();
  let continuationToken = "";

  try {
    for (let page = 0; page < 5; page += 1) {
      const params = new URLSearchParams({
        bucket_name: PROPERTY_IMAGES_BUCKET,
        prefix: `${folder}/`,
        max_keys: "1000",
        folder_listing: "false",
      });
      if (continuationToken) {
        params.set("continuation_token", continuationToken);
      }

      const url =
        `${CATALYST_API_URL}/baas/v1/project/${encodeURIComponent(projectId)}` +
        `/bucket/objects?${params.toString()}`;

      const response = await catalystFetch(url, { method: "GET" });
      const body = await response.json().catch(() => ({}));
      const contents = body?.data?.contents;

      if (!response.ok || !Array.isArray(contents)) {
        const error = new Error(
          body?.data?.message || body?.message || "Bucket listing failed",
        );
        error.status = response.status;
        throw error;
      }

      for (const item of contents) {
        const key = String(item?.key || "");
        const fileName = key.split("/").pop();
        if (fileName) names.set(fileName.toLowerCase(), fileName);
      }

      continuationToken = body?.data?.next_continuation_token || "";
      if (!continuationToken) break;
    }

    return names;
  } catch (error) {
    listingBlockedUntil = Date.now() + LISTING_RETRY_AFTER_MS;
    console.warn("[Property Detail API] Image listing failed, checking files one by one:", {
      message: error?.message,
      status: error?.status,
    });
    return null;
  }
}

function getCachedPropertyImages(property) {
  const folder = String(property?.ImageFolderPath || "")
    .replace(/^\/+|\/+$/g, "");

  if (!folder) return Promise.resolve([]);

  return getOrFetchCache(
    `property-images:${folder}`,
    () => resolvePropertyImages(property),
    GALLERY_CACHE_TTL,
    { staleWhileRevalidate: true },
  );
}

async function resolvePropertyImages(property) {
  const folder = String(property?.ImageFolderPath || "")
    .replace(/^\/+|\/+$/g, "");

  if (!folder) return [];

  const folderParts = folder.split("/").filter(Boolean);

  if (
    folderParts.some(
      (part) =>
        part === "." ||
        part === ".." ||
        !/^[a-zA-Z0-9 _().-]+$/.test(part)
    )
  ) {
    return [];
  }

  const encodedFolder = folderParts
    .map(encodeURIComponent)
    .join("/");

  const fileNames = await listFolderFileNames(folderParts.join("/"));

  if (fileNames) {
    return IMAGE_FILES.map((image) => {
      for (const extension of IMAGE_EXTENSIONS) {
        const fileName = fileNames.get(
          `${image.baseName}.${extension}`.toLowerCase(),
        );
        if (fileName) {
          return {
            key: image.key,
            name: image.name,
            url:
              `${IMAGE_BASE_URL}/${encodedFolder}/` +
              encodeURIComponent(fileName),
          };
        }
      }
      return null;
    }).filter(Boolean);
  }

  const resolved = await Promise.all(
    IMAGE_FILES.map(async (image) => {
      for (const extension of IMAGE_EXTENSIONS) {
        const url =
          `${IMAGE_BASE_URL}/${encodedFolder}/` +
          `${encodeURIComponent(image.baseName)}.${extension}`;

        if (await checkImageUrl(url)) {
          return {
            key: image.key,
            name: image.name,
            url,
          };
        }
      }

      return null;
    })
  );

  return resolved.filter(Boolean);
}

export async function GET(request, context) {
  const requestId = randomUUID();
  const requestStartedAt = Date.now();

  try {
    const params =
      context?.params instanceof Promise
        ? await context.params
        : context?.params;

    const id = String(params?.id ?? "").trim();

    if (!id || id.length > 100 || /[\r\n]/.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid property ID is required.",
        },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const property = await getPropertyById(id);

    if (!property) {
      return NextResponse.json(
        {
          success: false,
          error: "Property not found",
          id,
        },
        {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }
    const galleryImages = await getCachedPropertyImages(property);
    const cacheInfo = getPropertiesCacheInfo();
    console.info("[Property Detail API]", {
      requestId,
      durationMs: Date.now() - requestStartedAt,
      cacheCount: cacheInfo.count,
      cacheFresh: cacheInfo.isFresh,
      cacheStale: cacheInfo.isStale,
      refreshInProgress: cacheInfo.refreshInProgress,
      galleryImageCount: galleryImages.length,
    });
    return NextResponse.json(
      {
        success: true,
        data: property,
        property,
        galleryImages,
        cachedAt: cacheInfo.cachedAt,
        cache: {
          count: cacheInfo.count,
          isFresh: cacheInfo.isFresh,
          isStale: cacheInfo.isStale,
          refreshInProgress: cacheInfo.refreshInProgress,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
          "X-Property-Cache": cacheInfo.isFresh
            ? "fresh"
            : cacheInfo.isStale
              ? "stale"
              : "cold",
        },
      }
    );
  } catch (error) {
    console.error("[Property Detail API] Failed:", {
      requestId,
      name: error?.name || "Error",
      code: error?.code || null,
      status: error?.status || null,
      message: error?.message || "Unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch property. Please try again.",
        requestId,
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
