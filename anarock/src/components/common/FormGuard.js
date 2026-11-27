"use client";

// Browser half of the bot checks in src/lib/formProtection.js.
//
//   const guard = useFormGuard();
//   <form> ... {guard.fields} ... </form>          // hidden field (+ Turnstile)
//   body: JSON.stringify({ ...payload, ...guard.values() })
//   guard.afterSubmit();                            // after every attempt
//
// Call guard.restart() when a form that stays on the page is opened again
// (for example a dialog), so the fill time is counted from that moment.
import { useCallback, useEffect, useRef, useState } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise = null;

function loadTurnstile() {
  if (typeof window === "undefined") return Promise.reject();
  if (window.turnstile) return Promise.resolve(window.turnstile);

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Security check could not load."));
      };
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}

function TurnstileBox({ onToken }) {
  const boxRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let widgetId = null;
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !boxRef.current) return;
        widgetId = turnstile.render(boxRef.current, {
          sitekey: SITE_KEY,
          size: "flexible",
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetId !== null) {
        try {
          window.turnstile?.remove(widgetId);
        } catch {
          // The widget may already be gone.
        }
      }
    };
  }, [onToken]);

  return (
    <div className="mt-4">
      <div ref={boxRef} />
      {failed && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          The security check could not load. Please check your connection and
          reload the page.
        </p>
      )}
    </div>
  );
}

export const SECURITY_CHECK_MESSAGE =
  "Please wait for the security check below to finish, then try again.";

export function useFormGuard() {
  const startedAtRef = useRef(0);
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState("");
  const [widgetKey, setWidgetKey] = useState(0);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const restart = useCallback(() => {
    startedAtRef.current = Date.now();
  }, []);

  const values = useCallback(
    () => ({
      website: honeypot,
      formFillMs: startedAtRef.current
        ? Math.max(0, Date.now() - startedAtRef.current)
        : 0,
      turnstileToken: token,
    }),
    [honeypot, token],
  );

  // A Turnstile answer can be used only once, so show a fresh check.
  const afterSubmit = useCallback(() => {
    if (!SITE_KEY) return;
    setToken("");
    setWidgetKey((key) => key + 1);
  }, []);

  const fields = (
    <>
      {/* Hidden from people and from screen readers. Bots fill it in. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          margin: "-1px",
          padding: 0,
          overflow: "hidden",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </label>
      </div>
      {SITE_KEY && <TurnstileBox key={widgetKey} onToken={setToken} />}
    </>
  );

  return {
    fields,
    values,
    restart,
    afterSubmit,
    // False while a Turnstile check is shown but not yet passed.
    ready: !SITE_KEY || Boolean(token),
  };
}
