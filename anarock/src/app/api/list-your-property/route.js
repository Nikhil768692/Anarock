import { NextResponse } from "next/server";
import { getOrFetchCache } from "@/lib/cache";
import { createRateLimiter, readJsonBody } from "@/lib/requestGuard";
const RESEND_API_URL = "https://api.resend.com/emails";

const CRM_API_DOMAIN = "https://www.zohoapis.in";
const CITY_MODULE = "City";
const MICROMARKET_MODULE = "Micromarkets";
const MICROMARKET_CITY_FIELD = "City";

// City and micro-market lists change rarely, so CRM is read at most once
// every 30 minutes instead of on every request.
const OPTIONS_CACHE_TTL = 30 * 60 * 1000;
const TOKEN_CACHE_KEY = "__anarockListPropertyZohoToken";

const checkOptionsRateLimit = createRateLimiter({
    name: "LIST_PROPERTY_OPTIONS",
    windowMs: 60 * 1000,
    max: 30,
});
function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}
function uniqueValues(values) {
    const map = new Map();
    for (const value of values) {
        const cleaned = String(value || "").trim();
        if (!cleaned) {
            continue;
        }
        const key = normalize(cleaned);
        if (!map.has(key)) {
            map.set(key, cleaned);
        }
    }
    return Array.from(map.values());
}
function getRecordName(record) {
    if (typeof record === "string") {
        return record;
    }
    return (
        record?.Name ??
        record?.name ??
        record?.City ??
        record?.city ??
        record?.City_Name ??
        record?.city_name ??
        record?.Micromarket ??
        record?.Micromarket_Name ??
        ""
    );
}
function getMicromarketCity(record) {
    const value =
        record?.[MICROMARKET_CITY_FIELD] ??
        record?.City ??
        record?.city ??
        record?.City_Name ??
        record?.city_name ??
        "";
    if (typeof value === "string") {
        return value;
    }
    return (
        value?.name ??
        value?.Name ??
        value?.display_value ??
        value?.displayValue ??
        ""
    );
}
function matchesCity(record, requestedCity) {
    return normalize(getMicromarketCity(record)) === normalize(requestedCity);
}

