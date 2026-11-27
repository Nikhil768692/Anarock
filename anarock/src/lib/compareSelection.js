"use client";

// The properties picked for comparison (up to 3), shared by the list, city,
// detail, shortlist and compare pages through localStorage.
import { useCallback, useMemo } from "react";
import { useStorageValue, writeStorageValue } from "@/lib/browserStore";

export const COMPARE_STORAGE_KEY = "anarock_compare_properties";
export const COMPARE_EVENT = "compare-updated";
export const MAX_COMPARE_PROPERTIES = 3;

const idOf = (property) => String(property?.id ?? "").trim();

// Valid, unique entries; `keep` decides which end is kept when there are more
// than three ("first" for pick lists, "last" for the compare page).
export function cleanCompareSelection(list, keep = "first") {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const unique = list.filter((item) => {
    const id = idOf(item);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return keep === "last"
    ? unique.slice(-MAX_COMPARE_PROPERTIES)
    : unique.slice(0, MAX_COMPARE_PROPERTIES);
}

function readSelection(raw, keep) {
  if (!raw) return [];
  try {
    return cleanCompareSelection(JSON.parse(raw), keep);
  } catch {
    return [];
  }
}

export function saveCompareSelection(list) {
  const clean = cleanCompareSelection(list, "last");
  writeStorageValue(
    COMPARE_STORAGE_KEY,
    clean.length ? JSON.stringify(clean) : null,
    { event: COMPARE_EVENT },
  );
  return clean;
}

// [selection, setSelection, ready]. `ready` is false until the browser value
// is known. setSelection takes a list or a function of the current list.
export function useCompareSelection({ keep = "first" } = {}) {
  const raw = useStorageValue(COMPARE_STORAGE_KEY, { events: [COMPARE_EVENT] });
  const selection = useMemo(() => readSelection(raw, keep), [raw, keep]);

  const setSelection = useCallback(
    (next) => {
      let current = [];
      try {
        current = readSelection(localStorage.getItem(COMPARE_STORAGE_KEY), keep);
      } catch {
        current = [];
      }
      saveCompareSelection(typeof next === "function" ? next(current) : next);
    },
    [keep],
  );

  return [selection, setSelection, raw !== undefined];
}
