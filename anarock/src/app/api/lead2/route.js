import { NextResponse } from "next/server";
import {
  createRateLimiter,
  readJsonBody,
} from "@/lib/requestGuard";
import {
  addRepeatEnquiryNote,
  findDuplicateLeadId,
  isDuplicateError,
  PUBLIC_SUCCESS_MESSAGE,
} from "@/lib/repeatEnquiry";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const ACCOUNTS_URL = "https://accounts.zoho.in";
const DEFAULT_API_URL = "https://www.zohoapis.in";
const CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;
let zohoTokenCache = {
  accessToken: null,
  expiresAt: 0,
  apiDomain: DEFAULT_API_URL,
};

async function generateZohoAccessToken() {
  if (!CLIENT_ID) {
    throw new Error("ZOHO_CLIENT_ID is missing from .env.local");
  }

  if (!CLIENT_SECRET) {
    throw new Error("ZOHO_CLIENT_SECRET is missing from .env.local");
  }

  if (!REFRESH_TOKEN) {
    throw new Error("ZOHO_REFRESH_TOKEN is missing from .env.local");
  }

  const tokenUrl = `${ACCOUNTS_URL}/oauth/v2/token`;
  const params = new URLSearchParams();
  params.set("refresh_token", REFRESH_TOKEN.trim());
  params.set("client_id", CLIENT_ID.trim());
  params.set("client_secret", CLIENT_SECRET.trim());
  params.set("grant_type", "refresh_token");
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });
  const responseText = await response.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error("Zoho OAuth returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(
      data?.error_description ||
      data?.error ||
      `Unable to generate Zoho access token. HTTP ${response.status}`,
    );
  }

  if (!data?.access_token) {
    throw new Error("Zoho did not return an access token.");
  }

  const accessToken = data.access_token;
  const expiresInSeconds = Number(data.expires_in) || 3600;
  const refreshAfterMilliseconds = Math.min(
    59 * 60 * 1000,
    Math.max(60, expiresInSeconds - 60) * 1000,
  );

  const apiDomain = String(data.api_domain || DEFAULT_API_URL).replace(
    /\/$/,
    "",
  );

  zohoTokenCache = {
    accessToken,

    expiresAt: Date.now() + refreshAfterMilliseconds,

    apiDomain,
  };

  return zohoTokenCache;
}

async function getZohoAccessToken(forceRefresh = false) {
  if (
    !forceRefresh &&
    zohoTokenCache.accessToken &&
    zohoTokenCache.expiresAt > Date.now()
  ) {
    return zohoTokenCache;
  }

  return await generateZohoAccessToken();
}

function normalizeCityName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function isValidCityName(value) {
  if (!value) return false;
  return /^[\p{L}\p{N} .'-]{1,100}$/u.test(value);
}

async function findCityId(tokenInfo, cityName) {
  const cleanCity = normalizeCityName(cityName);

  if (!cleanCity || !isValidCityName(cleanCity)) {
    return null;
  }

  const criteria = `(Name:equals:${cleanCity})`;

  const url =
    `${tokenInfo.apiDomain}/crm/v8/City/search` +
    `?criteria=${encodeURIComponent(criteria)}` +
    `&fields=id,Name`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Zoho-oauthtoken ${tokenInfo.accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    const error = new Error("Zoho access token expired while searching City.");

    error.code = "ZOHO_ACCESS_TOKEN_EXPIRED";

    throw error;
  }

  const responseText = await response.text();

  let data;

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error("Invalid response from Zoho City search.");
  }

  if (response.status === 204 || !response.ok) {
    return null;
  }

  const records = Array.isArray(data?.data) ? data.data : [];

  const exactCity = records.find(
    (record) =>
      String(record?.Name || "")
        .trim()
        .toLowerCase() === cleanCity.toLowerCase(),
  );

  return exactCity?.id || null;
}

