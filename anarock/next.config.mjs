/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";
// Strict-Transport-Security and X-Frame-Options are added by Catalyst Slate,
// so they are not set here (setting them twice sent two different values).
// Framing is still blocked by "frame-ancestors" in the Content-Security-Policy.

// Scripts are allowed only from this site and the Zoho CDN.
// 'unsafe-eval' is needed only by the development server.
const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    ...(isProduction ? [] : ["'unsafe-eval'"]),
    "https://static.zohocdn.com",
].join(" ");

const securityHeaders = [
    {
        key: "X-DNS-Prefetch-Control",
        value: "on",
    },
    {
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), payment=()",
    },
    {
        key: "Content-Security-Policy",
        value: [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'self'",
            "form-action 'self' https:",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data: https:",
            "style-src 'self' 'unsafe-inline' https:",
            `script-src ${scriptSources}`,
            "connect-src 'self' https: wss:",
            "frame-src 'self' https:",
            "upgrade-insecure-requests",
        ].join("; "),
    },
];

const nextConfig = {
    poweredByHeader: false,
    reactStrictMode: true,
    async headers() {
        return [
            {
                source: "/:path*",
                headers: securityHeaders,
            },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "property-images.zohostratus.in",
            },
        ],
    },
};
export default nextConfig;