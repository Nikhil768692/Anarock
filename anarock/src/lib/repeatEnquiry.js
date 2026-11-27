import { logger } from "@/lib/logger";
// A public form submission that matches an existing CRM Lead must never change
// that Lead: the sender is anonymous and may not be the person on record.
// The enquiry is attached to the Lead as a Note instead, so a person can check
// it before editing anything. The reply to the visitor never reveals the match.
//
// The Zoho refresh token needs the ZohoCRM.modules.notes.CREATE scope (or a
// wider scope that includes it).

export const PUBLIC_SUCCESS_MESSAGE =
  "Thank you. Your enquiry has been received.";

const NOTE_TITLE = "Repeat website enquiry (not verified)";
const MAX_FIELD_LENGTH = 1000;
const MAX_NOTE_LENGTH = 5000;
const DUPLICATE_CODES = new Set(["DUPLICATE_DATA", "DUPLICATE"]);

const FIELDS = [
  ["First_Name", "First name"],
  ["Last_Name", "Last name"],
  ["Mobile", "Mobile"],
  ["Phone", "Phone"],
  ["Email", "Email"],
  ["Company", "Company"],
  ["Street", "Street"],
  ["City", "City"],
  ["State", "State"],
  ["Country", "Country"],
  ["Zip_Code", "PIN code"],
  ["Requirement_Type", "Requirement type"],
  ["Requirement_Area", "Required area"],
  ["Requirement_Rent", "Rent budget"],
  ["Requirement_Seats", "Seats"],
  ["Requirement_Seat_Price", "Price per seat"],
  ["Requirement_Details", "Requirement details"],
  ["Description", "Description"],
];

const MULTILINE_FIELDS = new Set(["Requirement_Details", "Description"]);

function oneLine(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, " ")
    .trim()
    .slice(0, MAX_FIELD_LENGTH);
}

// Extra lines are indented, so typed text cannot pretend to be another field.
function fieldText(key, value) {
  if (value && typeof value === "object") {
    value = value.name ?? value.id ?? "";
  }

  if (!MULTILINE_FIELDS.has(key)) return oneLine(value);

  return String(value ?? "")
    .slice(0, MAX_FIELD_LENGTH)
    .split(/[\r\n\u2028\u2029]+/)
    .map(oneLine)
    .filter(Boolean)
    .join("\n    | ");
}

export function buildRepeatEnquiryNote(recordData, source) {
  const lines = [
    "Sent through the public website. The sender has NOT been verified.",
    "Confirm with the contact already on record before changing this Lead.",
    "",
    `Form: ${oneLine(source) || "Website"}`,
    `Received: ${new Date().toISOString()}`,
  ];

  for (const [key, label] of FIELDS) {
    const value = fieldText(key, recordData?.[key]);
    if (value) lines.push(`${label}: ${value}`);
  }

  const rows = recordData?.Interested_Properties;
  const propertyIds = (Array.isArray(rows) ? rows : [])
    .flatMap((row) =>
      Object.values(row || {}).map((item) =>
        String(item && typeof item === "object" ? item.id : item),
      ),
    )
    .filter((id) => /^\d+$/.test(id))
    .slice(0, 50);

  if (propertyIds.length) {
    lines.push(`Interested property IDs: ${propertyIds.join(", ")}`);
  }

  return lines.join("\n").slice(0, MAX_NOTE_LENGTH);
}

export function isDuplicateError(error) {
  const isCode = (code) =>
    DUPLICATE_CODES.has(String(code || "").trim().toUpperCase());

  return (
    isCode(error?.code) ||
    Boolean(error?.zohoResponse?.data?.some?.((item) => isCode(item?.code)))
  );
}

export function findDuplicateLeadId(zohoResponse) {
  const result = zohoResponse?.data?.[0] ?? {};
  const details = result.details ?? zohoResponse?.details ?? {};
  const nested = Array.isArray(details.errors)
    ? details.errors.find((item) => item?.details?.duplicate_record?.id)
    : null;

  const id =
    details.duplicate_record?.id ??
    nested?.details?.duplicate_record?.id ??
    details.id ??
    null;

  return id === null ? null : String(id);
}

function failure(code) {
  const error = new Error("Unable to record the enquiry.");
  error.code = code;
  error.httpStatus = 502;
  return error;
}

// Adds the enquiry to the existing Lead as a Note. Never updates the Lead.
// Throws ZOHO_ACCESS_TOKEN_EXPIRED when the caller should refresh and retry.
export async function addRepeatEnquiryNote({
  apiDomain,
  accessToken,
  leadId,
  recordData,
  source,
  timeoutMs = 10_000,
}) {
  const id = String(leadId ?? "");

  if (!/^\d+$/.test(id)) {
    throw failure("DUPLICATE_LEAD_ID_NOT_FOUND");
  }

  const response = await fetch(`${apiDomain}/crm/v8/Notes`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [
        {
          Parent_Id: { module: { api_name: "Leads" }, id },
          Note_Title: NOTE_TITLE,
          Note_Content: buildRepeatEnquiryNote(recordData, source),
        },
      ],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });

  const data = await response.json().catch(() => ({}));
  const result = data?.data?.[0];
  const code = String(result?.code || data?.code || "").toUpperCase();

  // Zoho also answers 401 when the token lacks the Notes permission.
  // Only an expired or invalid token is worth a retry.
  if (response.status === 401 && code !== "OAUTH_SCOPE_MISMATCH") {
    throw failure("ZOHO_ACCESS_TOKEN_EXPIRED");
  }

  if (!response.ok || result?.status !== "success") {
    logger.error("[Repeat enquiry] Note not saved:", code || response.status);
    throw failure("REPEAT_NOTE_FAILED");
  }

  return { noteId: result?.details?.id || null };
}
