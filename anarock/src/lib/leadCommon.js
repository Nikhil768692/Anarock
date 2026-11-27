// Helpers shared by the lead routes (/api/leads, /api/lead2, /api/lead3).
import crypto from "node:crypto";

const CITY_CACHE_TTL_MS = 15 * 60 * 1000;
const CITY_PAGE_SIZE = 200;
const CITY_MAX_PAGES = 10;

export function createRequestId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizePhone(value) {
  return String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");
}

export function isValidPhone(value) {
  return /^\+?[1-9]\d{7,14}$/.test(value);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function normalizeCityName(value) {
  return normalizeText(value);
}

export function isValidCityName(value) {
  if (!value) return false;
  return /^[\p{L}\p{N} .'-]{1,100}$/u.test(value);
}

// Sales team that owns a Lead, from the visitor's city and state.
export function mapLocationToLeadOwnerTeam(city, state) {
  const cityLower = String(city || "").trim().toLowerCase();
  const stateLower = String(state || "").trim().toLowerCase();

  if (cityLower.includes("bengaluru") || cityLower.includes("bangalore")) {
    return "Bengaluru";
  }
  if (cityLower.includes("chennai")) return "Chennai";
  if (cityLower.includes("hyderabad")) return "Hyderabad";
  if (cityLower.includes("kolkata")) return "Kolkata";
  if (cityLower.includes("pune")) return "Pune";
  if (
    cityLower.includes("mumbai") ||
    cityLower.includes("ahmedabad") ||
    cityLower.includes("surat") ||
    cityLower.includes("jaipur") ||
    stateLower.includes("maharashtra") ||
    stateLower.includes("gujarat") ||
    stateLower.includes("goa") ||
    stateLower.includes("rajasthan")
  ) {
    return "West";
  }
  if (
    cityLower.includes("agra") ||
    cityLower.includes("delhi") ||
    cityLower.includes("noida") ||
    cityLower.includes("gurugram") ||
    cityLower.includes("gurgaon") ||
    cityLower.includes("chandigarh") ||
    stateLower.includes("delhi") ||
    stateLower.includes("haryana") ||
    stateLower.includes("punjab") ||
    stateLower.includes("uttar pradesh") ||
    stateLower.includes("uttarakhand")
  ) {
    return "North";
  }
  return "Platform";
}

const cityState = globalThis.__ANAROCK_CRM_CITY_DIRECTORY || {
  map: null,
  expiresAt: 0,
  promise: null,
};
globalThis.__ANAROCK_CRM_CITY_DIRECTORY = cityState;

function tokenExpired() {
  const error = new Error("Zoho access token expired.");
  error.code = "ZOHO_ACCESS_TOKEN_EXPIRED";
  return error;
}

async function loadCityDirectory(tokenInfo) {
  const cityMap = new Map();

  for (let page = 1; page <= CITY_MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      fields: "id,Name",
      per_page: String(CITY_PAGE_SIZE),
      page: String(page),
    });

    const response = await fetch(
      `${tokenInfo.apiDomain}/crm/v8/City?${params.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Zoho-oauthtoken ${tokenInfo.accessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );

    if (response.status === 401) throw tokenExpired();
    if (!response.ok) break;

    const data = await response.json().catch(() => ({}));
    const records = Array.isArray(data?.data) ? data.data : [];

    for (const record of records) {
      const name = normalizeCityName(record?.Name);
      if (record?.id && name) cityMap.set(name.toLowerCase(), String(record.id));
    }

    if (records.length < CITY_PAGE_SIZE) break;
  }

  return cityMap;
}

// CRM record ID of a City, from a list of all cities kept for 15 minutes.
// Throws ZOHO_ACCESS_TOKEN_EXPIRED so the caller can refresh and retry.
export async function findCityId(tokenInfo, cityName) {
  const cleanCity = normalizeCityName(cityName);
  if (!cleanCity || !isValidCityName(cleanCity)) return null;

  if (!cityState.map || cityState.expiresAt <= Date.now()) {
    if (!cityState.promise) {
      cityState.promise = loadCityDirectory(tokenInfo)
        .then((map) => {
          cityState.map = map;
          // An empty list (CRM not reachable) is retried after a minute.
          cityState.expiresAt = Date.now() + (map.size ? CITY_CACHE_TTL_MS : 60_000);
          return map;
        })
        .finally(() => {
          cityState.promise = null;
        });
    }
    await cityState.promise;
  }

  return cityState.map?.get(cleanCity.toLowerCase()) || null;
}
