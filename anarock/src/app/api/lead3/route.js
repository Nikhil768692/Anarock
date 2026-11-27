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
import { getPropertiesByIds } from "@/lib/propertiesCache";
import {
    addRepeatEnquiryNote,
    PUBLIC_SUCCESS_MESSAGE,
} from "@/lib/repeatEnquiry";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const REQUEST_TIMEOUT_MS = 10000;
const MAX_BODY_SIZE = 50000;
const MAX_SELECTED_PROPERTIES = 20;
const INTERESTED_PROPERTIES_SUBFORM = "Interested_Properties";
const PROPERTY_LOOKUP_FIELD = "Property_Name";
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
    message: 32000,
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






/* -------------------------------------------------------------------------- */
/* Rate Limiting                                                              */
/* -------------------------------------------------------------------------- */

const checkRateLimit = createRateLimiter({
    name: "lead3",
    windowMs: 60 * 1000,
    max: 10,
});

/* -------------------------------------------------------------------------- */
/* Zoho Authentication                                                        */
/* -------------------------------------------------------------------------- */



/* -------------------------------------------------------------------------- */
/* City Directory                                                             */
/* -------------------------------------------------------------------------- */





function buildInterestedProperties(selectedProperties) {
    if (!Array.isArray(selectedProperties)) {
        return [];
    }
    const rows = [];

    const seenIds = new Set();
    for (const property of selectedProperties) {
        const id = String(property?.id ?? "").trim();
        if (!id) {
            continue;
        }
        if (!/^\d+$/.test(id)) {
            logger.warn("[SHORTLIST] Invalid CRM Property ID:", id);
            continue;
        }
        if (seenIds.has(id)) {
            continue;
        }
        seenIds.add(id);
        rows.push({
            [PROPERTY_LOOKUP_FIELD]: {
                id,
            },
        });
    }
    return rows;
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
            trigger: [],
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const responseText = await response.text();
    let data = {};
    try {
        data = responseText ? JSON.parse(responseText) : {};
    } catch {
        const error = new Error("Zoho CRM returned an invalid response.");
        error.code = "ZOHO_INVALID_RESPONSE";
        error.httpStatus = 502;
        throw error;
    }

    logger.info("[ZOHO CRM] HTTP STATUS:", response.status);
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
                (item) =>
                    String(item?.code || "")
                        .trim()
                        .toUpperCase() === "DUPLICATE_DATA",
            ));

    if (isDuplicate) {
        logger.info("[ZOHO CRM] Duplicate Lead detected.");
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
            const details = zohoResult?.details || data?.details || {};
            existingLeadId =
                details?.duplicate_record?.id ||
                details?.id ||
                details?.record_id ||
                details?.recordId ||
                details?.module?.id ||
                details?.module?.record_id ||
                null;
        }
        if (!existingLeadId) {
            const error = new Error(
                "Duplicate Lead detected, but the existing Lead could not be identified.",
            );
            error.code = "DUPLICATE_LEAD_ID_NOT_FOUND";
            error.httpStatus = 502;
            error.zohoResponse = data;
            throw error;
        }
        // The visitor is anonymous: never change the existing Lead. The
        // enquiry is added to it as a Note for the team to check.
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
        const error = new Error(zohoMessage || "Zoho CRM rejected the Lead.");
        error.code = zohoCode || "ZOHO_CRM_ERROR";
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
        error.httpStatus = 502;
        throw error;
    }
    const leadId = result?.details?.id || null;
    logger.info("[ZOHO CRM] New Lead created successfully:", leadId);
    return {
        success: true,
        duplicate: false,
        priority: false,
        leadId,
        zohoResponse: data,
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

        logger.info(
            "[ENQUIRY] Request received:",
            JSON.stringify(
                {
                    requestId,
                    hasLocation: Boolean(body?.location),
                    selectedProperties: Array.isArray(body?.selectedProperties)
                        ? body.selectedProperties.length
                        : 0,
                    requirementCity:
                        body?.requirementCity || body?.lastSearchedCity || "",
                    requirementType: body?.requirementType || "",
                },
                null,
                2,
            ),
        );
        const selectedProperties = Array.isArray(body?.selectedProperties)
            ? body.selectedProperties.slice(0, MAX_SELECTED_PROPERTIES)
            : [];
        // The browser sends website property IDs. The CRM record of each
        // property is looked up here, so CRM IDs are never sent to the browser.
        const websiteIds = [
            ...new Set(
                selectedProperties
                    .map((property) => String(property?.id ?? "").trim())
                    .filter((id) => /^\d{1,30}$/.test(id)),
            ),
        ];
        const knownProperties = websiteIds.length
            ? await getPropertiesByIds(websiteIds)
            : [];
        const interestedProperties = buildInterestedProperties(
            knownProperties
                .filter((property) => property?.crmID)
                .map((property) => ({ id: property.crmID })),
        );
        const propertyLines = knownProperties.map((property) => {
            const place = [property.micromarket, property.city]
                .filter(Boolean)
                .join(", ");
            return `- ${normalizeText(property.name) || "Property"}${place ? ` (${normalizeText(place)})` : ""}, website ID ${property.id}${property.crmID ? "" : ", not linked to a CRM property"}`;
        });
        logger.info(
            "[ENQUIRY] Interested properties:",
            interestedProperties.length,
        );
        let firstName = normalizeText(body?.firstName);
        let lastName = normalizeText(body?.lastName);
        if (!firstName && !lastName && body?.name) {
            const fullName = normalizeText(body.name);
            const nameParts = fullName.split(" ");
            firstName = nameParts.shift() || "";
            lastName = nameParts.join(" ") || "";
        }
        const rawEmail = normalizeText(body?.email);
        const email = isValidEmail(rawEmail) ? rawEmail : "";
        const phone = normalizePhone(body?.phone);
        const company = normalizeText(body?.company);
        const message = normalizeText(
            body?.message ||
            body?.Message ||
            body?.Description ||
            body?.description ||
            body?.requirementDetails ||
            body?.Requirement_Details ||
            "",
        );

        const rawRequirementDetails =
            body?.requirementDetails ??
            body?.Requirement_Details ??
            body?.RequirementDetails ??
            message;
        const location = body?.location || {};

        const street = normalizeText(
            body?.Street ||
            body?.street ||
            body?.area ||
            location?.street ||
            location?.Street ||
            location?.area ||
            location?.Area ||
            "",
        );
        const addressCity = normalizeText(
            body?.City ||
            body?.city ||
            body?.addressCity ||
            location?.city ||
            location?.City ||
            location?.town ||
            location?.Town ||
            "",
        );

        const state = normalizeText(
            body?.State ||
            body?.state ||
            body?.Province ||
            body?.province ||
            location?.state ||
            location?.State ||
            location?.province ||
            location?.Province ||
            "",
        );

        const country = normalizeText(
            body?.Country ||
            body?.country ||
            location?.country ||
            location?.Country ||
            "",
        );

        const pincode = normalizeText(
            body?.Zip_Code ||
            body?.Postal_Code ||
            body?.PostalCode ||
            body?.postalCode ||
            body?.pincode ||
            location?.postalCode ||
            location?.PostalCode ||
            location?.postal_code ||
            location?.pincode ||
            location?.Pincode ||
            "",
        );

        const latitude =
            location?.latitude ?? location?.lat ?? body?.latitude ?? "";

        const longitude =
            location?.longitude ??
            location?.lng ??
            location?.lon ??
            body?.longitude ??
            "";

        const detectedLocation = normalizeText(
            location?.displayName ||
            [addressCity, state, country].filter(Boolean).join(", "),
        );
        logger.info("[ENQUIRY] Location received:", {
            requestId,
            hasLocation: Boolean(detectedLocation),
        });

        const rawRequirementCity = normalizeText(
            body?.requirementCity ||
            body?.Requirement_City ||
            body?.lastSearchedCity ||
            body?.last_searched_city ||
            "",
        );
        const requirementCity =
            rawRequirementCity === "__NONE__" ? "" : rawRequirementCity;
        const requirementType = normalizeText(
            body?.requirementType || body?.Requirement_Type || "",
        );
        const requirementDetails = normalizeText(
            body?.requirementDetails || body?.Requirement_Details || message || "",
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

        validateLength(message, MAX_LENGTHS.message, "Message");
        validateLength(
            requirementDetails,
            MAX_LENGTHS.message,
            "Requirement details",
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
        if (selectedProperties.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Please select at least one shortlisted property.",
                    errorCode: "NO_SELECTED_PROPERTIES",
                    requestId,
                },
                {
                    status: 400,
                },
            );
        }

        if (knownProperties.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "The selected properties are no longer available. Please refresh the page and try again.",
                    errorCode: "PROPERTY_NOT_FOUND",
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
                Company: company || "Website Enquiry",
                Lead_Source: "Listing Platform",
                Sublead_Source: "Interested Properties",
                Lead_Status: "Not Contacted",
                Street: street || undefined,
                City: addressCity || undefined,
                State: state || undefined,
                Country: country || undefined,
                Zip_Code: pincode || undefined,
                Requirement_Type: requirementType || undefined,
                Requirement_Details: requirementDetails || undefined,
                [INTERESTED_PROPERTIES_SUBFORM]: interestedProperties.length
                    ? interestedProperties
                    : undefined,
            };

            if (email) {
                recordData.Email = email;
            }

            if (requirementCityId) {
                recordData.Requirement_City = {
                    id: requirementCityId,
                };
            }

            const descriptionParts = [
                `Properties enquired about:\n${propertyLines.join("\n")}`,
            ];

            if (requirementCity) {
                descriptionParts.push(
                    `Last searched property city: ${requirementCity}`,
                );
            }
            if (requirementType) {
                descriptionParts.push(`Requirement type: ${requirementType}`);
            }
            if (street) {
                descriptionParts.push(`Current location address: ${street}`);
            }
            if (addressCity) {
                descriptionParts.push(`Current location city: ${addressCity}`);
            }
            if (state) {
                descriptionParts.push(`Current location state: ${state}`);
            }
            if (country) {
                descriptionParts.push(`Current location country: ${country}`);
            }
            if (pincode) {
                descriptionParts.push(`Current location pincode: ${pincode}`);
            }
            if (latitude !== "" && latitude !== null && latitude !== undefined) {
                descriptionParts.push(`Current latitude: ${latitude}`);
            }
            if (longitude !== "" && longitude !== null && longitude !== undefined) {
                descriptionParts.push(`Current longitude: ${longitude}`);
            }
            if (message) {
                descriptionParts.push(`Customer message: ${message}`);
            }
            if (descriptionParts.length > 0) {
                recordData.Description = descriptionParts.join("\n");
            }
            Object.keys(recordData).forEach((key) => {
                const value = recordData[key];
                if (value === undefined || value === null || value === "") {
                    delete recordData[key];
                }
            });

            const result = await createLeadInCRM(currentToken, recordData);
            return {
                ...result,
                requirementCity,
                requirementCityId,
                requirementType,
                currentLocation: {
                    street,
                    city: addressCity,
                    state,
                    country,
                    pincode,
                },

                leadOwnerTeam,

                interestedPropertiesCount: interestedProperties.length,
            };
        };

        try {
            // The same reply for new and repeat enquiries: it must not
            // reveal whether this person is already in the CRM.
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
                logger.warn("[ZOHO AUTH] Access token expired. Refreshing once...");
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
            message: error?.message || "Unknown error",
            status: error?.httpStatus || 500,
            zohoResponse: error?.zohoResponse || null,
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

        const httpStatus = Number(error?.httpStatus);
        return NextResponse.json(
            {
                success: false,
                message:
                    "Something went wrong while creating the lead. Please try again.",
                errorCode: "REQUEST_FAILED",
                requestId,
            },
            {
                status: httpStatus >= 400 && httpStatus < 600 ? httpStatus : 500,
            },
        );
    }
}