"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Script from "next/script";
import Breadcrumbs from "@/components/common/Breadcrumbs";
import { usePreferences } from "@/lib/preferences";
import {
  GCC_CALCULATOR_MARKUP,
  GCC_CALCULATOR_STYLES,
} from "./gccCalculatorMarkup";

// The calculator logic lives in /public/gcc-calculator/gcc-calculator.js,
// exactly as in the original HTML. It is loaded as a normal script file so
// it works with the site's Content Security Policy.
const CALCULATOR_SCRIPT = "/gcc-calculator/gcc-calculator.js";

// Same symbols and fallback rates (per 1 INR) as src/lib/format.js, so the
// calculator shows the same amounts as the rest of the site.
const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ ",
  SGD: "S$",
};
const FALLBACK_RATES = {
  INR: 1,
  USD: 0.0118,
  EUR: 0.0108,
  GBP: 0.0093,
  AED: 0.0433,
  SGD: 0.0152,
};

// The calculator works in USD; this turns the navbar choice into
// "how many units of the chosen currency one USD is worth".
function getCalculatorPreferences(currency, unit, exchangeRates) {
  const rates = { ...FALLBACK_RATES, ...(exchangeRates || {}), INR: 1 };
  const code = CURRENCY_SYMBOLS[currency] ? currency : "USD";
  const usdPerInr = Number(rates.USD);
  const targetPerInr = Number(rates[code]);
  const rate =
    usdPerInr > 0 && targetPerInr > 0 ? targetPerInr / usdPerInr : 1;

  return {
    code: rate === 1 && code !== "USD" ? "USD" : code,
    symbol: rate === 1 && code !== "USD" ? "$" : CURRENCY_SYMBOLS[code],
    rate,
    unit: unit === "sqm" ? "sqm" : "sqft",
  };
}

function applyPreferences(preferences) {
  // Kept so the script can pick it up if it loads after this runs.
  window.__gccPendingPreferences = preferences;
  if (typeof window.setGccCalculatorPreferences === "function") {
    window.setGccCalculatorPreferences(preferences);
  }
}

export default function GccCalculatorClient() {
  const wrapperRef = useRef(null);
  const hostRef = useRef(null);
  const { currency, unit, exchangeRates } = usePreferences();
  const preferencesRef = useRef(null);
  preferencesRef.current = getCalculatorPreferences(
    currency,
    unit,
    exchangeRates,
  );

  // Follow the navbar currency and sq.ft / sq.m switch.
  useEffect(() => {
    applyPreferences(preferencesRef.current);
  }, [currency, unit, exchangeRates]);

  // Keep the calculator's sticky input panel just below the site navbar.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const header = document.querySelector("header");
    if (!wrapper || !header) return undefined;

    const update = () => {
      const height = Math.round(header.getBoundingClientRect().height);
      wrapper.style.setProperty("--gcc-header-offset", `${height + 16}px`);
    };
    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // The calculator script changes its own markup (dropdown options, tables).
  // React must never re-render it, or those changes are lost, so the markup
  // is placed once here instead of being rendered by React.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || host.firstChild) return;
    host.innerHTML = GCC_CALCULATOR_MARKUP;

    // When the page is opened again (client-side navigation) the script file
    // is already loaded, so start the calculator on the new markup.
    if (typeof window.initGccCalculator === "function") {
      window.initGccCalculator();
      applyPreferences(preferencesRef.current);
    }
  }, []);

  return (
    <main className="min-h-screen w-full min-w-0 bg-[#F8F7F8]">
      <Breadcrumbs
        items={[
          { label: "Services", href: "/services" },
          { label: "GCC Calculator" },
        ]}
      />

      <style dangerouslySetInnerHTML={{ __html: GCC_CALCULATOR_STYLES }} />
      <style
        dangerouslySetInnerHTML={{
          __html:
            "#gcc-calc{--gcc-sticky-top:var(--gcc-header-offset,96px);}",
        }}
      />

      <div ref={wrapperRef} className="w-full min-w-0 overflow-x-clip">
        <div ref={hostRef} />
      </div>

      <Script
        src={CALCULATOR_SCRIPT}
        strategy="afterInteractive"
        onReady={() => {
          if (typeof window.initGccCalculator === "function") {
            window.initGccCalculator();
            applyPreferences(preferencesRef.current);
          }
        }}
      />
    </main>
  );
}