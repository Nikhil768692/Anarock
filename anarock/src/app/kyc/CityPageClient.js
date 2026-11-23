"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/common/Breadcrumbs";
import PropertyCard from "@/components/properties/PropertyCard";
import { usePreferences } from "@/lib/preferences";
import { convertArea, convertCurrency } from "@/lib/format";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  GitCompare,
  Loader2,
  Search,
  X,
} from "lucide-react";

const COMPARE_STORAGE_KEY = "anarock_compare_properties";
const MAX_COMPARE_PROPERTIES = 3;
const MIN_COMPARE_PROPERTIES = 2;
const PROPERTIES_TO_SHOW = 9;
const MICROMARKETS_TO_SHOW = 6;

const DARK = "#0A0A0A";
const PURPLE = "#7B2F77";

/* ------------------------------------------------------------------ */
/* Static copy                                                        */
/* ------------------------------------------------------------------ */

const HERO_TITLE = "Find your next office in India’s office capital";

const ADVISOR_BLURB =
  "Get an off-market shortlist and rental benchmarks for your requirement, at no cost to occupiers.";

const ADVISOR_CALLBACK_HOURS = 24;

const FORM_BENEFITS = [
  "Off-market and pre-lease options",
  "Rental benchmarks from Anarock Research",
  "Negotiation and term-sheet support",
];

// Size ranges are stored in sq ft and shown in the user's selected unit.
const SIZE_RANGES_SQFT = [
  [null, 5000],
  [5000, 20000],
  [20000, 50000],
  [50000, 100000],
  [100000, null],
];

const CURRENCY_SYMBOLS = {
  INR: "₹",
  AED: "د.إ ",
  USD: "$",
  EUR: "€",
  SGD: "S$",
  GBP: "£",
};

const TIMELINE_OPTIONS = [
  "Immediately",
  "Within 3 months",
  "3 – 6 months",
  "6 – 12 months",
  "More than 12 months",
];

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function getPropertyId(property) {
  return String(property?.id || "").trim();
}

function toUrlValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[\/\\]+/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatNumber(value, maximumFractionDigits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString("en-IN", { maximumFractionDigits });
}

function getUnitLabel(unit) {
  return unit === "sqm" ? "sq m" : "sq ft";
}

function formatAreaValue(areaSqft, unit) {
  const value = Math.round(convertArea(areaSqft, "sqft", unit));
  return value.toLocaleString(unit === "sqm" ? "en-US" : "en-IN");
}

function getSizeOptions(unit) {
  const label = getUnitLabel(unit);

  return SIZE_RANGES_SQFT.map(([min, max]) => {
    if (min === null) return `Up to ${formatAreaValue(max, unit)} ${label}`;
    if (max === null) return `${formatAreaValue(min, unit)}+ ${label}`;
    return `${formatAreaValue(min, unit)} – ${formatAreaValue(max, unit)} ${label}`;
  });
}

// Rent is stored in INR per sq ft per month.
function formatRent(rentInrPerSqft, currency, unit, exchangeRates) {
  if (!Number.isFinite(rentInrPerSqft)) return "—";

  const perUnit =
    unit === "sqm" ? rentInrPerSqft / convertArea(1, "sqft", "sqm") : rentInrPerSqft;
  const converted = convertCurrency(perUnit, "INR", currency, exchangeRates);
  const code = String(currency || "INR").toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
  const digits = code === "INR" ? 1 : 2;

  return `${symbol}${converted.toLocaleString(code === "INR" ? "en-IN" : "en-US", {
    maximumFractionDigits: digits,
  })}`;
}

// Micro-market rent band, stored in INR per sq ft per month.
function formatRentBand(min, max, currency, unit, exchangeRates) {
  const values = [min, max].filter((value) => Number.isFinite(value));
  if (values.length === 0) return "";

  const unitLabel = getUnitLabel(unit);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const lowText = formatRent(low, currency, unit, exchangeRates);

  if (low === high) return `${lowText} /${unitLabel}`;

  const highText = formatRent(high, currency, unit, exchangeRates).replace(
    /^[^\d]+/,
    "",
  );
  return `${lowText}–${highText} /${unitLabel}`;
}

