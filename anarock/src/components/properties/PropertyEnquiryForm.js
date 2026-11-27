"use client";

// Enquiry form. With a `property` (detail page) it sends the property's
// website ID to /api/lead3, and the server links the CRM property record to
// the new Lead. Without one (contact page) it sends a general enquiry to
// /api/lead2.
import { useId, useRef, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import PrivacyNotice from "@/components/common/PrivacyNotice";
import { SECURITY_CHECK_MESSAGE, useFormGuard } from "@/components/common/FormGuard";
import { readStoredLocation } from "@/lib/userLocation";
import {
  PHONE_COUNTRIES,
  isValidEmailAddress,
  phoneDigitsError,
} from "@/lib/phoneCountries";

const EMPTY_FORM = { name: "", phone: "", email: "", company: "", message: "" };

const inputClass = (hasError) =>
  `w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-black outline-none transition placeholder:text-slate-500 focus:ring-2 focus:ring-[#A054A0]/20 ${
    hasError
      ? "border-red-600 focus:border-red-600"
      : "border-slate-300 focus:border-[#A054A0]"
  }`;

export default function PropertyEnquiryForm({ property = null, source = "Contact page" }) {
  const baseId = useId();
  const ids = {
    name: `${baseId}-name`,
    country: `${baseId}-country`,
    phone: `${baseId}-phone`,
    email: `${baseId}-email`,
    company: `${baseId}-company`,
    message: `${baseId}-message`,
  };
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const guard = useFormGuard();
  const [form, setForm] = useState(EMPTY_FORM);
  const [countryCode, setCountryCode] = useState(PHONE_COUNTRIES[0].code);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const country =
    PHONE_COUNTRIES.find((item) => item.code === countryCode) ||
    PHONE_COUNTRIES[0];

  const update = (field) => (event) => {
    let value = event.target.value;
    if (field === "phone") value = value.replace(/\D/g, "").slice(0, country.max);
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
    setStatus({ type: "", message: "" });
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    const phoneError = phoneDigitsError(form.phone, country);
    if (phoneError) next.phone = phoneError;
    if (form.email.trim() && !isValidEmailAddress(form.email)) {
      next.email = "Enter a valid email address.";
    }
    setErrors(next);

    // Move keyboard focus to the first field that needs attention.
    const first = ["name", "phone", "email"].find((field) => next[field]);
    const firstRef = { name: nameRef, phone: phoneRef, email: emailRef }[first];
    firstRef?.current?.focus();
    return !first;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !validate()) return;

    if (!guard.ready) {
      setStatus({ type: "error", message: SECURITY_CHECK_MESSAGE });
      return;
    }

    setSubmitting(true);
    setStatus({ type: "", message: "" });

    const name = form.name.trim().replace(/\s+/g, " ");
    const spaceIndex = name.indexOf(" ");
    const location = readStoredLocation() || {};

    const general = {
      name,
      fullPhone: `${country.dial}${form.phone}`,
      email: form.email.trim(),
      company: form.company.trim(),
      requirementDetails: [form.message.trim(), `Submitted from: ${source}`]
        .filter(Boolean)
        .join("\n"),
      Street: location.area || "",
      City: location.city || "",
      Province: location.state || "",
      Postal_Code: location.pincode || "",
      Country: location.country || "",
      ...guard.values(),
    };

    try {
      const response = await fetch(property ? "/api/lead3" : "/api/lead2", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(property ? {
          firstName: spaceIndex === -1 ? name : name.slice(0, spaceIndex),
          lastName: spaceIndex === -1 ? "" : name.slice(spaceIndex + 1),
          phone: `${country.dial}${form.phone}`,
          email: form.email.trim(),
          company: form.company.trim(),
          message: form.message.trim(),
          source: "Property Detail",
          selectedProperties: [{ id: String(property?.id || "") }],
          requirementCity: property?.city || "",
          requirementType: property?.officeType || "",
          location: {
            street: location.area || "",
            city: location.city || "",
            state: location.state || "",
            country: location.country || "",
            postalCode: location.pincode || "",
          },
          ...guard.values(),
        } : general),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success !== true) {
        throw new Error(
          data?.message || "We couldn't send your enquiry. Please try again.",
        );
      }

      setForm(EMPTY_FORM);
      setStatus({
        type: "success",
        message: property
          ? "Thank you. Our team will contact you about this property shortly."
          : "Thank you. Our team will contact you shortly.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.message || "We couldn't send your enquiry. Please try again.",
      });
    } finally {
      guard.afterSubmit();
      setSubmitting(false);
    }
  };

  const errorId = (field) => `${ids[field]}-error`;
  const fieldProps = (field) => ({
    id: ids[field],
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? errorId(field) : undefined,
  });
  const fieldError = (field) =>
    errors[field] ? (
      <p id={errorId(field)} className="mt-1 text-xs font-medium text-red-700">
        {errors[field]}
      </p>
    ) : null;

  if (status.type === "success") {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-xl border border-[#1F7A4D]/30 bg-[#1F7A4D]/5 p-5"
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1F7A4D]" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-black">{status.message}</p>
          <button
            type="button"
            onClick={() => setStatus({ type: "", message: "" })}
            className="mt-2 min-h-10 text-sm font-semibold text-[#7B2F77] underline underline-offset-2"
          >
            Send another enquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={ids.name} className="mb-1.5 block text-sm font-semibold text-black">
          Full name <span aria-hidden="true" className="text-red-700">*</span>
        </label>
        <input
          ref={nameRef}
          {...fieldProps("name")}
          type="text"
          autoComplete="name"
          required
          maxLength={100}
          value={form.name}
          onChange={update("name")}
          className={inputClass(errors.name)}
        />
        {fieldError("name")}
      </div>

      <div>
        <label htmlFor={ids.phone} className="mb-1.5 block text-sm font-semibold text-black">
          Phone number <span aria-hidden="true" className="text-red-700">*</span>
        </label>
        <div className="flex gap-2">
          <label htmlFor={ids.country} className="sr-only">
            Country code
          </label>
          <select
            id={ids.country}
            value={countryCode}
            onChange={(event) => {
              setCountryCode(event.target.value);
              setErrors((previous) => ({ ...previous, phone: "" }));
            }}
            className="w-[104px] shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-sm text-black outline-none focus:border-[#A054A0] focus:ring-2 focus:ring-[#A054A0]/20"
          >
            {PHONE_COUNTRIES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} {item.dial}
              </option>
            ))}
          </select>
          <input
            ref={phoneRef}
            {...fieldProps("phone")}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            required
            value={form.phone}
            onChange={update("phone")}
            className={inputClass(errors.phone)}
          />
        </div>
        {fieldError("phone")}
      </div>

      <div>
        <label htmlFor={ids.email} className="mb-1.5 block text-sm font-semibold text-black">
          Email <span className="font-normal text-slate-600">(optional)</span>
        </label>
        <input
          ref={emailRef}
          {...fieldProps("email")}
          type="email"
          autoComplete="email"
          maxLength={254}
          value={form.email}
          onChange={update("email")}
          className={inputClass(errors.email)}
        />
        {fieldError("email")}
      </div>

      <div>
        <label htmlFor={ids.company} className="mb-1.5 block text-sm font-semibold text-black">
          Company <span className="font-normal text-slate-600">(optional)</span>
        </label>
        <input
          id={ids.company}
          type="text"
          autoComplete="organization"
          maxLength={150}
          value={form.company}
          onChange={update("company")}
          className={inputClass(false)}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={ids.message} className="mb-1.5 block text-sm font-semibold text-black">
          Your requirement <span className="font-normal text-slate-600">(optional)</span>
        </label>
        <textarea
          id={ids.message}
          rows={3}
          maxLength={1000}
          value={form.message}
          onChange={update("message")}
          placeholder="For example: team size, area needed, move-in date"
          className={`${inputClass(false)} resize-none`}
        />
      </div>

      <div className="sm:col-span-2">
        {guard.fields}

        {status.type === "error" && (
          <p role="alert" className="mt-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {status.message}
          </p>
        )}

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PrivacyNotice className="sm:max-w-md" />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#8f3d8a] px-6 text-sm font-semibold text-white transition hover:bg-[#7a3376] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            {submitting ? "Sending..." : "Send enquiry"}
          </button>
        </div>
      </div>
    </form>
  );
}
