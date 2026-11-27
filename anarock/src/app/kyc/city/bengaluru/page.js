import CityPageClient from "@/app/kyc/CityPageClient";

export const metadata = {
    title: `Office Space for Rent in Bengaluru`,
    description:
        "Commercial office space, managed offices and co-working in Bengaluru: listed properties, rents by micro-market and advisors who know the market.",
    alternates: { canonical: "/kyc/city/bengaluru" },
};

export default function BengaluruPage() {
    return (
        <CityPageClient
            city="Bengaluru"
            slug="bengaluru"
        />
    );
}