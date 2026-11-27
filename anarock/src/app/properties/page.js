import { Suspense } from "react";
import PropertiesClient from "./PropertiesClient";
import { queryProperties } from "@/lib/propertyQuery";
import { logger } from "@/lib/logger";

// Must match ITEMS_PER_PAGE in PropertiesClient.
const ITEMS_PER_PAGE = 30;

// URL settings the server can apply exactly as the browser would. With any
// other filter (budget, area, seats, micro-markets, AI search) the list is
// still loaded in the browser, because those need the visitor's currency,
// unit or the micro-market list.
const SERVER_RENDERED_PARAMS = new Set(["city", "type", "sort", "page", "currency", "areaUnit"]);

async function getInitialResults(params) {
  const keys = Object.keys(params || {});
  if (keys.some((key) => !SERVER_RENDERED_PARAMS.has(key))) return null;

  const value = (key) => {
    const raw = params[key];
    return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
  };
  if (value("type").toLowerCase() === "ai") return null;

  const page = Math.max(1, Number.parseInt(value("page") || "1", 10) || 1);

  try {
    const result = await queryProperties({
      city: value("city"),
      type: value("type"),
      sort: value("sort"),
      page,
      pageSize: ITEMS_PER_PAGE,
    });
    // With no results the browser shows suggestions, so it loads the list.
    if (!result.data.length) return null;

    const query = new URLSearchParams();
    for (const key of keys) query.set(key, value(key));
    return { query: query.toString(), ...result };
  } catch (error) {
    logger.error("[Properties page] Server list failed:", error?.message || error);
    return null;
  }
}

export async function generateMetadata({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const city = resolvedSearchParams?.city ? decodeURIComponent(resolvedSearchParams.city) : "";
  const type = resolvedSearchParams?.type ? decodeURIComponent(resolvedSearchParams.type) : "";
  const micromarket = resolvedSearchParams?.micromarket ? decodeURIComponent(resolvedSearchParams.micromarket) : "";

  const formattedCity = city ? city.charAt(0).toUpperCase() + city.slice(1) : "";
  const formattedType = type ? type.replace(/-/g, " ") : "Commercial Office Space";

  const titleBase = formattedCity
    ? `${formattedType} for Rent in ${formattedCity} | Commercial Real Estate`
    : "Commercial Properties, Office Spaces & Co-working for Rent";

  const description = formattedCity
    ? `Explore verified commercial properties, ${formattedType.toLowerCase()}, and flexible co-working spaces in ${formattedCity}${micromarket ? ` (${micromarket})` : ""}. Find your ideal corporate office with expert guidance.`
    : "Discover premium commercial properties, managed offices, and co-working spaces across top business hubs. Rent corporate office space tailored to your business needs.";
  const keywordsList = [
    "commercial properties",
    "commercial real estate",
    "office space for rent",
    "managed office space",
    "co-working space",
    "flexible workspace",
    "corporate office leasing",
    formattedCity ? `commercial property in ${formattedCity}` : "",
    formattedCity ? `office space in ${formattedCity}` : "",
    formattedCity ? `coworking space in ${formattedCity}` : "",
    micromarket ? `office in ${micromarket}` : "",
    "commercial leasing advisors",
  ].filter(Boolean);

  return {
    title: titleBase,
    description: description,
    keywords: keywordsList.join(", "),
    alternates: {
      canonical: "https://anarock.com/properties",
    },
    openGraph: {
      title: titleBase,
      description: description,
      url: "https://anarock.com/properties",
      siteName: "Anarock Commercial Real Estate",
      type: "website",
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: titleBase,
      description: description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function PropertiesPage({ searchParams }) {
  const initialResults = await getInitialResults(await searchParams);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": "Anarock Commercial Real Estate",
    "description": "Leading commercial real estate platform for office spaces, managed offices, and co-working spaces.",
    "url": "https://anarock.com/properties",
    "areaServed": [
      "Mumbai", "Bengaluru", "Delhi NCR", "Gurgaon", "Noida", "Pune", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad"
    ],
    "serviceType": [
      "Commercial Property Leasing",
      "Office Space Rental",
      "Co-working Space Advisory",
      "Managed Office Solutions"
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50 px-4 py-10">
          <div className="mx-auto max-w-7xl text-slate-600">Loading properties...</div>
        </div>
      }>
        <PropertiesClient initialResults={initialResults} />
      </Suspense>
    </>
  );
}