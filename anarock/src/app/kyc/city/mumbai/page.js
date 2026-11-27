import CityPageClient from "@/app/kyc/CityPageClient";

export const metadata = {
    title: `Office Space for Rent in Mumbai`,
    description:
        "Commercial office space, managed offices and co-working in Mumbai: listed properties, rents by micro-market and advisors who know the market.",
    alternates: { canonical: "/kyc/city/mumbai" },
};

export default function MumbaiPage() {
    return (
        <CityPageClient
            city="Mumbai"
            slug="mumbai"
        />
    );
}