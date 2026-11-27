import CityPageClient from "@/app/kyc/CityPageClient";

export const metadata = {
    title: `Office Space for Rent in Hyderabad`,
    description:
        "Commercial office space, managed offices and co-working in Hyderabad: listed properties, rents by micro-market and advisors who know the market.",
    alternates: { canonical: "/kyc/city/hyderabad" },
};

export default function HyderabadPage() {
    return (
        <CityPageClient
            city="Hyderabad"
            slug="hyderabad"
        />
    );
}