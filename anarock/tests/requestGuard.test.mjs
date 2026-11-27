import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createRateLimiter,
  getClientIp,
  isCrossSiteRequest,
  readJsonBody,
} from "@/lib/requestGuard";
import { makeRequest } from "./helpers.mjs";

test("the client IP is the last address added by the proxy", () => {
  const request = makeRequest({}, { "x-forwarded-for": "6.6.6.6, 1.2.3.4" });
  assert.equal(getClientIp(request), "1.2.3.4");
});

test("the in-memory rate limit blocks after the maximum", async () => {
  const check = createRateLimiter({ name: `test-${Date.now()}`, windowMs: 60_000, max: 2 });
  const request = () => makeRequest({}, { "x-forwarded-for": "9.9.9.9" });
  assert.equal((await check(request())).allowed, true);
  assert.equal((await check(request())).allowed, true);
  const third = await check(request());
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfter >= 1);
});

test("cross-site requests are recognised", () => {
  assert.equal(isCrossSiteRequest(makeRequest({}, { origin: "http://localhost:3000" })), false);
  assert.equal(isCrossSiteRequest(makeRequest({}, { origin: "https://other.example" })), true);
  assert.equal(isCrossSiteRequest(makeRequest({}, { "sec-fetch-site": "cross-site" })), true);
  assert.equal(isCrossSiteRequest(makeRequest({})), false);
});

test("JSON bodies are size-limited and must be objects", async () => {
  assert.equal((await readJsonBody(makeRequest({ a: 1 }))).ok, true);
  assert.equal((await readJsonBody(makeRequest("[1,2]"))).status, 400);
  assert.equal((await readJsonBody(makeRequest({ a: "x".repeat(200) }), 50)).status, 413);
  const wrongType = makeRequest({ a: 1 }, { "content-type": "text/plain" });
  assert.equal((await readJsonBody(wrongType)).status, 415);
});
