// The visitor's location is requested only when the visitor asks for it,
// from the location button in the header. Nothing here runs on its own.

export const LOCATION_KEY = "anarock_user_location";
export const LOCATION_EVENT = "anarock-location-updated";

export function readStoredLocation() {
  try {
    const saved = JSON.parse(
      window.sessionStorage.getItem(LOCATION_KEY) || "null",
    );
    return saved && typeof saved === "object" ? saved : null;
  } catch {
    return null;
  }
}

export function clearStoredLocation() {
  try {
    window.sessionStorage.removeItem(LOCATION_KEY);
  } catch {
    // Storage can be unavailable (for example in some private windows).
  }
  window.dispatchEvent(new Event(LOCATION_EVENT));
}

function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 300000,
    });
  });
}

// Three decimals is roughly 100 metres: enough to find the area and PIN code.
const round = (value) => Math.round(value * 1000) / 1000;

// Call only from a click on a control that explains how the location is used.
export async function requestUserLocation() {
  const { coords } = await currentPosition();

  const response = await fetch("/api/location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      latitude: round(coords.latitude),
      longitude: round(coords.longitude),
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.success || !data?.location) {
    throw new Error("Location lookup failed.");
  }

  // The coordinates and the full address are deliberately not stored.
  const location = {
    city: data.location.city || "",
    area: data.location.area || "",
    pincode: data.location.pincode || "",
    state: data.location.state || "",
    country: data.location.country || "",
  };

  window.sessionStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  window.dispatchEvent(new Event(LOCATION_EVENT));
  return location;
}
