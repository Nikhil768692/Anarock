import CityPageClient from "@/app/kyc/CityPageClient";

export const metadata = {
    title: `Office Space for Rent in Pune`,
    description:
        "Commercial office space, managed offices and co-working in Pune: listed properties, rents by micro-market and advisors who know the market.",
    alternates: { canonical: "/kyc/city/pune" },
};

export default function PunePage() {
    return (
        <CityPageClient
            city="Pune"
            slug="pune"
        />
    );
}