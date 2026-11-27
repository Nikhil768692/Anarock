import PropertyDetailClient from "./PropertyDetailClient";
import { getAllProperties, getPropertyById } from "@/lib/propertiesCache";
import { toPublicProperty } from "@/lib/propertyMapper";
import { getCachedPropertyImages } from "@/lib/propertyImages";
import { getRelatedProperties } from "@/lib/relatedProperties";
import { notFound, permanentRedirect } from "next/navigation";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const SITE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL || "https://anarock.com"
).replace(/\/+$/, "");

function createSlug(value) {
  return (
    String(value || "commercial-property")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "commercial-property"
  );
}

function getPropertyName(property, fallback = "") {
  return String(property?.name || "Commercial Property").trim();
}

async function resolveProperty(params) {
  const resolvedParams = await params;
  const id = String(resolvedParams?.id || "").trim();

  if (!id || id.length > 100 || /[\r\n]/.test(id)) {
    return {
      id: "",
      property: null,
      name: "Commercial Property",
    };
  }

  try {
    const property = await getPropertyById(id);

    return {
      id,
      property,
      name: getPropertyName(property, resolvedParams?.name),
    };
  } catch (error) {
    logger.error(
      "[Property Detail Page] Property lookup failed:",
      error?.message || error,
    );

    return {
      id,
      property: null,
      name: getPropertyName(null, resolvedParams?.name),
    };
  }
}

export async function generateMetadata({ params }) {
  const { id, property, name } = await resolveProperty(params);

  if (!property) {
    return {
      title: "Property Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const slug = createSlug(name);
  const canonicalUrl = `${SITE_URL}/properties/${encodeURIComponent(id)}/${slug}`;
  const city = property.city || property.City || "";
  const micromarket = property.micromarket || property.Micromarket || "";
  const locationText = [micromarket, city].filter(Boolean).join(", ");
  const description = [
    `Explore ${name}.`,
    locationText ? `Located in ${locationText}.` : "",
    "View property details, commercial office space information, and availability with Anarock.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    title: `${name} | Commercial Property`,
    description,
    keywords: [
      name,
      "commercial property",
      "commercial real estate",
      "commercial office space",
      "office space for rent",
      "managed office space",
      "coworking space",
      city,
      micromarket,
    ].filter(Boolean),

    alternates: {
      canonical: canonicalUrl,
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    openGraph: {
      title: `${name} | Commercial Property | Anarock`,
      description,
      url: canonicalUrl,
      siteName: "Anarock",
      locale: "en_IN",
      type: "website",
    },

    twitter: {
      card: "summary_large_image",
      title: `${name} | Commercial Property | Anarock`,
      description,
    },
  };
}

// A property that was re-created in the data store gets a new ID. Old links
// still carry its name, so a unique name match is sent to the new address.
async function findMovedProperty(params) {
  const slug = createSlug((await params)?.name || "");
  if (!slug || slug === "commercial-property") return null;

  try {
    const matches = (await getAllProperties()).filter(
      (item) => createSlug(item?.name) === slug,
    );
    return matches.length === 1 ? matches[0] : null;
  } catch {
    return null;
  }
}

export default async function PropertyDetailPage({ params }) {
  const { id, property } = await resolveProperty(params);

  if (!property) {
    const moved = await findMovedProperty(params);
    if (moved?.id) {
      permanentRedirect(
        `/properties/${encodeURIComponent(moved.id)}/${createSlug(moved.name)}`,
      );
    }
    notFound();
  }

  // The page is rendered on the server with the property, its images and a
  // few related properties, so the content is in the HTML (search engines and
  // a faster first view). Image or related lookups that fail are left empty.
  const [gallery, related] = await Promise.all([
    getCachedPropertyImages(property).catch(() => []),
    getRelatedProperties(property).catch(() => []),
  ]);

  return (
    <PropertyDetailClient
      propertyId={id}
      initialProperty={toPublicProperty(property)}
      initialGallery={Array.isArray(gallery) ? gallery : []}
      initialRelated={related}
    />
  );
}
