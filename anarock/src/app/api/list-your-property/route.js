import { NextResponse } from "next/server";
// Saves "List your Property" submissions. City and micro-market lists come
// from /api/cities and /api/micromarkets.
import { createRateLimiter, readJsonBody } from "@/lib/requestGuard";
import { checkFormSubmission } from "@/lib/formProtection";
import { logger } from "@/lib/logger";

/* =========================================================
   ZOHO SHEET: every submission is added as a new row
========================================================= */

const SHEET_API_DOMAIN = (process.env.ZOHO_SHEET_API_DOMAIN || "https://sheet.zoho.in").replace(/\/+$/, "");
// Row 2 of the sheet holds the column names; data starts on row 3.
const SHEET_HEADER_ROW = 2;
const SHEET_TOKEN_CACHE_KEY = "__anarockListPropertySheetToken";

const checkSubmitRateLimit = createRateLimiter({
    name: "LIST_PROPERTY_SUBMIT",
    windowMs: 60 * 1000,
    max: 5,
});

const PROPERTY_TYPES = { conventional: "Conventional Office", coworking: "Coworking" };
const METHODS = { form: "Self listing", callback: "Assistance" };
const CURRENCIES = new Set(["INR", "USD", "EUR", "GBP", "AED", "SGD"]);

function cleanText(value, maxLength = 200) {
    return String(value ?? "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .trim()
        .slice(0, maxLength);
}

function cleanNumber(value) {
    const text = cleanText(value, 20);
    if (!text) return "";
    const number = Number(text);
    return Number.isFinite(number) && number >= 0 ? text : "";
}

// A cell that starts with = + - @ is read as a formula by spreadsheets.
// A leading apostrophe keeps it as plain text (the apostrophe is not shown).
function sheetSafe(value) {
    const text = String(value ?? "");
    return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function formatIndiaTime(date = new Date()) {
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(date);
}

async function getSheetAccessToken() {
    const cached = globalThis[SHEET_TOKEN_CACHE_KEY];
    if (cached?.accessToken && cached.expiresAt > Date.now()) {
        return cached.accessToken;
    }

    const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_SHEET_REFRESH_TOKEN, ZOHO_ACCOUNTS_DOMAIN } = process.env;
    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_SHEET_REFRESH_TOKEN) {
        throw new Error("Zoho Sheet credentials are not configured.");
    }

    const accountsDomain = (ZOHO_ACCOUNTS_DOMAIN || "https://accounts.zoho.in").replace(/\/+$/, "");
    const response = await fetch(`${accountsDomain}/oauth/v2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            refresh_token: ZOHO_SHEET_REFRESH_TOKEN,
            client_id: ZOHO_CLIENT_ID,
            client_secret: ZOHO_CLIENT_SECRET,
            grant_type: "refresh_token",
        }).toString(),
        cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.access_token) {
        logger.error("Zoho Sheet token error:", data?.error || response.status);
        throw new Error("Unable to authenticate with Zoho Sheet.");
    }

    const expiresInSeconds = Number(data.expires_in) || 3600;
    globalThis[SHEET_TOKEN_CACHE_KEY] = {
        accessToken: data.access_token,
        expiresAt: Date.now() + Math.max(60, expiresInSeconds - 300) * 1000,
    };
    return data.access_token;
}

async function addSheetRow(record) {
    const resourceId = cleanText(process.env.ZOHO_SHEET_RESOURCE_ID, 100);
    const worksheetName = cleanText(process.env.ZOHO_SHEET_WORKSHEET, 100) || "Sheet1";
    if (!resourceId) {
        throw new Error("Zoho Sheet resource ID is not configured.");
    }

    const send = async () => {
        const accessToken = await getSheetAccessToken();
        const response = await fetch(`${SHEET_API_DOMAIN}/api/v2/${encodeURIComponent(resourceId)}`, {
            method: "POST",
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                method: "worksheet.records.add",
                worksheet_name: worksheetName,
                header_row: String(SHEET_HEADER_ROW),
                json_data: JSON.stringify([record]),
            }).toString(),
            cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        return { response, data };
    };

    let { response, data } = await send();

    // Expired or revoked token: get a fresh one and try once more.
    if (response.status === 401) {
        globalThis[SHEET_TOKEN_CACHE_KEY] = null;
        ({ response, data } = await send());
    }

    if (!response.ok || data?.status !== "success") {
        logger.error("Zoho Sheet error:", data?.error_code || response.status, data?.error_message || "");
        throw new Error("Unable to save the submission.");
    }
}

// The sheet keeps areas in sq ft. If the visitor typed in sq m (navbar unit),
// areas are converted to sq ft and rents from per sq m to per sq ft.
const SQFT_PER_SQM = 10.7639;

function toSqft(value, unit, kind) {
    const text = cleanNumber(value);
    if (!text || unit !== "sqm") return text;
    const number = Number(text);
    const converted = kind === "area" ? number * SQFT_PER_SQM : number / SQFT_PER_SQM;
    return String(Math.round(converted * 100) / 100);
}

function buildSheetRecord({ method, form, currency, unit, location }) {
    const isCoworking = form.propertyType === "coworking";
    const safeLocation = location && typeof location === "object" ? location : {};

    const record = {
        "Source": "Website",
        "Created Time": formatIndiaTime(),
        "Street": cleanText(safeLocation.street, 150),
        "State": cleanText(safeLocation.state, 100),
        "Country": cleanText(safeLocation.country, 100),
        "City": cleanText(safeLocation.city, 100),
        "User Pin Code": cleanText(safeLocation.pincode, 20),
        "Method": METHODS[method],
        "Property Type": PROPERTY_TYPES[form.propertyType],
        "Building Name": cleanText(form.buildingName, 150),
        "Property City": cleanText(form.city, 100),
        "Micromarket": cleanText(form.micromarket, 150),
        "Address": cleanText(form.address, 500),
        "Developer/Operator": cleanText(form.developer, 150),
        "Leasable Area (sq ft)": isCoworking ? "" : toSqft(form.area, unit, "area"),
        "Floor Plate (sq ft)": isCoworking ? "" : toSqft(form.floorPlate, unit, "area"),
        "Rent": isCoworking ? "" : toSqft(form.rent, unit, "rent"),
        "Achievable Rent": isCoworking ? "" : toSqft(form.achievableRent, unit, "rent"),
        "Seats Offered": isCoworking ? cleanNumber(form.seats) : "",
        "Per Seat Cost": isCoworking ? cleanNumber(form.seatPrice) : "",
        "Currency": CURRENCIES.has(currency) ? currency : "INR",
        "Description": cleanText(form.description, 2000),
        "Contact Name": cleanText(form.contactName, 100),
        "Phone": cleanText(form.phone, 20),
        "Email": cleanText(form.email, 254),
        "Company Name": cleanText(form.companyName, 150),
    };

    return Object.fromEntries(
        Object.entries(record).map(([key, value]) => [key, sheetSafe(value)]),
    );
}

export async function POST(request) {
    const rateLimit = await checkSubmitRateLimit(request);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { success: false, message: "Too many requests. Please try again in a minute." },
            { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
        );
    }

    const body = await readJsonBody(request, 20_000);
    if (!body.ok) {
        return NextResponse.json({ success: false, message: body.message }, { status: body.status });
    }

    const guard = await checkFormSubmission(request, body.data);
    if (!guard.ok) {
        return guard.silent
            ? NextResponse.json({ success: true, message: "Submission received." })
            : NextResponse.json(
                { success: false, message: guard.message, code: guard.code },
                { status: guard.status },
            );
    }

    const { method, currency, unit, location } = body.data;
    const form = body.data.form && typeof body.data.form === "object" ? body.data.form : {};

    if (!METHODS[method]) {
        return NextResponse.json(
            { success: false, message: "Invalid submission method." },
            { status: 400 },
        );
    }

    // Same required fields as the form.
    const phone = cleanText(form.phone, 20);
    const email = cleanText(form.email, 254);
    if (
        !cleanText(form.buildingName) ||
        !PROPERTY_TYPES[form.propertyType] ||
        !cleanText(form.city) ||
        !cleanText(form.address) ||
        !cleanText(form.contactName)
    ) {
        return NextResponse.json(
            { success: false, message: "Please fill in all required details." },
            { status: 400 },
        );
    }
    if (!/^\+\d{8,15}$/.test(phone)) {
        return NextResponse.json(
            { success: false, message: "Please enter a valid phone number." },
            { status: 400 },
        );
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return NextResponse.json(
            { success: false, message: "Please enter a valid email address." },
            { status: 400 },
        );
    }

    try {
        await addSheetRow(buildSheetRecord({ method, form, currency, unit, location }));
        return NextResponse.json({ success: true, message: "Submission received." });
    } catch (error) {
        logger.error("Property form error:", error?.message || error);
        return NextResponse.json(
            { success: false, message: "We couldn't submit your details right now. Please try again in a moment." },
            { status: 502 },
        );
    }
}