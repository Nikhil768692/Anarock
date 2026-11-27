"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useStorageValue, writeStorageValue } from "@/lib/browserStore";
const WishlistContext = createContext(null);
const STORAGE_KEY = "anarock_wishlist_properties";
function getPropertyId(property) {
  if (!property) return "";

  if (typeof property === "string" || typeof property === "number") {
    return String(property);
  }

  const id =
    property.id ??
    property.ID ??
    property.rowId ??
    property.ROWID ??
    property.RowID ??
    property.projectId ??
    property.Project_ID ??
    property.project_id ??
    property.propertyId ??
    property.Property_ID ??
    property.PROPERTY_ID ??
    "";

  return id !== null && id !== undefined ? String(id) : "";
}

function hasPropertyData(property) {
  if (!property || typeof property !== "object") {
    return false;
  }

  const keys = Object.keys(property);

  if (keys.length <= 1) {
    return false;
  }

  return keys.some((key) => {
    const value = property[key];

    return value !== null && value !== undefined && value !== "";
  });
}

function parseWishlist(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (error) {
    console.error("Wishlist read error:", error);
    return [];
  }
}

function readWishlist() {
  if (typeof window === "undefined") return [];
  try {
    return parseWishlist(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
}

function saveWishlist(items) {
  writeStorageValue(STORAGE_KEY, JSON.stringify(items), {
    event: "wishlist-updated",
  });
}

export function WishlistProvider({ children }) {
  // The shortlist lives in localStorage, so it is shared by every tab.
  const raw = useStorageValue(STORAGE_KEY, { events: ["wishlist-updated"] });
  const isInitialized = raw !== undefined;
  const items = useMemo(() => parseWishlist(raw), [raw]);

  // Changes always start from the saved list, so two quick clicks never
  // overwrite each other.
  const setItems = useCallback((update) => {
    const previous = readWishlist();
    const next = typeof update === "function" ? update(previous) : update;
    if (next !== previous) saveWishlist(next);
  }, []);
  const ids = useMemo(() => {
    return items.map(getPropertyId).filter(Boolean);
  }, [items]);
  const add = useCallback((property) => {
    if (!property) {
      return;
    }

    const propertyId = getPropertyId(property);

    if (!propertyId) {
      console.warn("Wishlist: property has no valid ID", property);

      return;
    }

    setItems((previousItems) => {
      const existingIndex = previousItems.findIndex(
        (item) => getPropertyId(item) === propertyId,
      );

      if (existingIndex !== -1) {
        const existingProperty = previousItems[existingIndex];
        if (hasPropertyData(property) && !hasPropertyData(existingProperty)) {
          const updatedItems = [...previousItems];
          updatedItems[existingIndex] = {
            ...existingProperty,
            ...property,
            id: property.id ?? existingProperty.id ?? propertyId,
          };
          return updatedItems;
        }
        return previousItems;
      }
      const normalizedProperty =
        typeof property === "object"
          ? {
              ...property,
              id:
                property.id ??
                property.ID ??
                property.rowId ??
                property.ROWID ??
                property.RowID ??
                property.projectId ??
                property.Project_ID ??
                property.project_id ??
                property.propertyId ??
                property.Property_ID ??
                propertyId,
            }
          : {
              id: propertyId,
            };

      const updatedItems = [...previousItems, normalizedProperty];
      return updatedItems;
    });
  }, [setItems]);
  const remove = useCallback((propertyOrId) => {
    const propertyId = getPropertyId(propertyOrId);
    if (!propertyId) {
      return;
    }
    setItems((previousItems) => {
      const updatedItems = previousItems.filter(
        (item) => getPropertyId(item) !== propertyId,
      );
      return updatedItems;
    });
  }, [setItems]);
  const toggle = useCallback(
    (property) => {
      const propertyId = getPropertyId(property);
      if (!propertyId) {
        console.warn("Wishlist toggle failed: invalid property", property);
        return;
      }
      const exists = ids.includes(propertyId);
      if (exists) {
        remove(propertyId);
      } else {
        add(property);
      }
    },
    [ids, add, remove],
  );
  const clear = useCallback(() => {
    setItems([]);
  }, [setItems]);
  return (
    <WishlistContext.Provider
      value={{
        items,
        ids,
        count: items.length,

        add,
        remove,
        toggle,
        clear,

        isInitialized,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    return {
      items: [],
      ids: [],
      count: 0,

      add: () => {},
      remove: () => {},
      toggle: () => {},
      clear: () => {},

      isInitialized: false,
    };
  }

  return context;
}
