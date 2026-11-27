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
import { PUBLIC_SUCCESS_MESSAGE } from "@/lib/repeatEnquiry";
import { createLead } from "@/lib/crmLeads";
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






const checkRateLimit = createRateLimiter({
  name: "leads",
  windowMs: 60 * 1000,
  max: 10,
});







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

      const result = await createLead({
        tokenInfo: currentToken,
        recordData,
        workflows: true,
        timeoutMs: REQUEST_TIMEOUT_MS,
      });

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