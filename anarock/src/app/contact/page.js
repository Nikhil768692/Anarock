import Link from "next/link";
import { Building2, KeyRound, Mail, PhoneCall } from "lucide-react";
import Breadcrumbs from "@/components/common/Breadcrumbs";
import PropertyEnquiryForm from "@/components/properties/PropertyEnquiryForm";

export const metadata = {
  title: "Contact Us",
  description:
    "Contact Anarock about office space, managed offices and co-working, listing your property, or your personal data.",
  alternates: { canonical: "/contact" },
};

const ROUTES = [
  {
    icon: Building2,
    title: "Looking for office space",
    text: "Tell us your requirement and an advisor will call you with a shortlist.",
    href: "/#enquiry",
    link: "Post a requirement",
  },
  {
    icon: KeyRound,
    title: "Own or manage a property",
    text: "List your building or centre, or ask our team to help you list it.",
    href: "/list-your-property",
    link: "List your property",
  },
  {
    icon: Mail,
    title: "Your personal data",
    text: "Questions about how we use your details, or a request to access or delete them.",
    href: "mailto:privacy@anarock.com",
    link: "privacy@anarock.com",
  },
];

export default function ContactPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Contact Us" }]} />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-6 sm:px-6 lg:px-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7B2F77] sm:text-xs">
          Contact
        </p>
        <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-[-0.02em] text-black sm:text-[40px]">
          Talk to our commercial real estate team
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-black/75">
          Send us a message and the right team will get back to you. For a
          quick call back, use the form below.
        </p>

        <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {ROUTES.map(({ icon: Icon, title, text, href, link }) => (
            <li
              key={title}
              className="flex flex-col rounded-xl border border-[#E7E7EE] bg-white p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F4EAF2] text-[#7B2F77]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-base font-bold text-black">{title}</h2>
              <p className="mt-1.5 flex-1 text-sm leading-6 text-black/75">{text}</p>
              <Link
                href={href}
                className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-[#7B2F77] underline underline-offset-2"
              >
                {link}
              </Link>
            </li>
          ))}
        </ul>

        <section
          aria-labelledby="contact-form-title"
          className="mt-10 rounded-xl border border-[#E7E7EE] bg-white p-5 sm:p-8"
        >
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4EAF2] text-[#7B2F77]">
              <PhoneCall className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="contact-form-title" className="text-lg font-bold text-black">
                Send us a message
              </h2>
              <p className="mt-1 text-sm text-black/75">
                Leave your number and a short note. Our team will call you back.
              </p>
            </div>
          </div>
          <PropertyEnquiryForm source="Contact page" />
        </section>
      </div>
    </>
  );
}
