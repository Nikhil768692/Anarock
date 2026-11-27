// Constants, small helpers and small components used by the properties list
// page (PropertiesClient). Kept apart so the page component stays readable.
import { useEffect, useRef, useState } from "react";

export const MAX_COMPARE_PROPERTIES = 3;
export const MIN_COMPARE_PROPERTIES = 2;
export const COMPARE_STORAGE_KEY = "anarock_compare_properties";
export const IMAGE_BASE_URL = "https://property-images.zohostratus.in";
export const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "bmp",
  "tif",
  "tiff",
  "svg",
];
export const IMAGE_FILES = [
  {
    key: "project",
    name: "Project Picture 1",
    filename: "Project_Picture_1.jpg",
  },
  {
    key: "property-1",
    name: "Property Photo 1",
    filename: "Property_Photo_1.jpg",
  },
];

export const OFFICE_TYPES = ["Conventional", "Managed Office/Co-working"];
export const SORT_CATEGORIES = [
  { id: "recommended", label: "Recommended", value: "" },
  {
    id: "budget",
    label: "Budget",
    ascVal: "budget_asc",
    descVal: "budget_desc",
  },
  {
    id: "seats",
    label: "Seat Count",
    ascVal: "seats_asc",
    descVal: "seats_desc",
  },
  { id: "area", label: "Area", ascVal: "area_asc", descVal: "area_desc" },
  {
    id: "name",
    label: "Alphabetically",
    ascVal: "name_asc",
    descVal: "name_desc",
  },
];

export function PropertyCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-800/25 bg-white p-3.5 shadow-sm">
      <div className="shimmer-effect relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100" />
      <div className="flex flex-1 flex-col px-1.5 pb-1 pt-3.5">
        <div className="shimmer-effect h-3 w-1/3 rounded bg-slate-100" />
        <div className="shimmer-effect mt-2.5 h-5 w-4/5 rounded bg-slate-100" />
        <div className="shimmer-effect mt-2 h-3.5 w-1/2 rounded bg-slate-100" />
        <div className="my-4 h-px bg-slate-100" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="shimmer-effect h-2.5 w-12 rounded bg-slate-100" />
            <div className="shimmer-effect mt-1.5 h-4 w-20 rounded bg-slate-100" />
          </div>
          <div className="border-l border-slate-100 pl-3">
            <div className="shimmer-effect h-2.5 w-12 rounded bg-slate-100" />
            <div className="shimmer-effect mt-1.5 h-4 w-20 rounded bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export const toUrlValue = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[\/\\]+/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const normalizeValue = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

export const getOfficeTypeFromUrl = (value) => {
  if (!value) return "";
  const normalized = normalizeValue(value);
  const match = OFFICE_TYPES.find(
    (type) =>
      normalizeValue(type) === normalized ||
      toUrlValue(type) === String(value).toLowerCase(),
  );
  return match || value;
};

export const getPropertyId = (property) =>
  String(property?.id || "");

export function getPropertySlug(property) {
  if (!property || typeof property !== "object") return "";
  const rawSlug = property?.slug ?? "";
  return String(rawSlug)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getPropertyImageUrl(property) {
  if (!property || typeof property !== "object") return "";
  if (property.image) return property.image;
  if (property.coverImage) return property.coverImage;
  if (Array.isArray(property.images) && property.images.length > 0) {
    return property.images[0];
  }
  const imageFolderPath = String(property.ImageFolderPath || "").replace(/^\/+|\/+$/g, "");
  if (!imageFolderPath) return "";
  const projectImage = IMAGE_FILES.find((img) => img.key === "project");
  const filename = projectImage
    ? projectImage.filename
    : "Project_Picture_1.jpg";
  return `${IMAGE_BASE_URL}/${imageFolderPath}/${filename}`;
}

export function readLocalStorageValue(keys) {
  if (typeof window === "undefined") return "";
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw || !raw.trim()) continue;
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "string" || typeof parsed === "number") {
          return String(parsed).trim();
        }
        if (parsed && typeof parsed === "object") {
          const value =
            parsed.city ||
            parsed.City ||
            parsed.name ||
            parsed.Name ||
            parsed.value;
          if (value) return String(value).trim();
        }
      } catch {
        return raw.trim();
      }
      return raw.trim();
    } catch (error) {
      console.error("Unable to read storage key:", key, error);
    }
  }
  return "";
}

export function getLastSearchedCityFromStorage() {
  return readLocalStorageValue([
    "anarock_last_searched_city",
    "lastSearchedCity",
    "last_searched_city",
    "requirementCity",
    "requirement_city",
    "selectedCity",
    "selected_city",
    "propertyCity",
    "property_city",
    "searchCity",
    "search_city",
  ]);
}

export function getRequirementTypeFromStorage() {
  return readLocalStorageValue([
    "anarock_requirement_type",
    "requirementType",
    "requirement_type",
    "propertyType",
    "property_type",
    "selectedPropertyType",
    "selected_property_type",
    "searchPropertyType",
    "search_property_type",
  ]);
}

export function getEnquiryPropertyCity(property) {
  return String(property?.city ?? "").trim();
}

export function getEnquiryPropertyType(property) {
  return String(property?.officeType ?? "").trim();
}

export function getStoredUserLocation() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("anarock_user_location");
    if (!raw) return null;
    const location = JSON.parse(raw);
    return {
      street: String(
        location?.area || location?.street || location?.address || "",
      ).trim(),
      city: String(location?.city || "").trim(),
      state: String(location?.state || location?.province || "").trim(),
      country: String(location?.country || "").trim(),
      postalCode: String(
        location?.pincode ||
        location?.postalCode ||
        location?.postal_code ||
        "",
      ).trim(),
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
    };
  } catch (error) {
    console.error("Unable to read saved user location:", error);
    return null;
  }
}

// Number box for the filter panel. Typing only changes the box; the filter
// (and the search) runs once the visitor stops typing for a moment, presses
// Enter or leaves the box, instead of on every key.
export const FILTER_TYPING_DELAY_MS = 700;

export function FilterNumberInput({ value, onCommit, ...inputProps }) {
  const [draft, setDraft] = useState(value ?? "");
  const timerRef = useRef(null);
  const committedRef = useRef(value ?? "");

  // Follow outside changes (chip removed, Clear all, back button). The value
  // this box just sent is skipped, so text typed meanwhile is kept.
  useEffect(() => {
    const nextValue = value ?? "";
    if (String(nextValue) === String(committedRef.current)) return;
    committedRef.current = nextValue;
    clearTimeout(timerRef.current);
    setDraft(nextValue);
  }, [value]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const commit = (nextValue) => {
    clearTimeout(timerRef.current);
    if (String(nextValue) === String(committedRef.current)) return;
    committedRef.current = nextValue;
    onCommit(nextValue);
  };

  return (
    <input
      {...inputProps}
      type="number"
      min="0"
      value={draft}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDraft(nextValue);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(
          () => commit(nextValue),
          FILTER_TYPING_DELAY_MS,
        );
      }}
      onBlur={() => commit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit(draft);
        }
      }}
    />
  );
}
