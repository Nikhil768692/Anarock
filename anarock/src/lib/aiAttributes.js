// Reads the AI-generated description and attributes of a property
// (the AIAttributes column). The column can hold JSON (an object or a list)
// or plain text; anything else is ignored. Returns plain text only.
const MAX_ITEMS = 30;
const MAX_TEXT = 2000;
const DESCRIPTION_KEYS = ["description", "summary", "overview", "about"];

const humanise = (key) =>
  String(key)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());

const text = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);

function valueText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "object" ? "" : text(item))).filter(Boolean).join(", ");
  }
  if (value && typeof value === "object") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return text(value);
}

export function parseAiAttributes(raw) {
  let value = raw;

  if (typeof value === "string") {
    const trimmed = value.trim().slice(0, 20_000);
    if (!trimmed) return null;
    try {
      value = JSON.parse(trimmed);
    } catch {
      value = trimmed;
    }
  }

  const result = { description: "", items: [] };

  if (typeof value === "string") {
    const lines = value.slice(0, MAX_TEXT).split(/\r?\n+/).map((line) => line.trim()).filter(Boolean);
    const paragraphs = [];
    for (const line of lines) {
      const bullet = line.match(/^[-*•]\s*(.+)$/);
      if (bullet) result.items.push({ label: "", value: text(bullet[1]) });
      else paragraphs.push(line);
    }
    result.description = paragraphs.join(" ").slice(0, MAX_TEXT);
  } else if (Array.isArray(value)) {
    for (const item of value) {
      if (item && typeof item === "object") {
        const label = text(item.name ?? item.label ?? item.key ?? "");
        const itemValue = valueText(item.value ?? item.detail ?? "");
        if (label || itemValue) result.items.push({ label, value: itemValue });
      } else if (valueText(item)) {
        result.items.push({ label: "", value: valueText(item) });
      }
    }
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (!result.description && DESCRIPTION_KEYS.includes(key.toLowerCase()) && typeof item === "string") {
        result.description = item.trim().slice(0, MAX_TEXT);
        continue;
      }
      if (item && typeof item === "object" && !Array.isArray(item)) {
        for (const [subKey, subItem] of Object.entries(item)) {
          const subValue = valueText(subItem);
          if (subValue) result.items.push({ label: humanise(subKey), value: subValue });
        }
        continue;
      }
      const itemValue = valueText(item);
      if (itemValue) result.items.push({ label: humanise(key), value: itemValue });
    }
  } else {
    return null;
  }

  result.items = result.items.filter((item) => item.value).slice(0, MAX_ITEMS);
  return result.description || result.items.length ? result : null;
}
