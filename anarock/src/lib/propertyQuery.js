// Filtering, sorting and paging of the property list. Used by
// /api/properties and by the /properties page when it renders on the server.
import { getPropertyCandidates } from "@/lib/propertiesCache";
import { toPublicProperties } from "@/lib/propertyMapper";

export const MAX_PAGE_SIZE = 50;
export const MAX_TARGET_IDS = 10;

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeMatch(value) {
  return normalize(value).replace(/[^a-z0-9]/g, "");
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = String(value)
    .replace(/[,₹$€£\s]/g, "")
    .trim();
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function firstValue(property, keys) {
  for (const key of keys) {
    const value = property?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return null;
}

function propertyId(property) {
  return String(property?.id ?? "").trim();
}

function propertyType(property) {
  return normalizeMatch(firstValue(property, ["officeType"]));
}

function propertyMicromarket(property) {
  return normalize(firstValue(property, ["micromarket"]))
    .replace(/[_-]+/g, " ")
    .replace(/[^\w\s/]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function propertyName(property) {
  return String(firstValue(property, ["name"]) || "").trim();
}
function propertyPrice(property) {
  const type = propertyType(property);
  const managedOffice =
    type.includes("managedoffice") || type.includes("coworking");
  const keys = managedOffice ? ["monthlyCostPerSeat"] : ["quotedRent"];
  return parseNumber(firstValue(property, keys));
}

function propertyArea(property) {
  return parseNumber(firstValue(property, ["totalLeasableAreaAvailable"]));
}
function propertySeats(property) {
  return parseNumber(firstValue(property, ["NoOfSeatsOffered"]));
}

export function parsePositiveInteger(value, fallback, maximum = Infinity) {
  const parsed = Number(value);
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === "" ||
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), maximum);
}

function sortProperties(properties, sort) {
  const allowedSorts = new Set([
    "budget_asc",
    "budget_desc",
    "area_asc",
    "area_desc",
    "seats_asc",
    "seats_desc",
    "name_asc",
    "name_desc",
  ]);

  if (!allowedSorts.has(sort)) {
    return properties;
  }

  const descending = sort.endsWith("_desc");
  const isNameSort = sort.startsWith("name_");
  function sortValue(property) {
    if (isNameSort) return propertyName(property);
    if (sort.startsWith("budget_")) {
      return propertyPrice(property);
    }
    if (sort.startsWith("area_")) {
      return propertyArea(property);
    }
    return propertySeats(property);
  }

  return [...properties].sort((a, b) => {
    const aValue = sortValue(a);
    const bValue = sortValue(b);
    if (!isNameSort) {
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
    }
    let comparison;
    if (isNameSort) {
      comparison = String(aValue).localeCompare(String(bValue), undefined, {
        sensitivity: "base",
        numeric: true,
      });
    } else {
      comparison = aValue - bValue;
    }

    if (comparison !== 0) {
      return descending ? -comparison : comparison;
    }

    return propertyId(a).localeCompare(propertyId(b), undefined, {
      numeric: true,
    });
  });
}

function matchesMicromarkets(property, selectedMarkets) {
  if (!selectedMarkets.length) return true;
  const market = propertyMicromarket(property);
  if (!market) return false;
  return selectedMarkets.some(
    (selected) => market === selected || market.includes(selected),
  );
}


function applyRange(list, rawValue, valueOf, isMaximum) {
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    return list;
  }
  const limit = parseNumber(rawValue);
  if (limit === null || limit < 0) return list;

  return list.filter((property) => {
    const value = valueOf(property);
    return value !== null && (isMaximum ? value <= limit : value >= limit);
  });
}

// Returns { data, total, page, pageSize, totalPages, hasMore } with public
// fields only. Without `paginate` every match is returned on one page.
export async function queryProperties({
  city = "",
  type = "",
  micromarket = "",
  minBudget = "",
  maxBudget = "",
  area = "",
  maxArea = "",
  seats = "",
  maxSeats = "",
  sort = "",
  page = 1,
  pageSize = 30,
  paginate = true,
} = {}) {
  const indexedType = type && normalize(type) !== "ai" ? type : "";
  const selectedMarkets = [
    ...new Set(
      String(micromarket || "")
        .split(",")
        .map((value) =>
          value
            .toLowerCase()
            .replace(/[_-]+/g, " ")
            .replace(/[^\w\s/]/g, "")
            .replace(/\s+/g, " ")
            .trim(),
        )
        .filter(Boolean),
    ),
  ];

  let filtered = await getPropertyCandidates({
    city,
    type: indexedType,
    micromarkets: [],
  });

  if (selectedMarkets.length) {
    filtered = filtered.filter((property) =>
      matchesMicromarkets(property, selectedMarkets),
    );
  }

  filtered = applyRange(filtered, minBudget, propertyPrice, false);
  filtered = applyRange(filtered, maxBudget, propertyPrice, true);
  filtered = applyRange(filtered, area, propertyArea, false);
  filtered = applyRange(filtered, maxArea, propertyArea, true);
  filtered = applyRange(filtered, seats, propertySeats, false);
  filtered = applyRange(filtered, maxSeats, propertySeats, true);
  filtered = sortProperties(filtered, sort);

  const total = filtered.length;
  if (!paginate) {
    return {
      data: toPublicProperties(filtered),
      total,
      page: 1,
      pageSize: total,
      totalPages: total ? 1 : 0,
      hasMore: false,
    };
  }

  const totalPages = Math.ceil(total / pageSize);
  return {
    data: toPublicProperties(filtered.slice((page - 1) * pageSize, page * pageSize)),
    total,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages,
  };
}
