"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  LOCATION_EVENT,
  clearStoredLocation,
  readStoredLocation,
  requestUserLocation,
} from "@/lib/userLocation";

// Header location button. The browser is asked for the location only after
// the visitor reads the explanation and presses "Use my location".
export default function LocationControl() {
  const [location, setLocation] = useState(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | locating | failed
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const useButtonRef = useRef(null);

  useEffect(() => {
    const refresh = () => setLocation(readStoredLocation());
    refresh();
    window.addEventListener(LOCATION_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(LOCATION_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    useButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleUse = async () => {
    setStatus("locating");
    try {
      await requestUserLocation();
      setStatus("idle");
      close();
    } catch {
      setStatus("failed");
    }
  };

  const handleRemove = () => {
    clearStoredLocation();
    setStatus("idle");
    close();
  };

  const label = location?.city
    ? `${location.city}${location.state ? `, ${location.state}` : ""}`
    : location?.state || "Select location";

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="location-panel"
        onClick={() => {
          setOpen((value) => !value);
          setStatus("idle");
        }}
        className="flex min-w-0 max-w-[180px] items-center gap-1.5 rounded-lg border border-black/15 bg-white/90 px-2.5 py-1.5 text-left shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-[#A054A0]/40 sm:max-w-[165px] sm:gap-2 sm:px-3 sm:py-2 md:max-w-[185px] lg:max-w-[250px] lg:max-[1279px]:max-w-[150px] lg:max-[1279px]:px-2 min-[1280px]:max-w-[175px] min-[1536px]:max-w-[250px] min-[1920px]:max-w-[260px] min-[1920px]:px-3.5 min-[1920px]:py-2.5"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#A054A0] text-white shadow-sm sm:h-7 sm:w-7 min-[1920px]:h-8 min-[1920px]:w-8">
          <MapPin size={14} strokeWidth={2.3} aria-hidden="true" />
        </span>

        <span className="min-w-0 leading-tight">
          <span className="hidden text-[10px] font-bold uppercase tracking-wider text-[#A054A0] sm:block">
            Your location
          </span>
          <span className="block truncate text-[10px] font-semibold text-black sm:text-[13px] md:text-[14px] lg:max-[1279px]:text-[12px] min-[1280px]:text-[13px] min-[1920px]:text-[14px]">
            {label}
          </span>
        </span>
      </button>

      {open && (
        <div
          id="location-panel"
          role="group"
          aria-label="Your location"
          className="fixed inset-x-3 top-[76px] z-[110] rounded-xl border border-black/15 bg-white p-4 text-left shadow-lg sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[280px]"
        >
          <p className="text-xs leading-5 text-black">
            If you share your location, your approximate position is sent to
            our server and to OpenStreetMap to find your area. Your area, city,
            state, country and PIN code are then added to enquiries and
            property listings you send from this tab.
          </p>

          <button
            ref={useButtonRef}
            type="button"
            onClick={handleUse}
            disabled={status === "locating"}
            className="mt-3 min-h-10 w-full rounded-lg bg-[#8f3d8a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#7a3376] disabled:opacity-60"
          >
            {status === "locating" ? "Finding your location..." : "Use my location"}
          </button>

          {location && (
            <button
              type="button"
              onClick={handleRemove}
              className="mt-2 min-h-10 w-full rounded-lg border border-slate-400 px-3 py-2 text-xs font-semibold text-black transition hover:border-black"
            >
              Remove saved location
            </button>
          )}

          <p role="status" className="mt-2 text-xs text-red-700 empty:hidden">
            {status === "failed"
              ? "We could not get your location. Check your browser permission and try again."
              : ""}
          </p>

          <Link
            href="/privacy-policy"
            className="mt-2 inline-block text-xs text-black underline"
          >
            Privacy policy
          </Link>
        </div>
      )}
    </div>
  );
}