function mapLocationToLeadOwnerTeam(city, state) {
  const cityLower = String(city || "")
    .trim()
    .toLowerCase();

  const stateLower = String(state || "")
    .trim()
    .toLowerCase();

  if (cityLower.includes("bengaluru") || cityLower.includes("bangalore")) {
    return "Bengaluru";
  }

  if (cityLower.includes("chennai")) {
    return "Chennai";
  }

  if (cityLower.includes("hyderabad")) {
    return "Hyderabad";
  }

  if (cityLower.includes("kolkata")) {
    return "Kolkata";
  }

  if (cityLower.includes("pune")) {
    return "Pune";
  }

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

async function createLeadInCRM(tokenInfo, recordData) {
  const url = `${tokenInfo.apiDomain}/crm/v8/Leads`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${tokenInfo.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [recordData],
      trigger: ["workflow"],
    }),
    cache: "no-store",
  });

  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error("Zoho CRM returned an invalid response.");
  }

  if (response.status === 401) {
    const error = new Error("Zoho access token expired.");
    error.code = "ZOHO_ACCESS_TOKEN_EXPIRED";
    throw error;
  }

  if (!response.ok) {
    const zohoResult = data?.data?.[0];
    const detailedMessage =
      zohoResult?.message || data?.message || "Zoho CRM rejected the lead.";
    const error = new Error(detailedMessage);
    error.code = zohoResult?.code || data?.code || "ZOHO_CRM_ERROR";
    error.zohoResponse = data;
    error.httpStatus = response.status;
    throw error;
  }

  const result = data?.data?.[0];
  if (!result || result.status !== "success") {
    const error = new Error(
      result?.message || "Lead was not created in Zoho CRM.",
    );
    error.code = result?.code || "ZOHO_LEAD_CREATION_FAILED";
    error.zohoResponse = data;
    throw error;
  }

  return {
    leadId: result?.details?.id || null,
    zohoResponse: data,
  };
}
// Lead fields that the visitor must not choose. They are always set here.
const LEAD_SOURCE = "Listing Platform";
const LEAD_STATUS = "Not Contacted";
const SUBLEAD_SOURCE = "Post a Requirement";

const MAX_BODY_SIZE = 20_000;
const MAX_LENGTHS = Object.freeze({
  firstName: 80,
  lastName: 80,
  email: 254,
  phone: 30,
  company: 150,
  requirementDetails: 2000,
  street: 250,
  city: 100,
  state: 100,
  country: 100,
  postalCode: 20,
  requirementCity: 100,
  requirementType: 100,
});

const checkRateLimit = createRateLimiter({
  name: "LEAD2",
  windowMs: 60 * 1000,
  max: 10,
});

function cleanText(value, maxLength) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanSingleLine(value, maxLength) {
  return cleanText(value, maxLength).replace(/\s+/g, " ");
}

function normalizePhone(value) {
  return String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");
}

function isValidPhone(value) {
  return /^\+?[1-9]\d{7,14}$/.test(value);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function safePositiveNumber(value, max = 100000000) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) return undefined;
  return parsed;
}

function badRequest(message, status = 400, extraHeaders = {}) {
  return NextResponse.json(
    { success: false, message },
    { status, headers: { "Cache-Control": "no-store", ...extraHeaders } },
  );
}

