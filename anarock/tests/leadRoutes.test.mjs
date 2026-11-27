// The public lead forms must never change an existing CRM Lead, and must give
// the same answer whether or not the visitor is already in the CRM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { json, makeRequest, mockFetch } from "./helpers.mjs";

process.env.ZOHO_CLIENT_ID = "id";
process.env.ZOHO_CLIENT_SECRET = "secret";
process.env.ZOHO_REFRESH_TOKEN = "refresh";

const { POST: leads } = await import("@/app/api/leads/route");
const { POST: lead2 } = await import("@/app/api/lead2/route");

function fakeCrm(t, { duplicate }) {
  return mockFetch(t, (url, init) => {
    if (url.includes("/oauth/v2/token")) {
      return json({ access_token: "token", api_domain: "https://crm.example", expires_in: 3600 });
    }
    if (url.includes("/crm/v8/City")) return json({ data: [] });
    if (url.endsWith("/crm/v8/Leads") && init.method === "POST") {
      return duplicate
        ? json({ data: [{ code: "DUPLICATE_DATA", status: "error", details: { duplicate_record: { id: "555" } } }] }, 400)
        : json({ data: [{ code: "SUCCESS", status: "success", details: { id: "777" } }] }, 201);
    }
    if (url.endsWith("/crm/v8/Notes")) {
      return json({ data: [{ status: "success", details: { id: "888" } }] }, 201);
    }
    return undefined;
  });
}

const form = (extra = {}) => ({
  firstName: "Test",
  lastName: "Person",
  phone: "+919876543210",
  fullPhone: "+919876543210",
  formFillMs: 5000,
  website: "",
  ...extra,
});

let ip = 0;
const request = (body) => makeRequest(body, { "x-forwarded-for": `10.0.0.${++ip}` });

for (const [name, handler] of [["/api/leads", leads], ["/api/lead2", lead2]]) {
  test(`${name}: a repeat enquiry becomes a Note and the reply does not reveal it`, async (t) => {
    const newCalls = fakeCrm(t, { duplicate: false });
    const fresh = await (await handler(request(form()))).json();

    const repeatCalls = fakeCrm(t, { duplicate: true });
    const repeat = await (await handler(request(form()))).json();

    assert.equal(fresh.success, true);
    assert.equal(repeat.success, true);
    assert.equal(fresh.message, repeat.message);
    assert.equal(repeat.leadId, undefined);
    assert.equal(repeat.duplicate, undefined);

    assert.ok(!repeatCalls.some((call) => call.init.method === "PUT"), "no Lead update");
    assert.ok(repeatCalls.some((call) => call.url.endsWith("/crm/v8/Notes")), "Note added");
    assert.ok(!newCalls.some((call) => call.url.endsWith("/crm/v8/Notes")));
  });

  test(`${name}: a bot filling the hidden field gets a reply but nothing is sent to the CRM`, async (t) => {
    const calls = fakeCrm(t, { duplicate: false });
    const result = await (await handler(request(form({ website: "spam" })))).json();
    assert.equal(result.success, true);
    assert.equal(calls.length, 0);
  });
}
