import { test } from "node:test";
import assert from "node:assert/strict";
import { mapProperty, toPublicProperty, PUBLIC_PROPERTY_FIELDS } from "@/lib/propertyMapper";
import { parseAiAttributes } from "@/lib/aiAttributes";

const row = {
  ROWID: "101",
  PropertyName: "Tower A",
  City: "Pune",
  AchievableRent: 90,
  SecurityDeposit: "6 months",
  Latitude: 18.5,
  Longitude: 73.8,
  CRMPropertyId: "900001",
  QuotedRent: 100,
};

test("the CRM property ID is read but never made public", () => {
  const property = mapProperty(row);
  assert.equal(property.crmID, "900001");
  assert.equal(toPublicProperty(property).crmID, undefined);
});

test("negotiation and location fields stay on the server", () => {
  const publicProperty = toPublicProperty(mapProperty(row));
  for (const field of ["achievableRent", "securityDeposit", "latitude", "longitude"]) {
    assert.equal(publicProperty[field], undefined, field);
  }
  assert.equal(publicProperty.quotedRent, 100);
  assert.ok(Object.keys(publicProperty).every((key) => PUBLIC_PROPERTY_FIELDS.includes(key)));
});

test("AI attributes are read from JSON or text", () => {
  const fromJson = parseAiAttributes('{"summary":"Bright offices.","amenities":["Gym","Cafe"],"<b>x</b>":1}');
  assert.equal(fromJson.description, "Bright offices.");
  assert.deepEqual(fromJson.items[0], { label: "Amenities", value: "Gym, Cafe" });

  const fromText = parseAiAttributes("Close to metro.\n- 24x7 power\n- Parking");
  assert.equal(fromText.description, "Close to metro.");
  assert.equal(fromText.items.length, 2);

  assert.equal(parseAiAttributes(""), null);
  assert.equal(parseAiAttributes(null), null);
});

test("availability types and distances are tidied", () => {
  const property = mapProperty({ ROWID: "1", AvailabilityType: " LEASE ", DistanceFromMetro: "2.5", DistanceFromAirport: "12 km" });
  assert.equal(property.availabilityType, "Lease");
  assert.equal(property.distanceFromMetro, "2.5 km");
  assert.equal(property.distanceFromAirport, "12 km");
});

test("the crmID column is read as text and never as a rounded number", () => {
  assert.equal(mapProperty({ ROWID: "1", crmID: "1164552000000579310" }).crmID, "1164552000000579310");
  assert.equal(mapProperty({ ROWID: "1", crmID: 1164552000000579310 }).crmID, "");
});
