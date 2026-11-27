"use client";

// Enquiry form for the shortlisted properties (opened from the list page).
import PrivacyNotice from "@/components/common/PrivacyNotice";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  User,
  X,
} from "lucide-react";
import { getPropertyId, getPropertyImageUrl, getPropertySlug } from "./propertiesShared";

export default function EnquiryModal({
  closeEnquiryForm,
  enquiryError,
  enquiryForm,
  enquiryGuard,
  enquirySelection,
  enquirySuccess,
  handleEnquiryChange,
  handleEnquirySubmit,
  handleRemoveFromEnquiry,
  isSubmittingEnquiry,
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md transition-all duration-300"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeEnquiryForm();
        }
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A054A0]/10 text-[#A054A0]">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A054A0]">
                Property Enquiry
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Fill your Contact Details to Raise an Enquiry

              </h2>
            </div>
          </div>


          <button
            type="button"
            onClick={closeEnquiryForm}
            disabled={isSubmittingEnquiry}
            aria-label="Close form"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-800 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-6">
          {enquirySuccess ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <h3 className="mt-5 text-2xl font-bold text-slate-900">
                Enquiry Submitted Successfully!
              </h3>

              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                Thank you for reaching out. Our real estate specialist has
                received your requirements for the selected properties and
                will get in touch shortly.
              </p>

              <button
                type="button"
                onClick={closeEnquiryForm}
                className="mt-8 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#A054A0] px-8 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#A054A0]/20 transition hover:bg-[#864286]"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleEnquirySubmit} className="space-y-6">
              <div className="rounded-xl border border-slate-800/25 bg-slate-50/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-[#A054A0]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Selected Properties
                    </span>
                  </div>
                  <span className="rounded-full bg-[#A054A0] px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                    {enquirySelection.length}{" "}
                    {enquirySelection.length === 1
                      ? "Property"
                      : "Properties"}
                  </span>
                </div>

                <div className="custom-scrollbar flex gap-3 overflow-x-auto pb-1 pt-1">
                  {enquirySelection.map((property, index) => {
                    const propertyId = getPropertyId(property);
                    const propertySlug = getPropertySlug(property);

                    const propertyUrl = propertySlug
                      ? `/properties/${propertyId}/${propertySlug}`
                      : `/properties/${propertyId}`;

                    const propertyName =
                      property?.name ?? "Selected Property";
                    const city = property?.city ?? "";
                    const micromarket = property?.micromarket ?? "";
                    const coverImage = getPropertyImageUrl(property);

                    return (
                      <div
                        key={`${propertyId}-${index}`}
                        className="group relative flex min-w-[240px] max-w-[280px] shrink-0 items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs transition hover:border-[#A054A0] hover:shadow-md"
                      >
                        <Link
                          href={propertyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-w-0 flex-1 items-center gap-3"
                          title={`View details for ${propertyName}`}
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {coverImage ? (
                              <Image
                                src={coverImage}
                                alt={propertyName}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-110"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[#A054A0]/60">
                                <Building className="h-5 w-5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-[#A054A0]">
                                {propertyName}
                              </p>
                              <ExternalLink className="h-3 w-3 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>

                            {(city || micromarket) && (
                              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                                <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                                <span className="truncate">
                                  {[micromarket, city]
                                    .filter(Boolean)
                                    .join(", ")}
                                </span>
                              </p>
                            )}
                          </div>
                        </Link>

                        {enquirySelection.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveFromEnquiry(propertyId);
                            }}
                            title="Remove from enquiry"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Your Contact Information
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Full Name <span className="text-red-500">*</span>
                    </span>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        name="fullName"
                        value={enquiryForm.fullName}
                        onChange={handleEnquiryChange}
                        autoComplete="name"
                        placeholder="John Doe"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-[#A054A0] focus:ring-2 focus:ring-[#A054A0]/20"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Phone Number <span className="text-red-500">*</span>
                    </span>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        type="tel"
                        name="phone"
                        value={enquiryForm.phone}
                        onChange={handleEnquiryChange}
                        autoComplete="tel"
                        placeholder="+91 98765 43210"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-[#A054A0] focus:ring-2 focus:ring-[#A054A0]/20"
                      />
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Company Name
                    </span>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        name="company"
                        value={enquiryForm.company}
                        onChange={handleEnquiryChange}
                        autoComplete="organization"
                        placeholder="Your company name"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-[#A054A0] focus:ring-2 focus:ring-[#A054A0]/20"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Email Address
                    </span>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        name="email"
                        value={enquiryForm.email}
                        onChange={handleEnquiryChange}
                        autoComplete="email"
                        placeholder="john@example.com"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-[#A054A0] focus:ring-2 focus:ring-[#A054A0]/20"
                      />
                    </div>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Message
                  </span>
                  <textarea
                    name="message"
                    value={enquiryForm.message}
                    onChange={handleEnquiryChange}
                    rows={3}
                    placeholder="Tell us about your requirement..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 outline-none transition focus:border-[#A054A0] focus:ring-2 focus:ring-[#A054A0]/20"
                  />
                </label>
              </div>

              {enquiryGuard.fields}

              <PrivacyNotice />

              {enquiryError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs font-medium text-red-700"
                >
                  {enquiryError}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingEnquiry}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#A054A0] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#A054A0]/25 transition hover:bg-[#864286] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A054A0] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingEnquiry ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Submitting Enquiry...
                    </>
                  ) : (
                    <>
                      Submit Enquiry
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="mt-3 text-center text-[11px] text-slate-400">
                  By submitting, you agree to be contacted by our advisors
                  regarding your selected property shortlist.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  
  );
}
