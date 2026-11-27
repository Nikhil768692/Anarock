/** @type {import('next').NextConfig} */
// Strict-Transport-Security is added by the hosting platform (Vercel).
// The page Content-Security-Policy (with a nonce per request) is set in
// src/proxy.js. API responses get a policy that allows nothing, since they
// are data, not pages.

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
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin",
    },
    {
        key: "Cross-Origin-Resource-Policy",
        value: "same-origin",
    },
];

const apiHeaders = [
    {
        key: "Content-Security-Policy",
        value: "default-src 'none'; frame-ancestors 'none'",
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
            {
                source: "/api/:path*",
                headers: apiHeaders,
            },
        ];
    },
    images: {
        // Next.js 16 allows only listed image qualities (default: 75 only).
        // The property detail gallery uses 90.
        qualities: [75, 90],
        remotePatterns: [
            {
                protocol: "https",
                hostname: "property-images.zohostratus.in",
            },
        ],
    },
};
export default nextConfig;