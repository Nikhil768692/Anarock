// Creates a Lead in Zoho CRM for every public form (/api/leads, /api/lead2,
// /api/lead3). When the CRM reports the person as a duplicate, the existing
// Lead is never changed: the enquiry is added to it as a Note instead.
import { logger } from "@/lib/logger";
import {
  addRepeatEnquiryNote,
  findDuplicateLeadId,
  isDuplicateError,
} from "@/lib/repeatEnquiry";

const DEFAULT_TIMEOUT_MS = 10_000;

function failure(message, code, httpStatus, zohoResponse) {
  const error = new Error(message);
  error.code = code;
  error.httpStatus = httpStatus;
  if (zohoResponse) error.zohoResponse = zohoResponse;
  return error;
}

// Returns { duplicate: false, leadId } for a new Lead, or { duplicate: true }
// when the enquiry was added as a Note to an existing Lead.
// Throws ZOHO_ACCESS_TOKEN_EXPIRED so the caller can refresh and retry.
//   workflows: run CRM workflow rules for the new Lead (true for callback and
//   requirement forms, false for property enquiries, as before).
export async function createLead({
  tokenInfo,
  recordData,
  workflows = true,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const response = await fetch(`${tokenInfo.apiDomain}/crm/v8/Leads`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${tokenInfo.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [recordData],
      trigger: workflows ? ["workflow"] : [],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw failure("Zoho CRM returned an invalid response.", "ZOHO_INVALID_RESPONSE", 502);
  }

  if (response.status === 401) {
    throw failure("Zoho access token expired.", "ZOHO_ACCESS_TOKEN_EXPIRED", 401);
  }

  const result = data?.data?.[0];
  const code = String(result?.code || data?.code || "").trim().toUpperCase();

  if (isDuplicateError({ code, zohoResponse: data }) ||
    (Array.isArray(result?.details?.errors) &&
      result.details.errors.some((item) => String(item?.code || "").toUpperCase() === "DUPLICATE_DATA"))) {
    const leadId = findDuplicateLeadId(data);
    if (!leadId) {
      throw failure(
        "Duplicate Lead detected, but the existing Lead could not be identified.",
        "DUPLICATE_LEAD_ID_NOT_FOUND",
        502,
        data,
      );
    }

    await addRepeatEnquiryNote({
      apiDomain: tokenInfo.apiDomain,
      accessToken: tokenInfo.accessToken,
      leadId,
      recordData,
      source: recordData?.Sublead_Source,
      timeoutMs,
    });
    logger.info("[CRM] Repeat enquiry added as a Note.");
    return { duplicate: true };
  }

  if (!response.ok || result?.status !== "success") {
    throw failure(
      "Zoho CRM did not create the Lead.",
      code || "ZOHO_LEAD_CREATION_FAILED",
      response.ok ? 502 : response.status >= 400 && response.status < 600 ? response.status : 502,
      data,
    );
  }

  logger.info("[CRM] Lead created.");
  return { duplicate: false, leadId: result?.details?.id || null };
}
