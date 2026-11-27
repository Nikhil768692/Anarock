import { test } from "node:test";
import assert from "node:assert/strict";
import { checkFormSubmission, MIN_FILL_TIME_MS } from "@/lib/formProtection";
import { json, makeRequest, mockFetch } from "./helpers.mjs";

const ok = { website: "", formFillMs: MIN_FILL_TIME_MS + 1000 };

test("a normal submission passes", async () => {
  assert.deepEqual(await checkFormSubmission(makeRequest(ok), ok), { ok: true });
});

test("a filled hidden field is dropped silently", async () => {
  const body = { ...ok, website: "http://spam.example" };
  const result = await checkFormSubmission(makeRequest(body), body);
  assert.equal(result.ok, false);
  assert.equal(result.silent, true);
});

test("a form sent too fast is dropped silently", async () => {
  const body = { ...ok, formFillMs: 300 };
  const result = await checkFormSubmission(makeRequest(body), body);
  assert.equal(result.silent, true);
});

test("a request without the fill time is refused with a message", async () => {
  const body = { website: "" };
  const result = await checkFormSubmission(makeRequest(body), body);
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.code, "FORM_EXPIRED");
});

test("a request from another website is refused", async () => {
  const request = makeRequest(ok, { origin: "https://evil.example" });
  const result = await checkFormSubmission(request, ok);
  assert.equal(result.status, 403);
});

test("Turnstile is checked when the secret key is set", async (t) => {
  process.env.TURNSTILE_SECRET_KEY = "secret";
  t.after(() => delete process.env.TURNSTILE_SECRET_KEY);

  const missing = await checkFormSubmission(makeRequest(ok), ok);
  assert.equal(missing.code, "SECURITY_CHECK_REQUIRED");

  let answer = true;
  const calls = mockFetch(t, (url) =>
    url.includes("challenges.cloudflare.com") ? json({ success: answer }) : undefined,
  );

  const body = { ...ok, turnstileToken: "token" };
  assert.deepEqual(await checkFormSubmission(makeRequest(body), body), { ok: true });
  assert.equal(calls.length, 1);

  answer = false;
  const failed = await checkFormSubmission(makeRequest(body), body);
  assert.equal(failed.code, "SECURITY_CHECK_FAILED");
});