async function getZohoAccessToken() {
    if (process.env.ZOHO_CRM_ACCESS_TOKEN) {
        return process.env.ZOHO_CRM_ACCESS_TOKEN;
    }
    const cachedToken = globalThis[TOKEN_CACHE_KEY];
    if (cachedToken?.accessToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.accessToken;
    }
    const {
        ZOHO_CRM_REFRESH_TOKEN,
        ZOHO_CRM_CLIENT_ID,
        ZOHO_CRM_CLIENT_SECRET,
        ZOHO_ACCOUNTS_DOMAIN,
    } = process.env;

    if (
        !ZOHO_CRM_REFRESH_TOKEN ||
        !ZOHO_CRM_CLIENT_ID ||
        !ZOHO_CRM_CLIENT_SECRET
    ) {
        throw new Error("Zoho CRM credentials are not configured.");
    }

    const accountsDomain = ZOHO_ACCOUNTS_DOMAIN || "https://accounts.zoho.in";

    const params = new URLSearchParams({
        refresh_token: ZOHO_CRM_REFRESH_TOKEN,
        client_id: ZOHO_CRM_CLIENT_ID,
        client_secret: ZOHO_CRM_CLIENT_SECRET,
        grant_type: "refresh_token",
    });

    const response = await fetch(`${accountsDomain}/oauth/v2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.access_token) {
        console.error("Zoho token error:", data?.error || response.status);
        throw new Error("Unable to authenticate with Zoho CRM.");
    }
    const expiresInSeconds = Number(data.expires_in) || 3600;
    globalThis[TOKEN_CACHE_KEY] = {
        accessToken: data.access_token,
        expiresAt: Date.now() + Math.max(60, expiresInSeconds - 300) * 1000,
    };
    return data.access_token;
}
async function getCRMRecords(moduleName) {
    const accessToken = await getZohoAccessToken();
    const records = [];
    let page = 1;
    while (page <= 20) {
        const url = new URL(
            `${CRM_API_DOMAIN}/crm/v6/${encodeURIComponent(moduleName)}`,
        );
        url.searchParams.set(
            "fields",
            [
                "id",
                "Name",
                "City",
                "city",
                "City_Name",
                "city_name",
                "Micromarket",
                "Micromarket_Name",
            ].join(","),
        );
        url.searchParams.set("per_page", "200");
        url.searchParams.set("page", String(page));
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
            cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            console.error("Zoho CRM error:", data?.code || response.status);
            if (response.status === 401) {
                globalThis[TOKEN_CACHE_KEY] = null;
            }
            throw new Error(`Unable to fetch ${moduleName} from CRM.`);
        }
        const current = Array.isArray(data?.data) ? data.data : [];
        records.push(...current);
        if (current.length === 0 || !data?.info?.more_records) {
            break;
        }
        page += 1;
    }
    return records;
}

function getCachedCRMRecords(moduleName) {
    return getOrFetchCache(
        `list-your-property:${moduleName}`,
        () => getCRMRecords(moduleName),
        OPTIONS_CACHE_TTL,
        { staleWhileRevalidate: true },
    );
}

async function getCities() {
    const records = await getCachedCRMRecords(CITY_MODULE);
    return uniqueValues(records.map(getRecordName));
}

async function getMicromarkets(city) {
    if (!city) {
        return [];
    }
    const records = await getCachedCRMRecords(MICROMARKET_MODULE);
    const filtered = records.filter((record) => matchesCity(record, city));
    return uniqueValues(filtered.map(getRecordName));
}

export async function GET(request) {
    const rateLimit = checkOptionsRateLimit(request);

    if (!rateLimit.allowed) {
        return NextResponse.json(
            {
                success: false,
                message: "Too many requests. Please try again in a minute.",
            },
            {
                status: 429,
                headers: { "Retry-After": String(rateLimit.retryAfter) },
            },
        );
    }

    try {
        const url = new URL(request.url);
        const resource = url.searchParams.get("resource");
        if (resource === "cities") {
            const cities = await getCities();
            return NextResponse.json({
                success: true,
                data: cities,
            });
        }

        if (resource === "micromarkets") {
            const city = url.searchParams.get("city")?.trim().slice(0, 100);

            if (!city) {
                return NextResponse.json({
                    success: true,
                    data: [],
                });
            }

            const micromarkets = await getMicromarkets(city);

            return NextResponse.json({
                success: true,
                city,
                data: micromarkets,
            });
        }

        return NextResponse.json(
            {
                success: false,
                message:
                    "Invalid resource. Use ?resource=cities or ?resource=micromarkets&city=...",
            },
            {
                status: 400,
            },
        );
    } catch (error) {
        console.error("Listing options error:", error?.message || error);

        return NextResponse.json(
            {
                success: false,
                message: "Unable to load CRM options.",
            },
            {
                status: 500,
            },
        );
    }
}

/* =========================================================
   EMAIL HTML
========================================================= */

function buildEmailHTML({ method, form, callbackTime }) {
    const isCoworking = form.propertyType === "coworking";

    const propertyType = isCoworking ? "Coworking" : "Conventional Office";

    const inventoryHTML = isCoworking
        ? `
                <tr>
                    <td style="padding:9px 0;color:#777;">
                        Seats offered
                    </td>
                    <td style="padding:9px 0;">
                        ${escapeHtml(form.seats || "—")}
                    </td>
                </tr>

                <tr>
                    <td style="padding:9px 0;color:#777;">
                        Minimum seat price / month
                    </td>
                    <td style="padding:9px 0;">
                        ₹ ${escapeHtml(form.seatPriceMin || "—")}
                    </td>
                </tr>

                <tr>
                    <td style="padding:9px 0;color:#777;">
                        Maximum seat price / month
                    </td>
                    <td style="padding:9px 0;">
                        ₹ ${escapeHtml(form.seatPriceMax || "—")}
                    </td>
                </tr>
            `
        : `
                <tr>
                    <td style="padding:9px 0;color:#777;">
                        Area
                    </td>
                    <td style="padding:9px 0;">
                        ${escapeHtml(form.area || "—")} sq ft
                    </td>
                </tr>

                <tr>
                    <td style="padding:9px 0;color:#777;">
                        Minimum rent / month
                    </td>
                    <td style="padding:9px 0;">
                        ₹ ${escapeHtml(form.rentMin || "—")}
                    </td>
                </tr>

                <tr>
                    <td style="padding:9px 0;color:#777;">
                        Maximum rent / month
                    </td>
                    <td style="padding:9px 0;">
                        ₹ ${escapeHtml(form.rentMax || "—")}
                    </td>
                </tr>
            `;

    const callbackHTML =
        method === "callback"
            ? `
                <tr>
                    <td style="padding:9px 0;color:#777;">
                        Preferred callback
                    </td>
                    <td style="padding:9px 0;">
                        ${escapeHtml(callbackTime || "—")}
                    </td>
                </tr>
            `
            : "";

    return `
        <div
            style="
                font-family:Arial,sans-serif;
                background:#f7f5f8;
                padding:32px;
                color:#171717;
            "
        >
            <div
                style="
                    max-width:720px;
                    margin:0 auto;
                    background:#ffffff;
                    border-radius:22px;
                    overflow:hidden;
                    border:1px solid #eee;
                "
            >

                <div
                    style="
                        padding:30px 32px;
                        background:
                            linear-gradient(
                                135deg,
                                #A054A0,
                                #7E3F82
                            );
                        color:#ffffff;
                    "
                >
                    <div
                        style="
                            font-size:11px;
                            letter-spacing:.15em;
                            text-transform:uppercase;
                            opacity:.8;
                        "
                    >
                        Property Portal
                    </div>

                    <h1
                        style="
                            margin:10px 0 0;
                            font-size:25px;
                        "
                    >
                        ${method === "callback"
            ? "New callback request"
            : "New property submission"
        }
                    </h1>
                </div>

                <div style="padding:30px 32px;">

                    <h2
                        style="
                            font-size:17px;
                            margin:0 0 14px;
                        "
                    >
                        Property details
                    </h2>

                    <table
                        style="
                            width:100%;
                            border-collapse:collapse;
                            font-size:14px;
                        "
                    >
                        <tr>
                            <td
                                style="
                                    padding:9px 0;
                                    color:#777;
                                    width:42%;
                                "
                            >
                                Building
                            </td>

                            <td
                                style="
                                    padding:9px 0;
                                    font-weight:600;
                                "
                            >
                                ${escapeHtml(form.buildingName || "—")}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:9px 0;color:#777;">
                                Property type
                            </td>

                            <td style="padding:9px 0;">
                                ${escapeHtml(propertyType)}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:9px 0;color:#777;">
                                City
                            </td>

                            <td style="padding:9px 0;">
                                ${escapeHtml(form.city || "—")}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:9px 0;color:#777;">
                                Micromarket
                            </td>

                            <td style="padding:9px 0;">
                                ${escapeHtml(form.micromarket || "—")}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:9px 0;color:#777;">
                                Developer / Owner
                            </td>

                            <td style="padding:9px 0;">
                                ${escapeHtml(form.developer || "—")}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:9px 0;color:#777;">
                                Address
                            </td>

                            <td style="padding:9px 0;">
                                ${escapeHtml(form.address || "—")}
                            </td>
                        </tr>

                        ${inventoryHTML}

                        ${callbackHTML}
                    </table>

                    <hr
                        style="
                            border:0;
                            border-top:1px solid #eee;
                            margin:26px 0;
                        "
                    />

                    <h2
                        style="
                            font-size:17px;
                            margin:0 0 14px;
                        "
                    >
                        Contact details
                    </h2>

                    <table
                        style="
                            width:100%;
                            border-collapse:collapse;
                            font-size:14px;
                        "
                    >
                        <tr>
                            <td
                                style="
                                    padding:9px 0;
                                    color:#777;
                                    width:42%;
                                "
                            >
                                Contact name
                            </td>

                            <td style="padding:9px 0;">
                                ${escapeHtml(form.contactName || "—")}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:9px 0;color:#777;">
                                Phone
                            </td>

                            <td style="padding:9px 0;">
                                ${escapeHtml(form.phone || "—")}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:9px 0;color:#777;">
                                Email
                            </td>

                            <td style="padding:9px 0;">
                                ${escapeHtml(form.email || "—")}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:9px 0;color:#777;">
                                Owner / representative
                            </td>

                            <td style="padding:9px 0;">
                                ${escapeHtml(form.ownerName || "—")}
                            </td>
                        </tr>
                    </table>

                    ${form.description
            ? `
                                <hr
                                    style="
                                        border:0;
                                        border-top:1px solid #eee;
                                        margin:26px 0;
                                    "
                                />

                                <h2
                                    style="
                                        font-size:17px;
                                        margin:0 0 10px;
                                    "
                                >
                                    Description
                                </h2>

                                <p
                                    style="
                                        font-size:14px;
                                        line-height:1.7;
                                        color:#555;
                                        margin:0;
                                    "
                                >
                                    ${escapeHtml(form.description)}
                                </p>
                            `
            : ""
        }

                </div>
            </div>
        </div>
    `;
}

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
        console.error("Zoho Sheet token error:", data?.error || response.status);
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
        console.error("Zoho Sheet error:", data?.error_code || response.status, data?.error_message || "");
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
    const rateLimit = checkSubmitRateLimit(request);
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
        console.error("Property form error:", error?.message || error);
        return NextResponse.json(
            { success: false, message: "We couldn't submit your details right now. Please try again in a moment." },
            { status: 502 },
        );
    }
}