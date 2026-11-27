// Bot checks for the public forms. Every form sends three extra fields:
//   website        – a hidden "honeypot" input. People never see it, so it is
//                    always empty; simple bots fill it in.
//   formFillMs     – how long the form was open before it was sent, measured
//                    in the browser (so a wrong visitor clock does not matter).
//                    A person needs a few seconds to fill a form; a script does not.
//   turnstileToken – the Cloudflare Turnstile answer. Checked only when
//                    TURNSTILE_SECRET_KEY is set on the server (and
//                    NEXT_PUBLIC_TURNSTILE_SITE_KEY in the browser build).
import { getClientIp, isCrossSiteRequest } from "@/lib/requestGuard";
import { logger } from "@/lib/logger";

export const MIN_FILL_TIME_MS = 2500;
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TIMEOUT_MS = 8000;

export const FORM_GUARD_FIELDS = ["website", "formFillMs", "turnstileToken"];

export function isTurnstileEnabled() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

async function verifyTurnstile(token, request) {
  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token,
  });
  const ip = getClientIp(request);
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Turnstile answered ${response.status}`);
  }

  return data?.success === true;
}

// Returns one of:
//   { ok: true }
//   { ok: false, silent: true }               → bot: answer as if it worked
//   { ok: false, status, code, message }      → tell the visitor what to do
export async function checkFormSubmission(request, body) {
  if (isCrossSiteRequest(request)) {
    return {
      ok: false,
      status: 403,
      code: "CROSS_SITE_REQUEST",
      message: "This form can only be sent from our website.",
    };
  }

  const honeypot = body?.website;
  if (typeof honeypot === "string" ? honeypot.trim() : honeypot) {
    logger.warn("[Form protection] Dropped: hidden field was filled.");
    return { ok: false, silent: true };
  }

  const elapsed = Number(body?.formFillMs);

  if (!Number.isFinite(elapsed) || elapsed < 0) {
    return {
      ok: false,
      status: 400,
      code: "FORM_EXPIRED",
      message: "Please refresh the page and try again.",
    };
  }

  if (elapsed < MIN_FILL_TIME_MS) {
    logger.warn(`[Form protection] Dropped: form sent after ${elapsed} ms.`);
    return { ok: false, silent: true };
  }

  if (isTurnstileEnabled()) {
    const token = typeof body?.turnstileToken === "string"
      ? body.turnstileToken.trim()
      : "";

    if (!token || token.length > 2048) {
      return {
        ok: false,
        status: 400,
        code: "SECURITY_CHECK_REQUIRED",
        message: "Please complete the security check and try again.",
      };
    }

    let passed = false;
    try {
      passed = await verifyTurnstile(token, request);
    } catch (error) {
      logger.error("[Form protection] Turnstile check failed:", error?.message);
      return {
        ok: false,
        status: 503,
        code: "SECURITY_CHECK_UNAVAILABLE",
        message: "The security check is not available. Please try again in a minute.",
      };
    }

    if (!passed) {
      return {
        ok: false,
        status: 400,
        code: "SECURITY_CHECK_FAILED",
        message: "The security check did not pass. Please try again.",
      };
    }
  }

  return { ok: true };
}
