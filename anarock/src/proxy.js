import { NextResponse } from "next/server";

// Content-Security-Policy with a fresh nonce for every page view. Next.js adds
// the nonce to its own scripts, so no inline script without it can run.
// 'strict-dynamic' lets those trusted scripts load the scripts they need
// (for example the GCC calculator file and Cloudflare Turnstile).
const isDev = process.env.NODE_ENV === "development";

function contentSecurityPolicy(nonce) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes are used by the UI libraries; styles cannot run code.
    "style-src 'self' 'unsafe-inline'",
    // Advisor photos and other CMS images can come from any HTTPS host.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://challenges.cloudflare.com${isDev ? " ws:" : ""}`,
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not API routes, build files, images or other static files.
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.well-known|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|js|css|txt|xml|pdf)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
