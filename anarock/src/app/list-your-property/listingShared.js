// Constants and helpers of the "List your Property" form.
export const STEPS = [
    "Property details",
    "Contact details",
    "Choose method",
    "Complete listing",
    "Review",
];

export const initialForm = {
    buildingName: "",
    propertyType: "",
    city: "",
    micromarket: "",
    address: "",
    developer: "",
    companyName: "",
    contactName: "",
    phone: "",
    email: "",
    area: "",
    floorPlate: "",
    rent: "",
    achievableRent: "",
    seats: "",
    seatPrice: "",
    description: "",
};

export const propertyTypes = [
    {
        value: "conventional",
        label: "Conventional Office",
        description: "Office spaces & commercial buildings",
    },
    {
        value: "coworking",
        label: "Coworking",
        description: "Coworking spaces, flexible & managed offices",
    },
];

// Same country list as the home page and city page forms.

// Same symbols as src/lib/format.js, used for the price fields.
export const CURRENCY_SYMBOLS = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "د.إ ",
    SGD: "S$",
};

export const ROUTE_CITY_STORAGE_KEYS = [
    "routeCity",
    "selectedCity",
    "userCity",
    "currentCity",
    "city",
    "locationCity",
    "userLocationCity",
];

export function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

export function isValidEmail(value) {
    const email = String(value || "").trim();
    if (email.length > 254 || /\s/.test(email)) return false;
    return /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(
        email,
    );
}

export function isValidPhone(digits, country) {
    if (country.code === "IN") {
        return /^[6-9]\d{9}$/.test(digits);
    }
    return digits.length >= country.min && digits.length <= country.max;
}

// The visitor location saved by the site (same one the navbar shows).
export function getUserLocation() {
    const empty = { street: "", state: "", country: "", city: "", pincode: "" };
    if (typeof window === "undefined") return empty;
    try {
        const saved = JSON.parse(
            window.sessionStorage.getItem("anarock_user_location") || "null",
        );
        if (!saved || typeof saved !== "object") return empty;
        const text = (value) => String(value || "").trim();
        return {
            street: text(saved.area),
            state: text(saved.state),
            country: text(saved.country),
            city: text(saved.city),
            pincode: text(saved.pincode),
        };
    } catch {
        return empty;
    }
}

export function uniqueValues(values) {
    const seen = new Set();
    return values
        .map((value) => String(value || "").trim())
        .filter((value) => {
            const key = normalize(value);
            if (!key || seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
}

export function getStorageCity() {
    if (typeof window === "undefined") {
        return "";
    }
    try {
        for (const key of ROUTE_CITY_STORAGE_KEYS) {
            const raw = window.localStorage.getItem(key);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw);
                if (typeof parsed === "string" && parsed.trim()) {
                    return parsed.trim();
                }
                const city =
                    parsed?.city ??
                    parsed?.City ??
                    parsed?.name ??
                    parsed?.Name ??
                    parsed?.location?.city ??
                    parsed?.address?.city ??
                    parsed?.result?.city ??
                    "";
                if (city) return String(city).trim();
            } catch {
                if (raw.trim()) return raw.trim();
            }
        }
    } catch {
        return "";
    }
    return "";
}

export function getRecordName(record) {
    if (typeof record === "string") return record;
    return (
        record?.name ??
        record?.Name ??
        record?.city ??
        record?.City ??
        record?.City_Name ??
        record?.Micromarket ??
        record?.Micromarket_Name ??
        ""
    );
}

/* =========================================================
   MAIN PAGE
========================================================= */
