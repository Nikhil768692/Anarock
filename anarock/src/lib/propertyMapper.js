const clean = (value) => {
  if (value === null || value === undefined) return "";
  return value;
};

const num = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const folderPath = (value) => {
  if (!value || typeof value !== "string") return "";

  let folder = String(value).trim();

  if (folder && !folder.endsWith("/")) {
    folder += "/";
  }

  return folder;
};

// The data is typed in by hand, so a few values are tidied here:
// "LEASE", "lease " and "Lease" all become "Lease", and a distance typed as
// a bare number ("2.5") is shown in kilometres ("2.5 km").
const AVAILABILITY_TYPES = new Map([
  ["lease", "Lease"],
  ["rent", "Lease"],
  ["sale", "Sale"],
  ["outright", "Sale"],
  ["lease or sale", "Lease or Sale"],
  ["lease/sale", "Lease or Sale"],
  ["lease & sale", "Lease or Sale"],
  ["lease and sale", "Lease or Sale"],
  ["both", "Lease or Sale"],
]);

function availabilityType(value) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  return AVAILABILITY_TYPES.get(text.toLowerCase()) || text;
}

function distance(value) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  if (/^\d+(\.\d+)?$/.test(text)) return `${text} km`;
  return text;
}

// Catalyst column that holds the Zoho CRM record ID of the property. It is used
// only on the server (to link enquiries to the CRM record) and never sent to
// the browser. Set CATALYST_CRM_ID_COLUMN if the column has another name.
const CRM_ID_COLUMNS = [
  process.env.CATALYST_CRM_ID_COLUMN,
  "crmID",
  "CRMPropertyId",
  "CRMPropertyID",
  "CRM_Property_ID",
  "CRMID",
  "CRM_ID",
  "ZohoPropertyId",
  "ZohoPropertyID",
].filter(Boolean);

// CRM IDs have 19 digits, more than a JavaScript number holds exactly, so
// only text values (as the Data Store sends them) or exact numbers are used.
function crmIdOf(row) {
  for (const column of CRM_ID_COLUMNS) {
    const raw = row?.[column];
    if (typeof raw === "number" && !Number.isSafeInteger(raw)) continue;
    const value = String(raw ?? "").trim();
    if (/^\d+$/.test(value)) return value;
  }
  return "";
}

