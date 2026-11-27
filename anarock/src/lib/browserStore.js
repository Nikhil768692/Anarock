"use client";

// Hooks for values that exist only in the browser (localStorage,
// sessionStorage, media queries). They follow React's external-store pattern:
// the server and the first (hydration) render see the "unknown" value, then
// the browser value is used and every change is picked up.
import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

function storageArea(kind) {
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

// Raw string from storage: undefined until the page is running in the
// browser, null when nothing is saved. `events` are window events that the
// code dispatches after it changes the value.
export function useStorageValue(key, { storage = "local", events = [] } = {}) {
  const eventList = events.join("|");
  const subscribe = (onChange) => {
    const names = eventList ? eventList.split("|") : [];
    const onStorage = (event) => {
      if (!event.key || event.key === key) onChange();
    };
    window.addEventListener("storage", onStorage);
    names.forEach((name) => window.addEventListener(name, onChange));
    return () => {
      window.removeEventListener("storage", onStorage);
      names.forEach((name) => window.removeEventListener(name, onChange));
    };
  };
  const getSnapshot = () => {
    try {
      return storageArea(storage)?.getItem(key) ?? null;
    } catch {
      return null;
    }
  };
  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}

// Saves (or removes, for null) a value and tells the hooks above about it.
export function writeStorageValue(key, value, { storage = "local", event } = {}) {
  try {
    const area = storageArea(storage);
    if (value === null || value === undefined) area?.removeItem(key);
    else area?.setItem(key, value);
  } catch {
    // Storage can be full or blocked (for example in some private windows).
  }
  if (event) window.dispatchEvent(new Event(event));
}

// False on the server and during hydration, true afterwards.
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

// Whether a CSS media query matches (false on the server).
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
