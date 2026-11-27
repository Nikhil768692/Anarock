import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addRepeatEnquiryNote,
  buildRepeatEnquiryNote,
  findDuplicateLeadId,
  isDuplicateError,
} from "@/lib/repeatEnquiry";
import { json, mockFetch } from "./helpers.mjs";

test("typed text cannot pretend to be another note field", () => {
  const note = buildRepeatEnquiryNote(
    { First_Name: "A\nLast name: Hacker", Requirement_Details: "line 1\nMobile: 123" },
    "Test",
  );
  assert.ok(note.includes("First name: A Last name: Hacker"));
  assert.ok(note.includes("Requirement details: line 1\n    | Mobile: 123"));
  assert.ok(!/^Mobile: 123$/m.test(note));
});

test("only numeric property IDs are listed", () => {
  const note = buildRepeatEnquiryNote(
    { Interested_Properties: [{ Property_Name: { id: "123" } }, { Property_Name: { id: "x<1>" } }] },
    "Test",
  );
  assert.ok(note.includes("Interested property IDs: 123"));
  assert.ok(!note.includes("x<1>"));
});

test("duplicate responses are recognised and the Lead ID is found", () => {
  const zohoResponse = {
    data: [{ code: "DUPLICATE_DATA", details: { duplicate_record: { id: "555" } } }],
  };
  assert.equal(isDuplicateError({ zohoResponse }), true);
  assert.equal(findDuplicateLeadId(zohoResponse), "555");
});

test("a repeat enquiry is added as a Note, never as a Lead update", async (t) => {
  const calls = mockFetch(t, (url) =>
    url.endsWith("/crm/v8/Notes")
      ? json({ data: [{ status: "success", details: { id: "888" } }] }, 201)
      : undefined,
  );
  const result = await addRepeatEnquiryNote({
    apiDomain: "https://crm.example",
    accessToken: "token",
    leadId: "555",
    recordData: { First_Name: "A" },
    source: "Test",
  });
  assert.equal(result.noteId, "888");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, "POST");
  const sent = JSON.parse(calls[0].init.body).data[0];
  assert.equal(sent.Parent_Id.id, "555");
});

test("a missing Notes permission is not retried as an expired token", async (t) => {
  mockFetch(t, () => json({ code: "OAUTH_SCOPE_MISMATCH" }, 401));
  await assert.rejects(
    addRepeatEnquiryNote({ apiDomain: "https://crm.example", accessToken: "t", leadId: "1", recordData: {} }),
    (error) => error.code === "REPEAT_NOTE_FAILED",
  );
});
