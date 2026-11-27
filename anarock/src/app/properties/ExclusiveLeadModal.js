"use client";

// "Find exclusive properties" request form (opened from the list page).
import PrivacyNotice from "@/components/common/PrivacyNotice";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";

export default function ExclusiveLeadModal({
  closeExclusiveLeadForm,
  exclusiveCountry,
  exclusiveCountryOpen,
  exclusiveCountryRef,
  exclusiveCountrySearch,
  exclusiveFieldErrors,
  exclusiveGuard,
  exclusiveLeadError,
  exclusiveLeadForm,
  exclusiveLeadSuccess,
  filteredExclusiveCountries,
  handleExclusiveLeadChange,
  handleExclusiveLeadSubmit,
  isSubmittingExclusiveLead,
  setExclusiveCountry,
  setExclusiveCountryOpen,
  setExclusiveCountrySearch,
  setExclusiveFieldErrors,
  setExclusiveLeadForm,
}) {
  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeExclusiveLeadForm();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exclusive-lead-title"
        className="my-auto w-full max-w-md overflow-visible rounded-xl bg-white shadow-2xl sm:max-w-[38rem]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#A054A0]">
              <Sparkles className="h-3 w-3" />
              Exclusive Property Assistance
            </div>

            <h2
              id="exclusive-lead-title"
              className="text-base font-bold text-slate-900 sm:text-lg"
            >
              Find your ideal office space
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 sm:whitespace-nowrap">
              Share your contact details and our team will help
              you explore more options.
            </p>
          </div>

          <button
            type="button"
            onClick={closeExclusiveLeadForm}
            disabled={isSubmittingExclusiveLead}
            aria-label="Close exclusive properties form"
            className="shrink-0 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-4 sm:px-5">
          {exclusiveLeadSuccess ? (
            <div className="py-7 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Thank you for reaching out!
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Your request has been received. Our team will
                connect with you about suitable office spaces.
              </p>

              <button
                type="button"
                onClick={closeExclusiveLeadForm}
                className="mt-6 rounded-xl bg-[#A054A0] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#864286]"
              >
                Continue Exploring
              </button>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={handleExclusiveLeadSubmit}
              className="space-y-3"
            >
              <div>
                <label
                  htmlFor="exclusive-name"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Full Name <span className="text-red-500">*</span>
                </label>

                <input
                  id="exclusive-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={160}
                  value={exclusiveLeadForm.name}
                  onChange={handleExclusiveLeadChange}
                  placeholder="Enter your full name"
                  aria-invalid={Boolean(exclusiveFieldErrors.name)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#A054A0] focus:ring-2 focus:ring-[#A054A0]/10 ${exclusiveFieldErrors.name ? "border-red-400" : "border-slate-200"}`}
                />
                {exclusiveFieldErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{exclusiveFieldErrors.name}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="exclusive-phone"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Phone Number <span className="text-red-500">*</span>
                </label>

                <div ref={exclusiveCountryRef} className="relative">
                  <div
                    className={`flex overflow-hidden rounded-lg border transition focus-within:border-[#A054A0] focus-within:ring-2 focus-within:ring-[#A054A0]/10 ${exclusiveFieldErrors.phone ? "border-red-400" : "border-slate-200"}`}
                  >
                    <button
                      type="button"
                      onClick={() => setExclusiveCountryOpen((open) => !open)}
                      aria-haspopup="listbox"
                      aria-expanded={exclusiveCountryOpen}
                      aria-label={`Country code ${exclusiveCountry.name} ${exclusiveCountry.dial}`}
                      className="flex shrink-0 items-center gap-1 border-r border-slate-200 bg-slate-50 px-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      <span className="text-[11px] font-semibold text-slate-500">
                        {exclusiveCountry.code}
                      </span>
                      {exclusiveCountry.dial}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${exclusiveCountryOpen ? "rotate-180 text-[#A054A0]" : ""}`}
                      />
                    </button>
                    <input
                      id="exclusive-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel-national"
                      inputMode="numeric"
                      required
                      value={exclusiveLeadForm.phone}
                      onChange={handleExclusiveLeadChange}
                      placeholder="Enter your phone number"
                      aria-invalid={Boolean(exclusiveFieldErrors.phone)}
                      className="min-w-0 flex-1 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>

                  {exclusiveCountryOpen && (
                    <div className="absolute left-0 top-[calc(100%+6px)] z-10 w-[280px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                      <div className="border-b border-slate-100 p-2">
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5">
                          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <input
                            type="text"
                            value={exclusiveCountrySearch}
                            onChange={(e) => setExclusiveCountrySearch(e.target.value)}
                            placeholder="Search country or code..."
                            autoFocus
                            className="h-8 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                      <div role="listbox" className="max-h-[200px] overflow-y-auto overscroll-contain p-1">
                        {filteredExclusiveCountries.length > 0 ? (
                          filteredExclusiveCountries.map((country) => {
                            const selected =
                              country.code === exclusiveCountry.code &&
                              country.dial === exclusiveCountry.dial;
                            return (
                              <button
                                key={`${country.code}-${country.dial}`}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  setExclusiveCountry(country);
                                  setExclusiveCountryOpen(false);
                                  setExclusiveCountrySearch("");
                                  setExclusiveLeadForm((prev) => ({
                                    ...prev,
                                    phone: prev.phone.replace(/\D/g, "").slice(0, country.max),
                                  }));
                                  setExclusiveFieldErrors((prev) => ({ ...prev, phone: "" }));
                                }}
                                className={`flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${selected
                                  ? "bg-[#A054A0] font-semibold text-white"
                                  : "text-slate-800 hover:bg-[#A054A0]/10 hover:text-[#A054A0]"
                                  }`}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <span className="w-6 shrink-0 text-[11px] font-semibold opacity-70">
                                    {country.code}
                                  </span>
                                  <span className="truncate">{country.name}</span>
                                </span>
                                <span className="flex shrink-0 items-center gap-1.5 text-xs">
                                  {country.dial}
                                  {selected && <Check className="h-3.5 w-3.5" />}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <p className="px-3 py-5 text-center text-sm text-slate-500">
                            No country found
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {exclusiveFieldErrors.phone && (
                  <p className="mt-1 text-xs text-red-600">{exclusiveFieldErrors.phone}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="exclusive-email"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Email Address
                </label>

                <input
                  id="exclusive-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={exclusiveLeadForm.email}
                  onChange={handleExclusiveLeadChange}
                  placeholder="you@company.com"
                  aria-invalid={Boolean(exclusiveFieldErrors.email)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#A054A0] focus:ring-2 focus:ring-[#A054A0]/10 ${exclusiveFieldErrors.email ? "border-red-400" : "border-slate-200"}`}
                />
                {exclusiveFieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{exclusiveFieldErrors.email}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="exclusive-company"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Company Name
                </label>

                <input
                  id="exclusive-company"
                  name="company"
                  type="text"
                  autoComplete="organization"
                  maxLength={150}
                  value={exclusiveLeadForm.company}
                  onChange={handleExclusiveLeadChange}
                  placeholder="Enter your company name"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#A054A0] focus:ring-2 focus:ring-[#A054A0]/10"
                />
              </div>
              </div>

              {exclusiveGuard.fields}

              <PrivacyNotice />

              {exclusiveLeadError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-100 bg-red-50 p-2.5 text-xs text-red-700"
                >
                  {exclusiveLeadError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingExclusiveLead}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#A054A0] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#864286] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingExclusiveLead ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    Connect with our team
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] leading-4 text-slate-400">
                Your details will be used to respond to your property
                enquiry.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  
  );
}
