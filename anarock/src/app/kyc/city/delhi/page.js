import CityPageClient from "@/app/kyc/CityPageClient";

export const metadata = {
    title: `Office Space for Rent in Delhi`,
    description:
        "Commercial office space, managed offices and co-working in Delhi: listed properties, rents by micro-market and advisors who know the market.",
    alternates: { canonical: "/kyc/city/delhi" },
};

export default function DelhiPage() {
    return (
        <CityPageClient
            city="Delhi"
            slug="delhi"
        />
    );
}