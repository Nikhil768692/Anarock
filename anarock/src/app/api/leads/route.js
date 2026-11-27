import { NextResponse } from "next/server";
import { getZohoAccessToken } from "@/lib/zoho";
import {
  createRequestId,
  normalizeText,
  normalizePhone,
  isValidPhone,
  isValidEmail,
  findCityId,
  mapLocationToLeadOwnerTeam,
} from "@/lib/leadCommon";
import { createRateLimiter, readJsonBody } from "@/lib/requestGuard";
import { checkFormSubmission } from "@/lib/formProtection";
import {
  addRepeatEnquiryNote,
  PUBLIC_SUCCESS_MESSAGE,
} from "@/lib/repeatEnquiry";
import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_BODY_SIZE = 50_000;
const MAX_LENGTHS = Object.freeze({
  firstName: 80,
  lastName: 80,
  email: 254,
  phone: 30,
  company: 150,
  street: 250,
  city: 100,
  state: 100,
  country: 100,
  pincode: 20,
  requirementCity: 100,
  requirementType: 100,
});





function validateLength(value, max, field) {
  if (String(value || "").length > max) {
    const error = new Error(`${field} is too long.`);
    error.code = "VALIDATION_ERROR";
    error.httpStatus = 400;
    throw error;
  }
  return value;
}






function safePositiveNumber(value, { min = 0, max = 100000000 } = {}) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  if (parsed < min || parsed > max) {
    return undefined;
  }

  return parsed;
}

const checkRateLimit = createRateLimiter({
  name: "leads",
  windowMs: 60 * 1000,
  max: 10,
});






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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    const error = new Error("Zoho CRM returned an invalid response.");
    error.code = "ZOHO_INVALID_RESPONSE";
    error.httpStatus = 502;
    throw error;
  }

  if (response.status === 401) {
    const error = new Error("Zoho access token expired.");
    error.code = "ZOHO_ACCESS_TOKEN_EXPIRED";
    throw error;
  }
  const zohoResult = data?.data?.[0];
  const zohoCode = String(zohoResult?.code || data?.code || "")
    .trim()
    .toUpperCase();
  const zohoMessage = String(zohoResult?.message || data?.message || "").trim();
  const isDuplicate =
    zohoCode === "DUPLICATE_DATA" ||
    zohoCode === "DUPLICATE" ||
    zohoMessage.toLowerCase().includes("duplicate") ||
    (Array.isArray(zohoResult?.details?.errors) &&
      zohoResult.details.errors.some(
        (item) => String(item?.code || "").toUpperCase() === "DUPLICATE_DATA",
      ));

  if (isDuplicate) {
    const duplicateErrors = Array.isArray(zohoResult?.details?.errors)
      ? zohoResult.details.errors
      : [];

    let existingLeadId = null;

    for (const duplicateError of duplicateErrors) {
      const code = String(duplicateError?.code || "")
        .trim()
        .toUpperCase();

      if (code === "DUPLICATE_DATA") {
        const duplicateRecordId = duplicateError?.details?.duplicate_record?.id;

        if (duplicateRecordId) {
          existingLeadId = String(duplicateRecordId);

          break;
        }
      }
    }

    if (!existingLeadId) {
      const duplicateDetails = zohoResult?.details || data?.details || {};

      existingLeadId =
        duplicateDetails?.duplicate_record?.id ||
        duplicateDetails?.id ||
        duplicateDetails?.record_id ||
        duplicateDetails?.recordId ||
        duplicateDetails?.module?.id ||
        duplicateDetails?.module?.record_id ||
        null;
    }

    if (!existingLeadId) {
      const error = new Error(
        "Duplicate lead detected, but the existing Lead could not be identified.",
      );

      error.code = "DUPLICATE_LEAD_ID_NOT_FOUND";

      error.httpStatus = 502;

      throw error;
    }

    // The visitor is anonymous: never change the existing Lead. The enquiry
    // is added to it as a Note for the team to check.
    await addRepeatEnquiryNote({
      apiDomain: tokenInfo.apiDomain,
      accessToken: tokenInfo.accessToken,
      leadId: existingLeadId,
      recordData,
      source: recordData.Sublead_Source,
      timeoutMs: REQUEST_TIMEOUT_MS,
    });

    return { success: true, duplicate: true };
  }

  if (!response.ok) {
    const error = new Error("Zoho CRM rejected the lead.");

    error.code = zohoCode || "ZOHO_CRM_ERROR";

    error.httpStatus =
      response.status >= 400 && response.status < 600 ? response.status : 502;

    throw error;
  }

  const result = data?.data?.[0];

  if (!result || result.status !== "success") {
    const error = new Error("Lead was not created in Zoho CRM.");

    error.code = result?.code || "ZOHO_LEAD_CREATION_FAILED";

    error.httpStatus = 502;

    throw error;
  }

  return {
    success: true,
    duplicate: false,
    priority: false,
    leadId: result?.details?.id || null,
  };
}

