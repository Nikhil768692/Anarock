import { test } from "node:test";
import assert from "node:assert/strict";
import { PHONE_COUNTRIES, phoneDigitsError, isValidEmailAddress } from "@/lib/phoneCountries";
import { isValidPhone, mapLocationToLeadOwnerTeam, normalizePhone } from "@/lib/leadCommon";

const india = PHONE_COUNTRIES.find((country) => country.code === "IN");
const uae = PHONE_COUNTRIES.find((country) => country.code === "AE");

test("phone numbers are checked per country", () => {
  assert.equal(phoneDigitsError("9876543210", india), "");
  assert.notEqual(phoneDigitsError("1234567890", india), "");
  assert.notEqual(phoneDigitsError("98765", india), "");
  assert.equal(phoneDigitsError("501234567", uae), "");
  assert.equal(isValidPhone(normalizePhone("+91 98765-43210")), true);
  assert.equal(isValidPhone("12"), false);
});

test("email addresses are checked", () => {
  assert.equal(isValidEmailAddress("name@company.com"), true);
  assert.equal(isValidEmailAddress("name@company"), false);
});

test("leads go to the right owner team", () => {
  assert.equal(mapLocationToLeadOwnerTeam("Bangalore", ""), "Bengaluru");
  assert.equal(mapLocationToLeadOwnerTeam("Thane", "Maharashtra"), "West");
  assert.equal(mapLocationToLeadOwnerTeam("Gurugram", ""), "North");
  assert.equal(mapLocationToLeadOwnerTeam("", ""), "Platform");
});
