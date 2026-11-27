import CityPageClient from "@/app/kyc/CityPageClient";

export const metadata = {
    title: `Office Space for Rent in Gurugram`,
    description:
        "Commercial office space, managed offices and co-working in Gurugram: listed properties, rents by micro-market and advisors who know the market.",
    alternates: { canonical: "/kyc/city/gurugram" },
};

export default function GurugramPage() {
    return (
        <CityPageClient
            city="Gurugram"
            slug="gurugram"
        />
    );
}