function normalizeMicromarket(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Absorption and supply are stored in million sq ft.
function formatMillionArea(valueMnSqft, unit) {
  if (!Number.isFinite(valueMnSqft)) return "—";
  return `${formatNumber(convertArea(valueMnSqft, "sqft", unit), unit === "sqm" ? 2 : 1)} mn`;
}

function getQuarterPrefix(quarterLabel) {
  const match = String(quarterLabel || "").match(/Q[1-4]/i);
  return match ? match[0].toUpperCase() : "";
}

function getStoredUserLocation() {
  try {
    const saved = sessionStorage.getItem("anarock_user_location");
    return saved ? JSON.parse(saved) || {} : {};
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function CityPageClient({ city }) {
  const router = useRouter();
  const { currency, unit, exchangeRates } = usePreferences();
  const [compareSelection, setCompareSelection] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertyError, setPropertyError] = useState("");
  const [cityData, setCityData] = useState({
    heroTitle: "",
    heroDescription: "",
    advisor: null,
    market: null,
    micromarkets: [],
  });
  const [loadingCityData, setLoadingCityData] = useState(true);

  const citySlug = toUrlValue(city);
  const allPropertiesUrl = `/properties?city=${encodeURIComponent(citySlug)}`;

  useEffect(() => {
    let cancelled = false;

    async function loadProperties() {
      try {
        setLoadingProperties(true);
        setPropertyError("");
        const response = await fetch(
          `/api/properties?city=${encodeURIComponent(city)}`,
          { method: "GET", cache: "no-store" },
        );
        const json = await response.json();
        if (cancelled) return;
        if (!response.ok || !json?.success) {
          throw new Error(json?.error || "Unable to load properties.");
        }
        setAllProperties(Array.isArray(json?.data) ? json.data : []);
      } catch (error) {
        if (cancelled) return;
        console.error("[CityPage] Properties error:", error);
        setPropertyError(error?.message || "Unable to load properties.");
      } finally {
        if (!cancelled) setLoadingProperties(false);
      }
    }

    loadProperties();
    return () => {
      cancelled = true;
    };
  }, [city]);

  useEffect(() => {
    let cancelled = false;

    async function loadCityData() {
      try {
        setLoadingCityData(true);
        const response = await fetch(
          `/api/city-page?city=${encodeURIComponent(city)}`,
          { method: "GET", cache: "no-store" },
        );
        const json = await response.json();
        if (cancelled) return;
        if (response.ok && json?.success) {
          setCityData({
            heroTitle: typeof json.heroTitle === "string" ? json.heroTitle.trim() : "",
            heroDescription:
              typeof json.heroDescription === "string"
                ? json.heroDescription.trim()
                : "",
            advisor: json.advisor || null,
            market: json.market || null,
            micromarkets: Array.isArray(json.micromarkets)
              ? json.micromarkets
              : [],
          });
        }
      } catch (error) {
        if (!cancelled) console.error("[CityPage] City data error:", error);
      } finally {
        if (!cancelled) setLoadingCityData(false);
      }
    }

    loadCityData();
    return () => {
      cancelled = true;
    };
  }, [city]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COMPARE_STORAGE_KEY);
      if (!saved) {
        setCompareSelection([]);
        return;
      }
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        setCompareSelection([]);
        return;
      }
      const validSelection = parsed
        .filter((item) => getPropertyId(item))
        .filter(
          (item, index, array) =>
            index ===
            array.findIndex(
              (candidate) => getPropertyId(candidate) === getPropertyId(item),
            ),
        )
        .slice(0, MAX_COMPARE_PROPERTIES);
      setCompareSelection(validSelection);
    } catch (error) {
      console.error("[CityPage] Failed to restore compare selection:", error);
      setCompareSelection([]);
    }
  }, []);

  const visibleProperties = allProperties.slice(0, PROPERTIES_TO_SHOW);

  // Micro-markets come from the CityMicromarkets table (name + rent band).
  // Property counts are worked out from this city's properties.
  // If the table has no rows for this city, the list falls back to the
  // micro-markets found on the properties.
  const micromarkets = useMemo(() => {
    const counts = new Map();

    for (const property of allProperties) {
      const name = String(property?.micromarket || "").trim();
      if (!name) continue;
      const key = normalizeMicromarket(name);
      const current = counts.get(key);
      counts.set(key, {
        name: current?.name || name,
        count: (current?.count || 0) + 1,
      });
    }

    const tableRows = cityData.micromarkets || [];

    if (tableRows.length > 0) {
      return tableRows.map((row) => {
        const match = counts.get(normalizeMicromarket(row.name));

        return {
          name: row.name,
          filterName: match?.name || row.name,
          count: match?.count || 0,
          rentMin: row.rentMin,
          rentMax: row.rentMax,
        };
      });
    }

    return [...counts.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .map((item) => ({ ...item, filterName: item.name }));
  }, [allProperties, cityData.micromarkets]);

  const handleCompareToggle = (property) => {
    const propertyId = getPropertyId(property);
    if (!propertyId) return;

    setCompareSelection((currentSelection) => {
      const exists = currentSelection.some(
        (item) => getPropertyId(item) === propertyId,
      );

      let updatedSelection;

      if (exists) {
        updatedSelection = currentSelection.filter(
          (item) => getPropertyId(item) !== propertyId,
        );
      } else {
        if (currentSelection.length >= MAX_COMPARE_PROPERTIES) {
          return currentSelection;
        }
        updatedSelection = [...currentSelection, property];
      }

      try {
        localStorage.setItem(
          COMPARE_STORAGE_KEY,
          JSON.stringify(updatedSelection),
        );
      } catch (error) {
        console.error("[CityPage] Failed to save compare selection:", error);
      }

      return updatedSelection;
    });
  };

  const clearCompareSelection = () => {
    setCompareSelection([]);
    try {
      localStorage.removeItem(COMPARE_STORAGE_KEY);
    } catch (error) {
      console.error("[CityPage] Failed to clear compare selection:", error);
    }
  };

  const openComparePage = () => {
    if (
      compareSelection.length < MIN_COMPARE_PROPERTIES ||
      compareSelection.length > MAX_COMPARE_PROPERTIES
    ) {
      return;
    }
    try {
      localStorage.setItem(
        COMPARE_STORAGE_KEY,
        JSON.stringify(compareSelection),
      );
    } catch (error) {
      console.error("[CityPage] Failed to save compare selection:", error);
      return;
    }
    router.push("/compare");
  };

  const totalProperties = allProperties.length;
  const countLabel = loadingProperties
    ? "…"
    : totalProperties.toLocaleString("en-IN");

  return (
    <main className="w-full min-w-0 bg-[#F6F6F8] text-black">
      <Breadcrumbs
        items={[
          { label: "Popular Cities", href: "/#popularCities" },
          { label: city },
        ]}
      />

      {/* HERO + ADVISOR */}
      <section className="mx-auto w-full max-w-[1280px] px-4 pb-12 pt-4 sm:px-6 sm:pb-14 lg:px-10 lg:pb-16">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
          <div className="min-w-0 pt-2 lg:pt-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A054A0] sm:text-xs">
              Commercial office space · {city}
            </p>
            <h1 className="mt-4 max-w-[640px] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-black sm:text-[42px] lg:text-[48px]">
              {loadingCityData ? (
                // Keeps the space while the heading loads, so nothing jumps.
                <span className="invisible">{HERO_TITLE}</span>
              ) : (
                cityData.heroTitle || HERO_TITLE
              )}
            </h1>
            <p className="mt-5 max-w-[560px] text-[15px] leading-7 text-black/75 sm:text-base">
              {loadingCityData ? (
                // Keeps the space while the text loads, so nothing jumps.
                <span className="invisible">
                  {countLabel} verified Grade A buildings across {city}’s key
                  micro-markets, with live rentals from Anarock Research and
                  advisors who close deals here every week.
                </span>
              ) : cityData.heroDescription ? (
                cityData.heroDescription
              ) : (
                <>
                  {countLabel} verified Grade A buildings across {city}’s key
                  micro-markets, with live rentals from Anarock Research and
                  advisors who close deals here every week.
                </>
              )}
            </p>
          </div>

          {/* Same top space as the text on the left, so both start level. */}
          <div className="min-w-0 lg:pt-6">
            <AdvisorCard
              city={city}
              advisor={cityData.advisor}
              loading={loadingCityData}
            />
          </div>
        </div>
      </section>

      {/* MARKET AT A GLANCE */}
      <MarketSection
        city={city}
        market={cityData.market}
        loading={loadingCityData}
        currency={currency}
        unit={unit}
        exchangeRates={exchangeRates}
      />

      {/* EXPLORE BY MICRO-MARKET */}
      <section className="mx-auto w-full max-w-[1280px] px-4 pt-12 sm:px-6 sm:pt-14 lg:px-10 lg:pt-16">
        <h2 className="text-[24px] font-bold tracking-[-0.01em] text-black sm:text-[28px]">
          Explore by micro-market
        </h2>
        <p className="mt-1.5 text-sm text-black/75">
          Each area has its own rent band, tenant mix and supply pipeline.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {loadingProperties || loadingCityData
            ? Array.from({ length: MICROMARKETS_TO_SHOW }).map((_, index) => (
                <div
                  key={index}
                  className="h-[118px] animate-pulse rounded-xl border border-[#E7E7EE] bg-white"
                />
              ))
            : micromarkets.map((market) => {
                const rentBand = formatRentBand(
                  market.rentMin,
                  market.rentMax,
                  currency,
                  unit,
                  exchangeRates,
                );
                const content = (
                  <>
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F4EAF2] text-[#A054A0]">
                      <Building2 className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <span className="mt-3 truncate text-sm font-bold text-black">
                      {market.name}
                    </span>
                    {rentBand && (
                      <span className="mt-1 truncate text-xs text-black/75">
                        {rentBand}
                      </span>
                    )}
                    <span
                      className={`mt-2 text-xs font-semibold ${
                        market.count > 0
                          ? "text-[#7B2F77] group-hover:underline"
                          : "text-black/40"
                      }`}
                    >
                      {market.count > 0
                        ? `${market.count} ${market.count === 1 ? "property" : "properties"} →`
                        : "No listings yet"}
                    </span>
                  </>
                );

                if (market.count === 0) {
                  return (
                    <div
                      key={market.name}
                      className="flex min-w-0 flex-col rounded-xl border border-[#E7E7EE] bg-white p-4"
                    >
                      {content}
                    </div>
                  );
                }

                return (
                  <Link
                    key={market.name}
                    href={`${allPropertiesUrl}&micromarket=${encodeURIComponent(toUrlValue(market.filterName))}`}
                    className="group flex min-w-0 flex-col rounded-xl border border-[#E7E7EE] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#A054A0]/50 hover:shadow-md"
                  >
                    {content}
                  </Link>
                );
              })}
        </div>
      </section>

      {/* OFFICE SPACES */}
      <section className="mx-auto w-full max-w-[1280px] px-4 pt-12 sm:px-6 sm:pt-14 lg:px-10 lg:pt-16">
        <h2 className="text-[24px] font-bold tracking-[-0.01em] text-black sm:text-[28px]">
          {countLabel} office spaces available
        </h2>

        <div className="mt-6">
          {loadingProperties ? (
            <PropertyGridSkeleton />
          ) : propertyError ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-white p-5 text-sm leading-6 text-red-600 shadow-sm"
            >
              <p className="font-semibold">Unable to load properties</p>
              <p className="mt-1">{propertyError}</p>
            </div>
          ) : visibleProperties.length === 0 ? (
            <EmptyProperties city={city} />
          ) : (
            <>
              <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {visibleProperties.map((property, index) => (
                  <PropertyGridItem
                    key={getPropertyId(property) || index}
                    property={property}
                    isCompared={compareSelection.some(
                      (item) => getPropertyId(item) === getPropertyId(property),
                    )}
                    onCompareToggle={() => handleCompareToggle(property)}
                  />
                ))}
              </div>

              {totalProperties > visibleProperties.length && (
                <div className="flex justify-center pt-8 sm:pt-10">
                  <Link
                    href={allPropertiesUrl}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-black/70 bg-white px-6 text-sm font-semibold text-black transition hover:border-[#7B2F77] hover:text-[#7B2F77]"
                  >
                    Show all {countLabel} properties
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* REQUIREMENT FORM */}
      <section
        id="city-requirement"
        className="mx-auto w-full max-w-[1280px] scroll-mt-28 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-14 lg:px-10 lg:pb-24 lg:pt-16"
      >
        <RequirementForm city={city} micromarkets={micromarkets} unit={unit} />
      </section>

      {/* FLOATING COMPARE BAR */}
      {compareSelection.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-[40] w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 rounded-2xl border border-[#E5E7EB] bg-white/95 p-4 shadow-[0_12px_40px_rgba(21,35,60,0.14)] backdrop-blur-xl sm:bottom-6 sm:w-[calc(100%-2rem)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F8EFF8]">
                <GitCompare
                  className="h-5 w-5 text-[#A054A0]"
                  strokeWidth={1.8}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-black">
                  {compareSelection.length}{" "}
                  {compareSelection.length === 1 ? "property" : "properties"}{" "}
                  selected
                </p>
                <p className="mt-1 text-xs leading-5 text-black/75">
                  Select 2 or 3 properties to compare.
                </p>
              </div>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                onClick={clearCompareSelection}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-black/75 transition-colors duration-200 hover:border-[#D1D5DB] hover:bg-[#F8F9FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A054A0] focus-visible:ring-offset-2 sm:flex-none"
              >
                <X size={16} />
                Clear
              </button>
              <button
                type="button"
                onClick={openComparePage}
                disabled={compareSelection.length < MIN_COMPARE_PROPERTIES}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#A054A0] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A054A0] focus-visible:ring-offset-2 sm:flex-none sm:px-5"
              >
                <GitCompare size={16} />
                Compare ({compareSelection.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                           */
/* ------------------------------------------------------------------ */

function AdvisorCard({ city, advisor, loading }) {
  // When the photo link does not give an image, show the initials instead
  // of a broken image.
  const photoUrl = advisor?.photoUrl || "";
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => {
    setPhotoFailed(false);
  }, [photoUrl]);

  if (loading) {
    return (
      <div className="w-full animate-pulse rounded-2xl border border-[#E7E7EE] bg-white p-6 shadow-sm">
        <div className="h-3 w-40 rounded bg-[#EEE7EE]" />
        <div className="mt-5 flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-[#EFE3ED]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-[#EEF0F4]" />
            <div className="h-3 w-full rounded bg-[#EEF0F4]" />
          </div>
        </div>
        <div className="mt-5 h-12 rounded bg-[#EEF0F4]" />
      </div>
    );
  }

  if (!advisor) return null;

  // For example "Senior Property Advisor with 8 yrs of experience".
  const experience = Number.isFinite(advisor.experienceYears)
    ? `${advisor.experienceYears} ${advisor.experienceYears === 1 ? "yr" : "yrs"} of experience`
    : "";
  const subtitle = advisor.designation
    ? [advisor.designation, experience].filter(Boolean).join(" with ")
    : experience;

  return (
    <aside className="w-full rounded-2xl border border-[#E7E7EE] bg-white p-6 shadow-[0_6px_24px_rgba(28,35,64,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7B2F77]">
        Your {city} advisor
      </p>

      <div className="mt-4 flex items-center gap-3">
        {photoUrl && !photoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={advisor.name}
            onError={() => setPhotoFailed(true)}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EFE3ED] text-base font-bold text-[#7B2F77]">
            {getInitials(advisor.name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-black">
            {advisor.name}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs leading-5 text-black/75">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-black/75">{ADVISOR_BLURB}</p>
    </aside>
  );
}

// Font size that keeps one line of text inside its card: the normal size,
// or smaller when the text is long for the card's width (cqw = card width).
// charWidth is the average letter width in em for that font weight.
function fitOneLine(text, maxSize, charWidth) {
  const length = Math.max(String(text ?? "").length, 1);
  return {
    fontSize: `min(${maxSize}, calc(100cqw / ${(length * charWidth).toFixed(2)}))`,
  };
}

function MarketSection({
  city,
  market,
  loading,
  currency,
  unit,
  exchangeRates,
}) {
  const unitLabel = getUnitLabel(unit);
  const quarter = market?.quarterLabel || "";
  const quarterPrefix = getQuarterPrefix(quarter);
  const change = market?.vacancyChangePts;
  const hasChange = Number.isFinite(change);

  const stats = [
    {
      label: "Average rental",
      value:
        Number.isFinite(market?.rentMin) || Number.isFinite(market?.rentMax)
          ? formatRentBand(market?.rentMin, market?.rentMax, currency, unit, exchangeRates).replace(/\s*\/.*$/, "")
          : formatRent(market?.averageRent, currency, unit, exchangeRates),
      note: `per ${unitLabel} / month`,
    },
    {
      label: "Vacancy",
      value: Number.isFinite(market?.vacancyPercent)
        ? `${formatNumber(market.vacancyPercent)}%`
        : "—",
      note: hasChange
        ? `${formatNumber(change)} pts vs last quarter`
        : "",
    },
    {
      label: `${quarterPrefix ? `${quarterPrefix} ` : ""}absorption`,
      value: formatMillionArea(market?.absorptionMnSqft, unit),
      note: `${unitLabel} leased`,
    },
    {
      label: "New supply",
      value: formatMillionArea(market?.newSupplyMnSqft, unit),
      note: `${unitLabel} completing`,
    },
    {
      label: "Most active micro-market",
      value: market?.mostActiveMicromarket || "—",
      note: quarterPrefix ? `by ${quarterPrefix} leasing` : "",
    },
  ];

  return (
    <section className="w-full bg-white text-black">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7B2F77] sm:text-xs">
          {city} office market{quarter ? ` · ${quarter}` : ""}
        </p>
        <h2 className="mt-2 text-[22px] font-bold sm:text-[26px]">
          The market at a glance
        </h2>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{ containerType: "inline-size" }}
              className="min-w-0 rounded-xl border border-[#E7E7EE] bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)] sm:p-5"
            >
              <p
                title={stat.label}
                style={fitOneLine(stat.label, "0.75rem", 0.56)}
                className="truncate whitespace-nowrap text-black/75"
              >
                {stat.label}
              </p>
              {loading ? (
                <div className="mt-2 h-8 w-20 animate-pulse rounded bg-black/10" />
              ) : (
                <p
                  title={typeof stat.value === "string" ? stat.value : undefined}
                  style={fitOneLine(stat.value, "var(--stat-value-size)", 0.64)}
                  className="mt-1.5 truncate whitespace-nowrap font-bold leading-tight [--stat-value-size:24px] sm:[--stat-value-size:28px]"
                >
                  {stat.value}
                </p>
              )}
              {stat.note && (
                <p
                  title={typeof stat.note === "string" ? stat.note : undefined}
                  style={fitOneLine(stat.note, "11px", 0.56)}
                  className="mt-1 truncate whitespace-nowrap leading-4 text-black/75"
                >
                  {stat.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PropertyGridItem({ property, isCompared, onCompareToggle }) {
  return (
    <div className="min-w-0">
      <PropertyCard
        property={property}
        isCompared={isCompared}
        onCompareToggle={onCompareToggle}
      />
    </div>
  );
}

// Same country list as the home page requirement form.
const PHONE_COUNTRIES = [
  { name: "India", code: "IN", dial: "+91", flag: "🇮🇳", min: 10, max: 10 },
  { name: "United States", code: "US", dial: "+1", flag: "🇺🇸", min: 10, max: 10 },
  { name: "Canada", code: "CA", dial: "+1", flag: "🇨🇦", min: 10, max: 10 },
  { name: "United Kingdom", code: "GB", dial: "+44", flag: "🇬🇧", min: 10, max: 10 },
  { name: "United Arab Emirates", code: "AE", dial: "+971", flag: "🇦🇪", min: 9, max: 9 },
  { name: "Australia", code: "AU", dial: "+61", flag: "🇦🇺", min: 9, max: 9 },
  { name: "Singapore", code: "SG", dial: "+65", flag: "🇸🇬", min: 8, max: 8 },
  { name: "Germany", code: "DE", dial: "+49", flag: "🇩🇪", min: 10, max: 11 },
  { name: "France", code: "FR", dial: "+33", flag: "🇫🇷", min: 9, max: 9 },
  { name: "Italy", code: "IT", dial: "+39", flag: "🇮🇹", min: 9, max: 10 },
  { name: "Spain", code: "ES", dial: "+34", flag: "🇪🇸", min: 9, max: 9 },
  { name: "Netherlands", code: "NL", dial: "+31", flag: "🇳🇱", min: 9, max: 9 },
  { name: "Switzerland", code: "CH", dial: "+41", flag: "🇨🇭", min: 9, max: 9 },
  { name: "Ireland", code: "IE", dial: "+353", flag: "🇮🇪", min: 9, max: 9 },
  { name: "New Zealand", code: "NZ", dial: "+64", flag: "🇳🇿", min: 8, max: 10 },
  { name: "Japan", code: "JP", dial: "+81", flag: "🇯🇵", min: 10, max: 10 },
  { name: "South Korea", code: "KR", dial: "+82", flag: "🇰🇷", min: 9, max: 10 },
  { name: "China", code: "CN", dial: "+86", flag: "🇨🇳", min: 11, max: 11 },
  { name: "Hong Kong", code: "HK", dial: "+852", flag: "🇭🇰", min: 8, max: 8 },
  { name: "Malaysia", code: "MY", dial: "+60", flag: "🇲🇾", min: 9, max: 10 },
  { name: "Thailand", code: "TH", dial: "+66", flag: "🇹🇭", min: 9, max: 9 },
  { name: "Israel", code: "IL", dial: "+972", flag: "🇮🇱", min: 9, max: 9 },
  { name: "Indonesia", code: "ID", dial: "+62", flag: "🇮🇩", min: 9, max: 12 },
  { name: "Philippines", code: "PH", dial: "+63", flag: "🇵🇭", min: 10, max: 10 },
  { name: "Vietnam", code: "VN", dial: "+84", flag: "🇻🇳", min: 9, max: 10 },
  { name: "South Africa", code: "ZA", dial: "+27", flag: "🇿🇦", min: 9, max: 9 },
  { name: "Saudi Arabia", code: "SA", dial: "+966", flag: "🇸🇦", min: 9, max: 9 },
  { name: "Qatar", code: "QA", dial: "+974", flag: "🇶🇦", min: 8, max: 8 },
  { name: "Kuwait", code: "KW", dial: "+965", flag: "🇰🇼", min: 8, max: 8 },
  { name: "Oman", code: "OM", dial: "+968", flag: "🇴🇲", min: 8, max: 8 },
  { name: "Bahrain", code: "BH", dial: "+973", flag: "🇧🇭", min: 8, max: 8 },
  { name: "Pakistan", code: "PK", dial: "+92", flag: "🇵🇰", min: 10, max: 10 },
  { name: "Bangladesh", code: "BD", dial: "+880", flag: "🇧🇩", min: 10, max: 10 },
  { name: "Nepal", code: "NP", dial: "+977", flag: "🇳🇵", min: 10, max: 10 },
  { name: "Sri Lanka", code: "LK", dial: "+94", flag: "🇱🇰", min: 9, max: 9 },
  { name: "Russia", code: "RU", dial: "+7", flag: "🇷🇺", min: 10, max: 10 },
  { name: "Brazil", code: "BR", dial: "+55", flag: "🇧🇷", min: 10, max: 11 },
  { name: "Mexico", code: "MX", dial: "+52", flag: "🇲🇽", min: 10, max: 10 },
  { name: "Argentina", code: "AR", dial: "+54", flag: "🇦🇷", min: 10, max: 11 },
  { name: "Turkey", code: "TR", dial: "+90", flag: "🇹🇷", min: 10, max: 10 },
];

const EMPTY_FORM = {
  name: "",
  company: "",
  email: "",
  size: "",
  micromarket: "",
  timeline: "",
  phone: "",
};

function RequirementForm({ city, micromarkets, unit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [phoneCountry, setPhoneCountry] = useState(PHONE_COUNTRIES[0]);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryPickerRef = useRef(null);
  const sizeOptions = getSizeOptions(unit);

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter((country) =>
      `${country.name} ${country.code} ${country.dial}`
        .toLowerCase()
        .includes(query),
    );
  }, [countrySearch]);

  // Close the country list on an outside click or the Escape key.
  useEffect(() => {
    if (!countryOpen) return undefined;
    const handlePointer = (event) => {
      if (!countryPickerRef.current?.contains(event.target)) {
        setCountryOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setCountryOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [countryOpen]);

  // Reset the chosen size when the unit changes, since the labels change.
  useEffect(() => {
    setForm((previous) => ({ ...previous, size: "" }));
  }, [unit]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
    setStatus({ type: "", message: "" });
  };

  const validate = () => {
    const nextErrors = {};
    const phoneDigits = form.phone.replace(/\D/g, "");

    if (!form.name.trim()) nextErrors.name = "Please enter your name.";
    if (!phoneDigits) {
      nextErrors.phone = "Phone number is required.";
    } else if (phoneCountry.code === "IN") {
      if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
        nextErrors.phone = "Enter a valid 10-digit mobile number.";
      }
    } else if (
      phoneDigits.length < phoneCountry.min ||
      phoneDigits.length > phoneCountry.max
    ) {
      nextErrors.phone = `Enter a valid ${phoneCountry.name} phone number.`;
    }
    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())
    ) {
      nextErrors.email = "Enter a valid email address.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !validate()) return;

    setSubmitting(true);
    setStatus({ type: "", message: "" });

    const location = getStoredUserLocation();
    const details = [
      // Re-enable these lines together with the hidden form fields.
      // `Size required: ${form.size || "Not specified"}`,
      // `Preferred micro-market: ${form.micromarket || "Any"}`,
      // `Move-in timeline: ${form.timeline || "Not specified"}`,
      `Submitted from: ${city} city page`,
    ].join("\n");

    try {
      const response = await fetch("/api/lead2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          company: form.company.trim(),
          email: form.email.trim(),
          fullPhone: `${phoneCountry.dial}${form.phone.replace(/\D/g, "")}`,
          requirementCity: city,
          requirementDetails: details,
          Street: location.area || "",
          City: location.city || "",
          Province: location.state || "",
          Postal_Code: location.pincode || "",
          Country: location.country || "",
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result?.success) {
        setStatus({
          type: "success",
          message: `Thank you. A ${city} advisor will get in touch with you shortly.`,
        });
        setForm(EMPTY_FORM);
      } else {
        setStatus({
          type: "error",
          message:
            result?.message ||
            "We couldn't submit your requirement right now. Please try again.",
        });
      }
    } catch (error) {
      console.error("[CityPage] Requirement submission failed:", error);
      setStatus({
        type: "error",
        message:
          "We couldn't submit your requirement right now. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 rounded-2xl border border-[#E7E7EE] bg-white p-6 shadow-[0_6px_24px_rgba(28,35,64,0.05)] sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7B2F77]">
          Can’t find the right fit?
        </p>
        <h2 className="mt-3 text-[24px] font-bold leading-tight text-black sm:text-[28px]">
          Tell us what you need. We’ll bring you the shortlist.
        </h2>
        <p className="mt-3 text-sm leading-6 text-black/75">
          Share your requirement once. A {city} advisor calls you within{" "}
          {ADVISOR_CALLBACK_HOURS} hours with options, including spaces not
          listed online.
        </p>
        <ul className="mt-5 space-y-2.5">
          {FORM_BENEFITS.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2.5 text-sm text-black/75"
            >
              <Check
                className="h-4 w-4 shrink-0 text-[#7B2F77]"
                strokeWidth={2.2}
              />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleSubmit} noValidate className="min-w-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Full name" required error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Your name"
              autoComplete="name"
              className={inputClass(errors.name)}
            />
          </FormField>

          <FormField
            as="div"
            label="Phone"
            required
            error={errors.phone}
          >
            <div ref={countryPickerRef} className="relative">
            <div
              className={`flex h-11 overflow-hidden rounded-lg border bg-white transition focus-within:border-[#7B2F77] focus-within:ring-2 focus-within:ring-[#7B2F77]/15 ${
                errors.phone ? "border-red-400" : "border-[#D9DAE3]"
              }`}
            >
              <button
                type="button"
                onClick={() => setCountryOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={countryOpen}
                aria-label={`Country code ${phoneCountry.name} ${phoneCountry.dial}`}
                className="flex shrink-0 items-center gap-1 border-r border-[#E7E7EE] bg-[#F6F6F8] px-3 text-sm font-medium text-black/75 transition hover:bg-[#EFEFF3]"
              >
                <span className="text-xs font-semibold text-black/60">
                  {phoneCountry.code}
                </span>
                {phoneCountry.dial}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${countryOpen ? "rotate-180 text-[#7B2F77]" : ""}`}
                />
              </button>
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(event) =>
                  updateField(
                    "phone",
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, phoneCountry.max),
                  )
                }
                placeholder="Mobile number"
                aria-label="Phone number"
                autoComplete="tel-national"
                className="min-w-0 flex-1 px-3 text-sm text-black outline-none placeholder:text-black/40"
              />
            </div>

            {countryOpen && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[300px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#E7E7EE] bg-white shadow-xl">
                <div className="border-b border-[#E7E7EE] p-2.5">
                  <div className="flex items-center gap-2 rounded-lg border border-[#D9DAE3] px-3">
                    <Search className="h-3.5 w-3.5 shrink-0 text-black/40" />
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(event) => setCountrySearch(event.target.value)}
                      placeholder="Search country or code..."
                      autoFocus
                      className="h-9 min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-black/40"
                    />
                  </div>
                </div>
                <div role="listbox" className="max-h-[240px] overflow-y-auto overscroll-contain p-1.5">
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map((country) => {
                      const selected =
                        country.code === phoneCountry.code &&
                        country.dial === phoneCountry.dial;
                      return (
                        <button
                          key={`${country.code}-${country.dial}`}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            setPhoneCountry(country);
                            setCountryOpen(false);
                            setCountrySearch("");
                            updateField(
                              "phone",
                              form.phone.replace(/\D/g, "").slice(0, country.max),
                            );
                          }}
                          className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                            selected
                              ? "bg-[#7B2F77] font-semibold text-white"
                              : "text-black hover:bg-[#7B2F77]/10 hover:text-[#7B2F77]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className="w-6 shrink-0 text-xs font-semibold opacity-70">
                              {country.code}
                            </span>
                            <span className="truncate">{country.name}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2 text-xs">
                            {country.dial}
                            {selected && <Check className="h-3.5 w-3.5" />}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-6 text-center text-sm text-black/60">
                      No country found
                    </p>
                  )}
                </div>
              </div>
            )}
            </div>
          </FormField>
          <FormField label="Company">
            <input
              type="text"
              value={form.company}
              onChange={(event) => updateField("company", event.target.value)}
              placeholder="Company name"
              autoComplete="organization"
              className={inputClass()}
            />
          </FormField>

          <FormField label="Work email" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              className={inputClass(errors.email)}
            />
          </FormField>

          {/*
            Hidden for now. Uncomment to show these fields again.

            <FormField label="Size required">
              <select
                value={form.size}
                onChange={(event) => updateField("size", event.target.value)}
                className={inputClass()}
              >
                <option value="">Select range</option>
                {sizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Preferred micro-market">
              <select
                value={form.micromarket}
                onChange={(event) =>
                  updateField("micromarket", event.target.value)
                }
                className={inputClass()}
              >
                <option value="">Any</option>
                {micromarkets.map((market) => (
                  <option key={market.name} value={market.name}>
                    {market.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Move-in timeline">
              <select
                value={form.timeline}
                onChange={(event) => updateField("timeline", event.target.value)}
                className={inputClass()}
              >
                <option value="">Select</option>
                {TIMELINE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FormField>
          */}
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{ backgroundColor: PURPLE }}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Submitting…" : "Get my shortlist"}
        </button>

        {status.message && (
          <p
            role="status"
            className={`mt-3 text-sm ${
              status.type === "success" ? "text-[#1F7A4D]" : "text-red-600"
            }`}
          >
            {status.message}
          </p>
        )}
      </form>
    </div>
  );
}

function inputClass(error) {
  return `h-11 w-full rounded-lg border bg-white px-3 text-sm text-black outline-none transition placeholder:text-black/40 focus:border-[#7B2F77] focus:ring-2 focus:ring-[#7B2F77]/15 ${
    error ? "border-red-400" : "border-[#D9DAE3]"
  }`;
}

function FormField({
  label,
  required = false,
  error,
  className = "",
  // "div" for fields that contain buttons (a <label> would pass every click
  // on to its first button and close the country list right away).
  as: Wrapper = "label",
  children,
}) {
  return (
    <Wrapper className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-black">
        {label}
        {required && <span className="ml-0.5 text-[#A054A0]">*</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      )}
    </Wrapper>
  );
}

function EmptyProperties({ city }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white px-5 py-12 text-center shadow-[0_4px_18px_rgba(21,35,60,0.035)] sm:px-8 sm:py-14">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8EFF8]">
        <Building2 size={25} strokeWidth={1.7} className="text-[#A054A0]" />
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight text-black">
        No properties found
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/75">
        There are currently no properties available in {city}. Please check
        back later for new listings.
      </p>
    </div>
  );
}

function PropertyGridSkeleton() {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="min-w-0 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm"
        >
          <div className="aspect-[3/2] animate-pulse bg-[#EEF0F4]" />
          <div className="space-y-4 p-4 sm:p-5">
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-[#EEF0F4]" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-[#EEF0F4]" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-[#F3EAF3]" />
          </div>
        </div>
      ))}
    </div>
  );
}