import { NextResponse } from "next/server";
import { catalystFetch, projectId } from "@/lib/catalyst";
import { getOrFetchCache } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATALYST_API_URL = "https://api.catalyst.zoho.in";
const ADVISORS_TABLE = "CityAdvisors";
const MARKET_STATS_TABLE = "CityMarketStats";
const MICROMARKETS_TABLE = "CityMicromarkets";

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

// A WorkDrive download link (".../external/<id>/download") opens a download
// page. Adding ?directDownload=true makes it return the file itself, so it
// can be shown as an image. Other links are used as they are.
function toPhotoUrl(value) {
  const text = toText(value);
  if (!text) return "";

  try {
    const url = new URL(text);
    const isWorkDrive = /(^|\.)workdrive\.zohoexternal\./i.test(url.hostname);

    if (
      isWorkDrive &&
      /\/external\/[^/]+\/download\/?$/i.test(url.pathname) &&
      !url.searchParams.has("directDownload")
    ) {
      url.searchParams.set("directDownload", "true");
      return url.toString();
    }
  } catch {
    // Not a full address; use it as it is.
  }

  return text;
}

function mapAdvisor(row) {
  if (!row) return null;

  const name = toText(getField(row, "AdvisorName"));
  if (!name) return null;

  return {
    name,
    designation: toText(getField(row, "Designation")),
    experienceYears: toNumber(getField(row, "ExperienceYears")),
    photoUrl: toPhotoUrl(getField(row, "PhotoUrl")),
  };
}

// Rent is INR per sq ft per month. RentRange is a text column that holds a
// range like "60-400" (shown as "₹60–400"); AverageRent holds one number.
function parseRent(value) {
  const text = toText(value).replace(/,/g, "");
  const range = text.match(/^(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)$/);
  if (range) {
    return { averageRent: null, rentMin: Number(range[1]), rentMax: Number(range[2]) };
  }
  return { averageRent: toNumber(text), rentMin: null, rentMax: null };
}

function mapMarketStats(row) {
  if (!row) return null;

  return {
    quarterLabel: toText(getField(row, "QuarterLabel")),
    // RentRange (text, e.g. "60-400") wins over AverageRent (number).
    ...parseRent(getField(row, "RentRange") || getField(row, "AverageRent")),
    vacancyPercent: toNumber(getField(row, "VacancyPercent")),
    vacancyChangePts: toNumber(getField(row, "VacancyChangePts")),
    absorptionMnSqft: toNumber(getField(row, "AbsorptionMnSqft")),
    newSupplyMnSqft: toNumber(getField(row, "NewSupplyMnSqft")),
    mostActiveMicromarket: toText(getField(row, "MostActiveMicromarket")),
  };
}

// One row per micro-market. Rent is in INR per sq ft per month.
// MicromarketName must be written exactly as on the properties
// (for example "BLR CBD"), so the property count and the link match.
function mapMicromarkets(rows, city) {
  const target = normalizeCity(city);
  const byName = new Map();

  rows
    .filter((row) => normalizeCity(getField(row, "CityName")) === target)
    .sort((a, b) => getTimestamp(b) - getTimestamp(a))
    .forEach((row) => {
      const name = toText(getField(row, "MicromarketName"));
      const key = name.toLowerCase();
      if (!name || byName.has(key)) return;

      byName.set(key, {
        name,
        rentMin: toNumber(getField(row, "RentMin")),
        rentMax: toNumber(getField(row, "RentMax")),
        sortOrder: toNumber(getField(row, "SortOrder")),
      });
    });

  return [...byName.values()].sort(
    (a, b) =>
      (a.sortOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
      a.name.localeCompare(b.name),
  );
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
  const [advisorRows, marketRows, micromarketRows] = await Promise.all([
    settle(getCachedRows(ADVISORS_TABLE), ADVISORS_TABLE),
    settle(getCachedRows(MARKET_STATS_TABLE), MARKET_STATS_TABLE),
    settle(getCachedRows(MICROMARKETS_TABLE), MICROMARKETS_TABLE),
  ]);

  const advisorRow = advisorRows
    ? pickLatestRowForCity(advisorRows, city)
    : null;

  return NextResponse.json(
    {
      success: true,
      city,
      // Optional HeroTitle column in CityAdvisors: the big heading on the
      // city page. Empty means the page uses its default heading.
      heroTitle: toText(getField(advisorRow, "HeroTitle")),
      // Optional HeroDescription column in CityAdvisors: the text under the
      // heading, shown exactly as written. Empty means the default text.
      heroDescription: toText(getField(advisorRow, "HeroDescription")),
      advisor: advisorRows
        ? mapAdvisor(advisorRow)
        : null,
      market: marketRows
        ? mapMarketStats(pickLatestRowForCity(marketRows, city))
        : null,
      micromarkets: micromarketRows
        ? mapMicromarkets(micromarketRows, city)
        : [],
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}