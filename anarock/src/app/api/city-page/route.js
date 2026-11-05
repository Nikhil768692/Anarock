import { NextResponse } from "next/server";
import { catalystFetch, projectId } from "@/lib/catalyst";
import { getOrFetchCache } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATALYST_API_URL = "https://api.catalyst.zoho.in";
const ADVISORS_TABLE = "CityAdvisors";
const MARKET_STATS_TABLE = "CityMarketStats";

// Rows are cached in memory for 5 minutes, so edits made in the
// Catalyst Data Store show up on the website within a few minutes.
const CACHE_TTL = 5 * 60 * 1000;
const MAX_PAGES = 50;

const CITY_ALIASES = {
  bangalore: "bengaluru",
  gurgaon: "gurugram",
  bombay: "mumbai",
  calcutta: "kolkata",
  madras: "chennai",
  "new delhi": "delhi",
};

function normalizeCity(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return CITY_ALIASES[normalized] || normalized;
}

function getField(row, fieldName) {
  if (!row || typeof row !== "object") return null;

  if (row[fieldName] !== undefined) {
    return row[fieldName];
  }

  const matchedKey = Object.keys(row).find(
    (key) => key.toLowerCase() === fieldName.toLowerCase(),
  );

  return matchedKey ? row[matchedKey] : null;
}

function toText(value) {
  return String(value ?? "").trim();
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getTimestamp(row) {
  const value = getField(row, "MODIFIEDTIME") || getField(row, "CREATEDTIME");
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

async function fetchAllRows(tableName) {
  const rows = [];
  let nextToken = null;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const params = new URLSearchParams({ max_rows: "100" });

    if (nextToken) {
      params.set("next_token", nextToken);
    }

    const url =
      `${CATALYST_API_URL}/baas/v1/project/${encodeURIComponent(projectId)}` +
      `/table/${encodeURIComponent(tableName)}/row?${params.toString()}`;

    const response = await catalystFetch(url, { method: "GET" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !Array.isArray(data?.data)) {
      const error = new Error(
        data?.message || `Unable to read the ${tableName} table.`,
      );
      error.status = response.status;
      throw error;
    }

    rows.push(...data.data);

    const newNextToken = data.next_token || data.nextToken || null;
    const moreRecords = Boolean(
      data.more_records ?? data.moreRecords ?? newNextToken,
    );

    if (!moreRecords || !newNextToken || newNextToken === nextToken) {
      break;
    }

    nextToken = newNextToken;
  }

  return rows;
}

function getCachedRows(tableName) {
  return getOrFetchCache(
    `catalyst:${tableName}:all`,
    () => fetchAllRows(tableName),
    CACHE_TTL,
    { staleWhileRevalidate: true },
  );
}

function pickLatestRowForCity(rows, city) {
  const target = normalizeCity(city);

  return (
    rows
      .filter((row) => normalizeCity(getField(row, "CityName")) === target)
      .sort((a, b) => getTimestamp(b) - getTimestamp(a))[0] || null
  );
}

function mapAdvisor(row) {
  if (!row) return null;

  const name = toText(getField(row, "AdvisorName"));
  if (!name) return null;

  return {
    name,
    designation: toText(getField(row, "Designation")),
    experienceYears: toNumber(getField(row, "ExperienceYears")),
    photoUrl: toText(getField(row, "PhotoUrl")),
  };
}

function mapMarketStats(row) {
  if (!row) return null;

  return {
    quarterLabel: toText(getField(row, "QuarterLabel")),
    averageRent: toNumber(getField(row, "AverageRent")),
    vacancyPercent: toNumber(getField(row, "VacancyPercent")),
    vacancyChangePts: toNumber(getField(row, "VacancyChangePts")),
    absorptionMnSqft: toNumber(getField(row, "AbsorptionMnSqft")),
    newSupplyMnSqft: toNumber(getField(row, "NewSupplyMnSqft")),
    mostActiveMicromarket: toText(getField(row, "MostActiveMicromarket")),
  };
}

async function settle(promise, label) {
  try {
    return await promise;
  } catch (error) {
    console.error(`[City Page API] ${label} failed:`, {
      message: error?.message,
      status: error?.status,
    });
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = toText(searchParams.get("city"));

  if (!city || city.length > 100 || /[\r\n]/.test(city)) {
    return NextResponse.json(
      { success: false, error: "A valid city is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Each table is loaded independently, so a problem with one table
  // does not hide the data from the other.
  const [advisorRows, marketRows] = await Promise.all([
    settle(getCachedRows(ADVISORS_TABLE), ADVISORS_TABLE),
    settle(getCachedRows(MARKET_STATS_TABLE), MARKET_STATS_TABLE),
  ]);

  return NextResponse.json(
    {
      success: true,
      city,
      advisor: advisorRows
        ? mapAdvisor(pickLatestRowForCity(advisorRows, city))
        : null,
      market: marketRows
        ? mapMarketStats(pickLatestRowForCity(marketRows, city))
        : null,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}