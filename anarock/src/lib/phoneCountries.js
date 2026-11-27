// Country codes offered on the phone fields of every form, with the number of
// digits a local number has (without the country code).
export const PHONE_COUNTRIES = [
  { name: "India", code: "IN", dial: "+91", flag: "🇮🇳", min: 10, max: 10 },
  {
    name: "United States",
    code: "US",
    dial: "+1",
    flag: "🇺🇸",
    min: 10,
    max: 10,
  },
  { name: "Canada", code: "CA", dial: "+1", flag: "🇨🇦", min: 10, max: 10 },
  {
    name: "United Kingdom",
    code: "GB",
    dial: "+44",
    flag: "🇬🇧",
    min: 10,
    max: 10,
  },
  {
    name: "United Arab Emirates",
    code: "AE",
    dial: "+971",
    flag: "🇦🇪",
    min: 9,
    max: 9,
  },
  { name: "Australia", code: "AU", dial: "+61", flag: "🇦🇺", min: 9, max: 9 },
  { name: "Singapore", code: "SG", dial: "+65", flag: "🇸🇬", min: 8, max: 8 },
  { name: "Germany", code: "DE", dial: "+49", flag: "🇩🇪", min: 10, max: 11 },
  { name: "France", code: "FR", dial: "+33", flag: "🇫🇷", min: 9, max: 9 },
  { name: "Italy", code: "IT", dial: "+39", flag: "🇮🇹", min: 9, max: 10 },
  { name: "Spain", code: "ES", dial: "+34", flag: "🇪🇸", min: 9, max: 9 },
  { name: "Netherlands", code: "NL", dial: "+31", flag: "🇳🇱", min: 9, max: 9 },
  { name: "Switzerland", code: "CH", dial: "+41", flag: "🇨🇭", min: 9, max: 9 },
  { name: "Ireland", code: "IE", dial: "+353", flag: "🇮🇪", min: 9, max: 9 },
  { name: "New Zealand", code: "NZ", dial: "+64", flag: "🇳🇿", min: 8, max: 10 },
  { name: "Japan", code: "JP", dial: "+81", flag: "🇯🇵", min: 10, max: 10 },
  { name: "South Korea", code: "KR", dial: "+82", flag: "🇰🇷", min: 9, max: 10 },
  { name: "China", code: "CN", dial: "+86", flag: "🇨🇳", min: 11, max: 11 },
  { name: "Hong Kong", code: "HK", dial: "+852", flag: "🇭🇰", min: 8, max: 8 },
  { name: "Malaysia", code: "MY", dial: "+60", flag: "🇲🇾", min: 9, max: 10 },
  { name: "Thailand", code: "TH", dial: "+66", flag: "🇹🇭", min: 9, max: 9 },
  { name: "Israel", code: "IL", dial: "+972", flag: "🇮🇱", min: 9, max: 9 },
  { name: "Indonesia", code: "ID", dial: "+62", flag: "🇮🇩", min: 9, max: 12 },
  {
    name: "Philippines",
    code: "PH",
    dial: "+63",
    flag: "🇵🇭",
    min: 10,
    max: 10,
  },
  { name: "Vietnam", code: "VN", dial: "+84", flag: "🇻🇳", min: 9, max: 10 },
  { name: "South Africa", code: "ZA", dial: "+27", flag: "🇿🇦", min: 9, max: 9 },
  {
    name: "Saudi Arabia",
    code: "SA",
    dial: "+966",
    flag: "🇸🇦",
    min: 9,
    max: 9,
  },
  { name: "Qatar", code: "QA", dial: "+974", flag: "🇶🇦", min: 8, max: 8 },
  { name: "Kuwait", code: "KW", dial: "+965", flag: "🇰🇼", min: 8, max: 8 },
  { name: "Oman", code: "OM", dial: "+968", flag: "🇴🇲", min: 8, max: 8 },
  { name: "Bahrain", code: "BH", dial: "+973", flag: "🇧🇭", min: 8, max: 8 },
  { name: "Pakistan", code: "PK", dial: "+92", flag: "🇵🇰", min: 10, max: 10 },
  {
    name: "Bangladesh",
    code: "BD",
    dial: "+880",
    flag: "🇧🇩",
    min: 10,
    max: 10,
  },
  { name: "Nepal", code: "NP", dial: "+977", flag: "🇳🇵", min: 10, max: 10 },
  { name: "Sri Lanka", code: "LK", dial: "+94", flag: "🇱🇰", min: 9, max: 9 },
  { name: "Russia", code: "RU", dial: "+7", flag: "🇷🇺", min: 10, max: 10 },
  { name: "Brazil", code: "BR", dial: "+55", flag: "🇧🇷", min: 10, max: 11 },
  { name: "Mexico", code: "MX", dial: "+52", flag: "🇲🇽", min: 10, max: 10 },
  { name: "Argentina", code: "AR", dial: "+54", flag: "🇦🇷", min: 10, max: 11 },
  { name: "Turkey", code: "TR", dial: "+90", flag: "🇹🇷", min: 10, max: 10 },
];

// Checks the local digits for the chosen country. Returns "" when valid,
// otherwise a message to show next to the field.
export function phoneDigitsError(digits, country) {
  const value = String(digits || "").replace(/\D/g, "");
  if (!value) return "Please enter your phone number.";
  if (country?.code === "IN") {
    return /^[6-9]\d{9}$/.test(value)
      ? ""
      : "Enter a valid 10-digit mobile number.";
  }
  if (value.length < country.min || value.length > country.max) {
    return country.min === country.max
      ? `Enter a ${country.min}-digit ${country.name} phone number.`
      : `Enter a ${country.min} to ${country.max}-digit ${country.name} phone number.`;
  }
  return "";
}

export function isValidEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());
}
