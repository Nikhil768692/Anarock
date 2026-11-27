// "You might also be interested in" list for the property detail page.
// Worked out on the server so the page gets only a few cards instead of
// the whole inventory.
import { getAllProperties } from "@/lib/propertiesCache";
import { toPublicProperties } from "@/lib/propertyMapper";

export const RELATED_LIMIT = 8;

const lower = (value) => String(value || "").trim().toLowerCase();
const typeOf = (property) =>
  lower(property?.officeType || property?.type).replace(/\s+/g, " ");
const priceOf = (property) =>
  Number(property?.quotedRent || property?.monthlyCostPerSeat || 0);

export function scoreRelated(current, item) {
  let score = 0;
  if (current.city && lower(item.city) === lower(current.city)) score += 100;
  if (current.micromarket && lower(item.micromarket) === lower(current.micromarket)) {
    score += 50;
  }
  if (typeOf(current) && typeOf(current) === typeOf(item)) score += 25;

  const currentPrice = priceOf(current);
  const itemPrice = priceOf(item);
  if (currentPrice > 0 && itemPrice > 0) {
    if (Math.abs(currentPrice - itemPrice) / currentPrice < 0.5) score += 10;
  }
  return score;
}

export async function getRelatedProperties(property, limit = RELATED_LIMIT) {
  if (!property) return [];
  const currentId = String(property.id || "");
  const all = await getAllProperties();

  const ranked = (Array.isArray(all) ? all : [])
    .filter((item) => String(item?.id || "") !== currentId)
    .map((item) => ({ item, score: scoreRelated(property, item) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);

  return toPublicProperties(ranked);
}
