const SITE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL || "https://anarock.com"
).replace(/\/+$/, "");

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}