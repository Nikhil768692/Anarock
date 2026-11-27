import { logger } from "@/lib/logger";
// Shared helpers that protect public API routes:
// a client IP that cannot be faked, rate limiting, a cross-site check and safe
// JSON parsing. Bot checks for public forms are in formProtection.js.

// How many proxies in front of the app add their own entry to the end of
// X-Forwarded-For. The client IP is read that many entries from the end, so a
// value the visitor writes at the start of the header is ignored.
// Default 1: the platform proxy appends the real visitor IP as the last entry.
const TRUSTED_PROXY_COUNT = Math.max(
  1,
  Number.parseInt(process.env.TRUSTED_PROXY_COUNT || "1", 10) || 1,
);

const MAX_TRACKED_CLIENTS = 10_000;

export function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const entries = forwardedFor
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (entries.length > 0) {
      const index = Math.max(0, entries.length - TRUSTED_PROXY_COUNT);
      return entries[index].slice(0, 100);
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim().slice(0, 100);
  }

  return "unknown";
}

// Fixed-window rate limiter.
// When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, the count is
// kept in Upstash Redis and shared by every server instance. Otherwise (or if
// Redis cannot be reached) each server instance keeps its own count in memory.
// The returned function is async: always `await checkRateLimit(request)`.
const UPSTASH_URL = String(process.env.UPSTASH_REDIS_REST_URL || "").replace(
  /\/+$/,
  "",
);
const UPSTASH_TOKEN = String(process.env.UPSTASH_REDIS_REST_TOKEN || "");
const SHARED_LIMIT_TIMEOUT_MS = 1500;

async function sharedHit(key, windowMs) {
  // SET ... NX starts the window once; INCR counts; PTTL gives the time left.
  const response = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["SET", key, "0", "PX", String(windowMs), "NX"],
      ["INCR", key],
      ["PTTL", key],
    ]),
    cache: "no-store",
    signal: AbortSignal.timeout(SHARED_LIMIT_TIMEOUT_MS),
  });

  const data = await response.json().catch(() => null);

  if (
    !response.ok ||
    !Array.isArray(data) ||
    data.length !== 3 ||
    data.some((item) => item?.error)
  ) {
    throw new Error("Shared rate limit store did not answer.");
  }

  const count = Number(data[1].result);
  const ttlMs = Number(data[2].result);

  if (!Number.isFinite(count)) {
    throw new Error("Shared rate limit store gave an invalid count.");
  }

  return { count, ttlMs: ttlMs > 0 ? ttlMs : windowMs };
}

export function createRateLimiter({ name, windowMs, max }) {
  const storeKey = `__ANAROCK_RATE_LIMIT_${name}`;
  const store = globalThis[storeKey] || new Map();
  globalThis[storeKey] = store;

  function memoryHit(identifier) {
    const now = Date.now();

    if (store.size > MAX_TRACKED_CLIENTS) {
      for (const [key, value] of store) {
        if (now - value.windowStart >= windowMs) {
          store.delete(key);
        }
      }
    }

    const existing = store.get(identifier);

    if (!existing || now - existing.windowStart >= windowMs) {
      store.set(identifier, { count: 1, windowStart: now });
      return { count: 1, ttlMs: windowMs };
    }

    existing.count += 1;
    return { count: existing.count, ttlMs: windowMs - (now - existing.windowStart) };
  }

  return async function checkRateLimit(request) {
    const identifier = getClientIp(request);
    let hit;

    if (UPSTASH_URL && UPSTASH_TOKEN) {
      try {
        hit = await sharedHit(`anarock:rl:${name}:${identifier}`, windowMs);
      } catch (error) {
        logger.error("[Rate limit] Shared store unavailable:", error?.message);
      }
    }

    hit = hit || memoryHit(identifier);

    if (hit.count > max) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil(hit.ttlMs / 1000)),
      };
    }

    return { allowed: true, retryAfter: 0 };
  };
}

// Rejects browser requests sent from another website. A request without an
// Origin header (for example a server-to-server call) is left to the other checks.
export function isCrossSiteRequest(request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return true;
  }

  const origin = request.headers.get("origin");
  if (!origin) return false;

  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  try {
    return new URL(origin).host !== String(host || "").split(",")[0].trim();
  } catch {
    return true;
  }
}

// Reads a JSON body with a size cap.
// Returns { ok: true, data } or { ok: false, status, message }.
export async function readJsonBody(request, maxBytes = 50_000) {
  const contentType = String(request.headers.get("content-type") || "");

  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, status: 415, message: "Invalid request format." };
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    return { ok: false, status: 413, message: "Request is too large." };
  }

  let text;
  try {
    text = await request.text();
  } catch {
    return { ok: false, status: 400, message: "Invalid request body." };
  }

  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return { ok: false, status: 413, message: "Request is too large." };
  }

  try {
    const data = text ? JSON.parse(text) : {};

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, status: 400, message: "Invalid request body." };
    }

    return { ok: true, data };
  } catch {
    return { ok: false, status: 400, message: "Invalid request body." };
  }
}