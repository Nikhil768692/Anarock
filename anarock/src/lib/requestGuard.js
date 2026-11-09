// Shared helpers that protect public API routes:
// a client IP that cannot be faked, simple rate limiting and safe JSON parsing.

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

// Fixed-window rate limiter kept in server memory.
// Each server instance keeps its own count, so the API Gateway throttle
// remains the main protection when several instances run.
export function createRateLimiter({ name, windowMs, max }) {
  const storeKey = `__ANAROCK_RATE_LIMIT_${name}`;
  const store = globalThis[storeKey] || new Map();
  globalThis[storeKey] = store;

  return function checkRateLimit(request) {
    const identifier = getClientIp(request);
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
      return { allowed: true, retryAfter: 0 };
    }

    if (existing.count >= max) {
      const retryAfter = Math.max(
        1,
        Math.ceil((windowMs - (now - existing.windowStart)) / 1000),
      );
      return { allowed: false, retryAfter };
    }

    existing.count += 1;
    return { allowed: true, retryAfter: 0 };
  };
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