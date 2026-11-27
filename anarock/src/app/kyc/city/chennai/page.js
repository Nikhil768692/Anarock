import CityPageClient from "@/app/kyc/CityPageClient";

export const metadata = {
    title: `Office Space for Rent in Chennai`,
    description:
        "Commercial office space, managed offices and co-working in Chennai: listed properties, rents by micro-market and advisors who know the market.",
    alternates: { canonical: "/kyc/city/chennai" },
};

export default function ChennaiPage() {
    return (
        <CityPageClient
            city="Chennai"
            slug="chennai"
        />
    );
}