import CityPageClient from "@/app/kyc/CityPageClient";

export const metadata = {
    title: `Office Space for Rent in Noida`,
    description:
        "Commercial office space, managed offices and co-working in Noida: listed properties, rents by micro-market and advisors who know the market.",
    alternates: { canonical: "/kyc/city/noida" },
};

export default function NoidaPage() {
    return (
        <CityPageClient
            city="Noida"
            slug="noida"
        />
    );
}