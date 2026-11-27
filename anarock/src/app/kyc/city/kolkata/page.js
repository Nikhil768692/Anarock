import CityPageClient from "@/app/kyc/CityPageClient";

export const metadata = {
    title: `Office Space for Rent in Kolkata`,
    description:
        "Commercial office space, managed offices and co-working in Kolkata: listed properties, rents by micro-market and advisors who know the market.",
    alternates: { canonical: "/kyc/city/kolkata" },
};

export default function KolkataPage() {
    return (
        <CityPageClient
            city="Kolkata"
            slug="kolkata"
        />
    );
}