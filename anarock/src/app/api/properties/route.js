import { NextResponse } from "next/server";
import { toPublicProperties } from "@/lib/propertyMapper";
import {
  getPropertiesByIds,
  getPropertiesCacheInfo,
} from "@/lib/propertiesCache";
import {
  MAX_PAGE_SIZE,
  MAX_TARGET_IDS,
  parsePositiveInteger,
  queryProperties,
} from "@/lib/propertyQuery";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cacheResponseHeaders(cacheInfo, count, total, noStore = false) {
  return {
    "Cache-Control": noStore
      ? "no-store"
      : "public, s-maxage=30, stale-while-revalidate=60",
    "X-Properties-Count": String(count),
    "X-Properties-Total": String(total),
    "X-Properties-Cache": cacheInfo.isFresh
      ? "fresh"
      : cacheInfo.isStale
        ? "stale"
        : "cold",
  };
}

export async function GET(request) {
  const startedAt = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || "";
    const type = searchParams.get("type") || "";
    const micromarket = searchParams.get("micromarket") || "";
    const minBudget = searchParams.get("minBudget") || "";
    const maxBudget = searchParams.get("maxBudget") || "";
    const area = searchParams.get("area") || "";
    const maxArea = searchParams.get("maxArea") || "";
    const seats = searchParams.get("seats") || "";
    const maxSeats = searchParams.get("maxSeats") || "";
    const sort = searchParams.get("sort") || "";
    const hasPagination =
      searchParams.has("page") ||
      searchParams.has("pageSize") ||
      searchParams.has("limit");
    const page = parsePositiveInteger(searchParams.get("page"), 1);
    const pageSize = parsePositiveInteger(
      searchParams.get("pageSize") ?? searchParams.get("limit"),
      30,
      MAX_PAGE_SIZE,
    );
    const requestedIds = [
      ...new Set(
        (searchParams.get("ids") || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ].slice(0, MAX_TARGET_IDS);
    if (requestedIds.length > 0) {
      const data = toPublicProperties(await getPropertiesByIds(requestedIds));
      const cacheInfo = getPropertiesCacheInfo();
      return NextResponse.json(
        {
          success: true,
          data,
          total: data.length,
          page: 1,
          pageSize: data.length,
          totalPages: data.length ? 1 : 0,
          hasMore: false,
          cachedAt: cacheInfo.cachedAt,
          cache: {
            count: cacheInfo.count,
            isFresh: cacheInfo.isFresh,
            isStale: cacheInfo.isStale,
            refreshInProgress: cacheInfo.refreshInProgress,
          },
        },
        {
          headers: cacheResponseHeaders(
            cacheInfo,
            data.length,
            data.length,
            true,
          ),
        },
      );
    }

    const result = await queryProperties({
      city,
      type,
      micromarket,
      minBudget,
      maxBudget,
      area,
      maxArea,
      seats,
      maxSeats,
      sort,
      page,
      pageSize,
      paginate: hasPagination,
    });
    const { total } = result;
    const responseData = result.data;

    const cacheInfo = getPropertiesCacheInfo();
    const durationMs = Date.now() - startedAt;

    logger.info("[Properties API]", {
      durationMs,
      city: city || null,
      type: type || null,
      total,
      returned: responseData.length,
      page: hasPagination ? page : null,
      pageSize: hasPagination ? pageSize : null,
      cacheCount: cacheInfo.count,
      cacheFresh: cacheInfo.isFresh,
      cacheStale: cacheInfo.isStale,
      refreshInProgress: cacheInfo.refreshInProgress,
    });

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        hasMore: result.hasMore,
        cachedAt: cacheInfo.cachedAt,
        cache: {
          count: cacheInfo.count,
          isFresh: cacheInfo.isFresh,
          isStale: cacheInfo.isStale,
          refreshInProgress: cacheInfo.refreshInProgress,
        },
      },
      {
        headers: cacheResponseHeaders(cacheInfo, responseData.length, total),
      },
    );
  } catch (error) {
    logger.error("[Properties API] Request failed:", {
      message: error?.message || String(error),
      name: error?.name || null,
      code: error?.code || null,
      status: error?.status || null,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch properties",
        details:
          process.env.NODE_ENV === "development"
            ? error?.message || String(error)
            : undefined,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}