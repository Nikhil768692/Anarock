// Shows the AI-generated description and attributes of a property.
// Values are shown as text only (React escapes them).
import { parseAiAttributes } from "@/lib/aiAttributes";

export { parseAiAttributes };

export default function PropertyHighlights({ aiAttributes }) {
  const parsed = parseAiAttributes(aiAttributes);
  if (!parsed) return null;

  return (
    <div>
      {parsed.description && (
        <p className="text-sm leading-6 text-black">{parsed.description}</p>
      )}

      {parsed.items.length > 0 && (
        <ul className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${parsed.description ? "mt-4" : ""}`}>
          {parsed.items.map((item, index) => (
            <li
              key={`${item.label}-${index}`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-black"
            >
              {item.label && <span className="font-semibold">{item.label}: </span>}
              {item.value}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-slate-600">
        Summary generated with AI from the listing details. Please confirm
        specifics with our team.
      </p>
    </div>
  );
}