export async function POST(request) {
  const requestId = createRequestId();
  try {
    const rateLimit = await checkRateLimit(request);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many requests. Please try again shortly.",
          requestId,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter),
          },
        },
      );
    }

    const parsed = await readJsonBody(request, MAX_BODY_SIZE);
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.message, requestId },
        { status: parsed.status },
      );
    }

    const body = parsed.data;
    const guard = await checkFormSubmission(request, body);
    if (!guard.ok) {
      return guard.silent
        ? NextResponse.json({
            success: true,
            message: PUBLIC_SUCCESS_MESSAGE,
            requestId,
          })
        : NextResponse.json(
            { success: false, message: guard.message, code: guard.code, requestId },
            { status: guard.status },
          );
    }

    const location = body?.location || {};
    let firstName = normalizeText(body?.firstName);
    let lastName = normalizeText(body?.lastName);
    if (!firstName && !lastName && body?.name) {
      const fullName = normalizeText(body.name);
      const nameParts = fullName.split(" ");
      firstName = nameParts.shift() || "";
      lastName = nameParts.join(" ") || "";
    }
    const rawEmail = normalizeText(body?.email);
    if (rawEmail && !isValidEmail(rawEmail)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address.",
          requestId,
        },
        {
          status: 400,
        },
      );
    }
    const email = rawEmail.toLowerCase();
    const rawPhone = normalizeText(body?.phone);
    const phone = normalizePhone(rawPhone);
    const company = normalizeText(body?.company);
    const street = normalizeText(
      body?.Street ||
      body?.street ||
      body?.area ||
      location?.street ||
      location?.area ||
      "",
    );
    const addressCity = normalizeText(
      body?.City || body?.city || body?.addressCity || location?.city || "",
    );
    const state = normalizeText(
      body?.State ||
      body?.state ||
      body?.Province ||
      body?.province ||
      location?.state ||
      location?.province ||
      "",
    );

    const country = normalizeText(
      body?.Country || body?.country || location?.country || "",
    );
    const pincode = normalizeText(
      body?.Zip_Code ||
      body?.Postal_Code ||
      body?.PostalCode ||
      body?.postalCode ||
      body?.pincode ||
      location?.postalCode ||
      location?.pincode ||
      "",
    );

    const rawRequirementCity = normalizeText(
      body?.requirementCity || body?.Requirement_City || "",
    );
    const requirementCity =
      rawRequirementCity === "__NONE__" ? "" : rawRequirementCity;
    const requirementType = normalizeText(
      body?.requirementType || body?.Requirement_Type || "",
    );
    validateLength(firstName, MAX_LENGTHS.firstName, "First name");
    validateLength(lastName, MAX_LENGTHS.lastName, "Last name");
    validateLength(email, MAX_LENGTHS.email, "Email");
    validateLength(phone, MAX_LENGTHS.phone, "Phone");
    validateLength(company, MAX_LENGTHS.company, "Company");
    validateLength(street, MAX_LENGTHS.street, "Address");
    validateLength(addressCity, MAX_LENGTHS.city, "City");
    validateLength(state, MAX_LENGTHS.state, "State");
    validateLength(country, MAX_LENGTHS.country, "Country");
    validateLength(pincode, MAX_LENGTHS.pincode, "Pincode");
    validateLength(
      requirementCity,
      MAX_LENGTHS.requirementCity,
      "Requirement city",
    );
    validateLength(
      requirementType,
      MAX_LENGTHS.requirementType,
      "Requirement type",
    );
    if (!firstName && !lastName) {
      return NextResponse.json(
        {
          success: false,
          message: "Name is required.",
          requestId,
        },
        {
          status: 400,
        },
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number is required.",
          requestId,
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid phone number.",
          requestId,
        },
        {
          status: 400,
        },
      );
    }

    let tokenInfo = await getZohoAccessToken();

    const processLead = async (currentToken) => {
      let requirementCityId = null;

      if (requirementCity) {
        requirementCityId = await findCityId(currentToken, requirementCity);
      }

      const leadOwnerTeam = mapLocationToLeadOwnerTeam(addressCity, state);

      const recordData = {
        First_Name: firstName || undefined,
        Last_Name: lastName || firstName || "Website Enquiry",
        Mobile: phone,
        Company: company || "",
        Street: street || undefined,
        City: addressCity || undefined,
        State: state || undefined,
        Country: country || undefined,
        Zip_Code: pincode || undefined,
        Lead_Source: "Listing Platform",
        Lead_Status: "Not Contacted",
        Sublead_Source: "Request a Callback",
        Lead_Owner_Team: leadOwnerTeam,
        Requirement_Type: requirementType || undefined,
      };
      if (email) {
        recordData.Email = email;
      }
      if (requirementCityId) {
        recordData.Requirement_City = {
          id: requirementCityId,
        };
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

      const result = await createLeadInCRM(currentToken, recordData);

      return {
        ...result,
        requirementCityId,
        requirementCity,
        requirementType,
        leadOwnerTeam,
      };
    };

    // The same reply for new and repeat enquiries: it must not reveal
    // whether this person is already in the CRM.
    try {
      await processLead(tokenInfo);

      return NextResponse.json(
        {
          success: true,
          message: PUBLIC_SUCCESS_MESSAGE,
          requestId,
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
            requestId,
          },
          {
            status: 200,
          },
        );
      }

      throw error;
    }
  } catch (error) {
    logger.error("[API] LEAD CREATION ERROR", {
      requestId,
      code: error?.code || "UNKNOWN_ERROR",
      status: error?.httpStatus || 500,
    });

    if (error?.code === "ZOHO_AUTH_RATE_LIMITED") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Zoho authentication is temporarily rate limited. Please try again after a few minutes.",
          errorCode: "ZOHO_AUTH_RATE_LIMITED",
          requestId,
        },
        {
          status: 429,
        },
      );
    }

    if (error?.code === "VALIDATION_ERROR") {
      return NextResponse.json(
        {
          success: false,
          message: error.message || "Invalid request.",
          errorCode: "VALIDATION_ERROR",
          requestId,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while creating the lead. Please try again.",
        errorCode: "REQUEST_FAILED",
        requestId,
      },
      {
        status:
          error?.httpStatus &&
            Number(error.httpStatus) >= 400 &&
            Number(error.httpStatus) < 600
            ? Number(error.httpStatus)
            : 500,
      },
    );
  }
}