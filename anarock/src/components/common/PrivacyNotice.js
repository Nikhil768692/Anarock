import Link from "next/link";

// Short notice shown on every form that collects contact details.
// Keep the wording in step with the Privacy Policy page.
export default function PrivacyNotice({ className = "" }) {
  return (
    <p className={`text-[11px] leading-relaxed text-black/70 ${className}`}>
      By submitting, you agree that Anarock may contact you about this enquiry.
      We use your details as described in our{" "}
      <Link
        href="/privacy-policy"
        target="_blank"
        rel="noopener"
        className="font-semibold text-[#7B2F77] underline underline-offset-2"
      >
        Privacy Policy
        <span className="sr-only"> (opens in a new tab)</span>
      </Link>
      .
    </p>
  );
}