export async function POST(request) {
  const rateLimit = checkRateLimit(request);

  if (!rateLimit.allowed) {
    return badRequest(
      "Too many requests. Please try again in a minute.",
      429,
      { "Retry-After": String(rateLimit.retryAfter) },
    );
  }

  const parsed = await readJsonBody(request, MAX_BODY_SIZE);

  if (!parsed.ok) {
    return badRequest(parsed.message, parsed.status);
  }

  const body = parsed.data;

  try {
    let firstName = cleanSingleLine(body?.firstName, MAX_LENGTHS.firstName);
    let lastName = cleanSingleLine(body?.lastName, MAX_LENGTHS.lastName);
    if (!firstName && !lastName && body?.name) {
      const fullName = cleanSingleLine(
        body.name,
        MAX_LENGTHS.firstName + MAX_LENGTHS.lastName,
      );
      const nameParts = fullName.split(" ");
      firstName = (nameParts.shift() || "").slice(0, MAX_LENGTHS.firstName);
      lastName = nameParts.join(" ").slice(0, MAX_LENGTHS.lastName);
    }

    const email = cleanSingleLine(body?.email, MAX_LENGTHS.email).toLowerCase();
    const fullPhone = normalizePhone(
      cleanSingleLine(
        body?.fullPhone || `${body?.countryDialCode || ""}${body?.phone || ""}`,
        MAX_LENGTHS.phone,
      ),
    );
    const company = cleanSingleLine(body?.company, MAX_LENGTHS.company);
    const requirementDetails = cleanText(
      body?.requirementDetails ||
        body?.Requirement_Details ||
        body?.message ||
        body?.description ||
        "",
      MAX_LENGTHS.requirementDetails,
    );
    const location =
      body?.location && typeof body.location === "object" ? body.location : {};
    const street = cleanSingleLine(
      body?.Street || body?.street || location?.street || location?.area || "",
      MAX_LENGTHS.street,
    );

    const addressCity = cleanSingleLine(
      body?.City || body?.addressCity || location?.city || "",
      MAX_LENGTHS.city,
    );

    const province = cleanSingleLine(
      body?.Province ||
        body?.province ||
        body?.state ||
        location?.province ||
        location?.state ||
        "",
      MAX_LENGTHS.state,
    );

    const country = cleanSingleLine(
      body?.Country || body?.country || location?.country || "",
      MAX_LENGTHS.country,
    );

    const postalCode = cleanSingleLine(
      body?.Postal_Code ||
        body?.PostalCode ||
        body?.postalCode ||
        body?.pincode ||
        location?.postalCode ||
        location?.pincode ||
        "",
      MAX_LENGTHS.postalCode,
    );
    const rawRequirementCity = cleanSingleLine(
      body?.requirementCity || body?.Requirement_City || "",
      MAX_LENGTHS.requirementCity,
    );

    const requirementCity =
      rawRequirementCity === "__NONE__" ? "" : rawRequirementCity;
    const requirementType = cleanSingleLine(
      body?.requirementType || body?.Requirement_Type || "",
      MAX_LENGTHS.requirementType,
    );

    if (!firstName && !lastName) {
      return badRequest("Name is required.");
    }

    if (!fullPhone) {
      return badRequest("Phone number is required.");
    }

    if (!isValidPhone(fullPhone)) {
      return badRequest("Please enter a valid phone number.");
    }

    if (email && !isValidEmail(email)) {
      return badRequest("Please enter a valid email address.");
    }

    let tokenInfo = await getZohoAccessToken();
    const processLead = async (currentToken) => {
      const requirementCityId = requirementCity
        ? await findCityId(currentToken, requirementCity)
        : null;
      const leadOwnerTeam = mapLocationToLeadOwnerTeam(addressCity, province);
      const recordData = {
        First_Name: firstName || undefined,
        Last_Name: lastName || firstName || "Website Enquiry",
        Mobile: fullPhone,
        Company: company || "Individual",
        Lead_Source: LEAD_SOURCE,
        Lead_Status: LEAD_STATUS,
        Sublead_Source: SUBLEAD_SOURCE,
        Lead_Owner_Team: leadOwnerTeam,
        Requirement_Details: requirementDetails || undefined,
        Requirement_Type: requirementType || undefined,
        Street: street || undefined,
        City: addressCity || undefined,
        State: province || undefined,
        Country: country || undefined,
        Zip_Code: postalCode || undefined,
        ...(requirementType === "Managed Office/Co-working"
          ? {
            Requirement_Seats: safePositiveNumber(body?.Requirement_Seats, 100000),
            Requirement_Seat_Price: safePositiveNumber(body?.Requirement_Seat_Price),
          }
          : {
            Requirement_Area: safePositiveNumber(body?.Requirement_Area),
            Requirement_Rent: safePositiveNumber(body?.Requirement_Rent),
          }),
      };
      if (email) {
        recordData.Email = email;
      }
      if (requirementCityId) {
        recordData.Requirement_City = { id: requirementCityId };
      }
      Object.keys(recordData).forEach((key) => {
        if (
          recordData[key] === undefined ||
          recordData[key] === null ||
          recordData[key] === ""
        ) {
          delete recordData[key];
        }
      });

      let result;
      try {
        result = await createLeadInCRM(currentToken, recordData);
      } catch (error) {
        if (!isDuplicateError(error)) throw error;
        // The visitor is anonymous: never change the existing Lead. The
        // enquiry is added to it as a Note for the team to check.
        await addRepeatEnquiryNote({
          apiDomain: currentToken.apiDomain,
          accessToken: currentToken.accessToken,
          leadId: findDuplicateLeadId(error.zohoResponse),
          recordData,
          source: recordData.Sublead_Source,
        });
        result = { duplicate: true };
      }

      return {
        ...result,

        requirementCityId,

        leadOwnerTeam,
      };
    };
    try {
      await processLead(tokenInfo);

      return NextResponse.json(
        {
          success: true,
          message: PUBLIC_SUCCESS_MESSAGE,
        },
        {
          status: 200,
        },
      );
    } catch (error) {
      if (error?.code === "ZOHO_ACCESS_TOKEN_EXPIRED") {
        tokenInfo = await getZohoAccessToken(true);
        await processLead(tokenInfo);
        return NextResponse.json(
          {
            success: true,
            message: PUBLIC_SUCCESS_MESSAGE,
          },
          {
            status: 200,
          },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error(
      "[LEAD2] Lead creation failed:",
      error?.code || "UNKNOWN_ERROR",
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "We couldn't submit your requirement right now. Please try again.",
        errorCode: "LEAD_SUBMISSION_FAILED",
      },
      {
        status: 500,
      },
    );
  }
}