export function mapProperty(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const folder = folderPath(row.ImageFolderPath);

  return {
    id: String(row.ROWID || ""),
    rowId: String(row.ROWID || ""),
    crmID: crmIdOf(row),
    slug: clean(row.PropertyName),
    availabilityType: availabilityType(row.AvailabilityType),
    type: clean(row.OfficeType),
    officeType: clean(row.OfficeType),
    name: clean(row.PropertyName),
    city: clean(row.City),
    state: clean(row.StateOfHandover),
    area: clean(row.Micromarket),
    micromarket: clean(row.Micromarket),
    address: clean(row.Address),
    location: clean(row.Location),
    latitude: num(row.Latitude),
    longitude: num(row.Longitude),
    distanceFromMetro: distance(row.DistanceFromMetro),
    distanceFromAirport: distance(row.DistanceFromAirport),
    ImageFolderPath: folder,
    buildingType: clean(row.BuildingType),
    buildingName: clean(row.BuildingName),
    techPark: clean(row.TechPark),
    buildingStructure: clean(row.BuildingStructure),
    ownershipStructure: clean(row.OwnershipStructure),
    developer: clean(row.Developer),
    floor: clean(row.Floor),
    proposedFloor: clean(row.ProposedFloor),
    unitNumber: clean(row.UnitNumber),
    floorPlate: clean(row.FloorPlate),
    estYearOfCompletion: clean(row.EstYearOfCompletion),
    availability: clean(row.Availability),
    availabilityDate: clean(row.AvailabilityDate),
    projectStatus: clean(row.ProjectStatus),
    handoverTimelines: clean(row.HandoverTimelines),
    occupancyCertificate: clean(row.OccupancyCertificate),
    areaSqft: num(row.OfferedSuperArea),
    offeredSuperArea: num(row.OfferedSuperArea),
    builtupArea: num(row.BuiltupArea),
    carpetArea: num(row.CarpetArea),
    totalLeasableAreaAvailable: num(row.TotalLeasableAreaAvailable),
    centerArea: num(row.CenterArea),
    totalDevelopmentSize: num(row.TotalDevelopmentSize),
    quotedRent: num(row.QuotedRent),
    achievableRent: num(row.AchievableRent),
    quotedSalePrice: num(row.QuotedSalePrice),
    quotedEfficiency: num(row.QuotedEfficiency),
    quotedCAM: clean(row.QuotedCAM),
    rentOptions: clean(row.RentOptions),
    escalation: clean(row.Escalation),
    escalationInterval: clean(row.EscalationInterval),
    parking: clean(row.ParkingRatio),
    parkingRatio: clean(row.ParkingRatio),
    additionalParkingCost: clean(row.AdditionalParkingCost),
    monthlyCarParkingCharges: num(row.MonthlyCarParkingCharges),
    NoOfSeatsOffered: num(row.NoOfSeatsOffered),
    centerSeatingCapacity: num(row.CenterSeatingCapacity),
    operator: clean(row.Operator),
    operatorName: clean(row.OperatorName),
    offeredSpace: clean(row.OfferedSpace),
    configuration: clean(row.Configuration),
    sizePerWorkstation: clean(row.SizePerWorkstation),
    monthlyCostPerSeat: num(row.MonthlyCostPerSeat),
    oneTimeSetupCost: num(row.OneTimeSetupCost),
    costOfModifications: clean(row.CostOfModifications),
    noOfCreditsProvided: num(row.NoOfCreditsProvided),
    standardOperatingHours: clean(row.StandardOperatingHours),
    chargesForMeeting: num(row.ChargesForMeeting),
    inclusions: clean(row.Inclusions),
    exclusions: clean(row.Exclusions),
    powerBackup: clean(row.PowerBackup),
    hvacSystem: clean(row.HVACSystem),
    elevators: clean(row.Elevators),
    buildingCertifications: clean(row.BuildingCertifications),
    lockinPeriod: clean(row.LockinPeriod),
    securityDeposit: clean(row.SecurityDeposit),
    noticePeriodForTermination: clean(row.NoticePeriodForTermination),
    tenantProfile: clean(row.TenantProfile),
    term: clean(row.Term),
    projectHighlights: clean(row.ProjectHighlights),
    centerHighlights: clean(row.CenterHighlights),
    aiAttributes: clean(row.AIAttributes),
  };
}

// Fields the website shows. Only these leave the server: internal and
// negotiation fields (achievable rent, deposit, escalation, lock-in, exact
// coordinates, CRM IDs and so on) stay in the server cache.
// Add a field here only when a page needs it and the business agrees it is public.
export const PUBLIC_PROPERTY_FIELDS = [
  "id",
  "rowId",
  "slug",
  "name",
  "type",
  "officeType",
  "city",
  "micromarket",
  "address",
  "ImageFolderPath",
  "developer",
  "operator",
  "operatorName",
  "floor",
  "availability",
  "buildingStructure",
  "buildingCertifications",
  "estYearOfCompletion",
  "distanceFromMetro",
  "distanceFromAirport",
  "totalLeasableAreaAvailable",
  "quotedRent",
  "monthlyCostPerSeat",
  "NoOfSeatsOffered",
  "inclusions",
  "exclusions",
  "aiAttributes",
];

export function toPublicProperty(property) {
  if (!property || typeof property !== "object") return null;

  const result = {};
  for (const field of PUBLIC_PROPERTY_FIELDS) {
    if (property[field] !== undefined) result[field] = property[field];
  }
  return result;
}

export function toPublicProperties(properties) {
  return (Array.isArray(properties) ? properties : [])
    .map(toPublicProperty)
    .filter(Boolean);
}
