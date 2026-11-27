"use client";

// "Request a callback" dialog opened from the header. It is mounted only while
// open, so every opening starts with an empty form.
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  X,
} from "lucide-react";
import PrivacyNotice from "@/components/common/PrivacyNotice";
import {
  SECURITY_CHECK_MESSAGE,
  useFormGuard,
} from "@/components/common/FormGuard";
import { PHONE_COUNTRIES as phoneCountries } from "@/lib/phoneCountries";

// Where the country list opens: below the button, or above it when there is
// not enough room below.
function countryMenuPosition(rect) {
  if (!rect) return { top: 0, left: 12 };
  const height = Math.min(330, window.innerHeight - 24);
  const spaceBelow = window.innerHeight - rect.bottom;
  const top =
    spaceBelow < height && rect.top > height
      ? Math.max(12, rect.top - height - 8)
      : Math.min(rect.bottom + 8, window.innerHeight - height - 12);
  const left = Math.min(Math.max(12, rect.left), window.innerWidth - 310 - 12);
  return { top, left };
}

export default function EnquiryDialog({ onClose, currencyCode, unit }) {
  const enquiryOpen = true;
  const [countryPosition, setCountryPosition] = useState({ top: 0, left: 12 });
  const enquiryGuard = useFormGuard();
  const enquiryDialogRef = useRef(null);
  const [enquiryStep, setEnquiryStep] = useState(1);
  const [enquiryStatus, setEnquiryStatus] = useState("form");
  const [pendingLeadPayload, setPendingLeadPayload] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [emailError, setEmailError] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(phoneCountries[0]);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countrySearchRef = useRef(null);
  const countryButtonRef = useRef(null);
  const phoneInputRef = useRef(null);
  const thankYouTimerRef = useRef(null);

  const closeEnquiry = () => {
    if (thankYouTimerRef.current) {
      clearTimeout(thankYouTimerRef.current);
      thankYouTimerRef.current = null;
    }
    onClose();
  };

  const handleModalClose = async () => {
    if (
      enquiryStep === 2 &&
      pendingLeadPayload &&
      enquiryStatus !== "success" &&
      !isSubmitting
    ) {
      return;
    }
    closeEnquiry();
  };

  // Escape closes the country list and the dialog (unless the visitor is on
  // the second step with details still to send).
  const onEscape = useEffectEvent(() => {
    setCountryOpen(false);
    handleModalClose();
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (thankYouTimerRef.current) {
        clearTimeout(thankYouTimerRef.current);
      }
    };
  }, []);

  // Keyboard focus stays inside the open enquiry dialog and returns to the
  // button that opened it when the dialog closes.
  useEffect(() => {
    if (!enquiryOpen) return undefined;
    const opener = document.activeElement;

    const focusableItems = () => {
      const dialog = enquiryDialogRef.current;
      if (!dialog) return [];
      return [
        ...dialog.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((item) => item.getClientRects().length > 0);
    };

    const handleTab = (event) => {
      if (event.key !== "Tab") return;
      const dialog = enquiryDialogRef.current;
      const items = focusableItems();
      if (!dialog || items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => {
      document.removeEventListener("keydown", handleTab);
      if (opener && typeof opener.focus === "function" && document.contains(opener)) {
        opener.focus();
      }
    };
  }, [enquiryOpen]);

  // Move focus into the dialog when it opens and when its step changes.
  useEffect(() => {
    if (!enquiryOpen) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const dialog = enquiryDialogRef.current;
      const field = dialog?.querySelector(
        'form input:not([tabindex="-1"]):not([type="hidden"])',
      );
      (field || dialog)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [enquiryOpen, enquiryStep, enquiryStatus]);

  useEffect(() => {
    if (!countryOpen) return;
    const timer = setTimeout(() => {
      countrySearchRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [countryOpen]);


  const normalizePhoneInput = (rawValue, currentCountry = selectedCountry) => {
    const raw = String(rawValue || "").trim();
    if (!raw) {
      return { country: currentCountry, digits: "", countryDetected: false };
    }

    const allDigits = raw.replace(/\D/g, "");
    const sortedCountries = [...phoneCountries].sort(
      (a, b) => b.dial.length - a.dial.length,
    );

    let detectedCountry = currentCountry;
    let localDigits = allDigits;
    let countryDetected = false;
    const hasPlusSign = raw.startsWith("+");

    const matchedCountry = sortedCountries.find((country) => {
      const dialDigits = country.dial.replace("+", "");
      if (hasPlusSign) {
        return allDigits.startsWith(dialDigits);
      }
      return (
        allDigits.startsWith(dialDigits) &&
        allDigits.length > dialDigits.length &&
        allDigits.length - dialDigits.length >= country.min
      );
    });

    if (matchedCountry) {
      detectedCountry = matchedCountry;
      const dialDigits = matchedCountry.dial.replace("+", "");
      localDigits = allDigits.slice(dialDigits.length);
      countryDetected = true;
    }

    localDigits = localDigits.replace(/^0+/, "");
    if (localDigits.length > detectedCountry.max) {
      localDigits = localDigits.slice(0, detectedCountry.max);
    }

    return { country: detectedCountry, digits: localDigits, countryDetected };
  };

  const validatePhone = (value = phone, country = selectedCountry) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) {
      setPhoneError("Phone number is required.");
      return false;
    }
    if (digits.length < country.min) {
      if (country.min === country.max) {
        setPhoneError(`Phone number must be exactly ${country.min} digits.`);
      } else {
        setPhoneError(
          `Phone number must be between ${country.min} and ${country.max} digits.`,
        );
      }
      return false;
    }
    if (digits.length > country.max) {
      setPhoneError(
        `Phone number cannot exceed ${country.max} digits for ${country.name}.`,
      );
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setCountryOpen(false);
    setCountrySearch("");

    const digits = phone.replace(/\D/g, "");
    setPhone(digits);

    if (!digits) {
      setPhoneError("");
      return;
    }
    validatePhone(digits, country);
  };

  const handlePhoneInputChange = (rawValue) => {
    const { country, digits, countryDetected } = normalizePhoneInput(
      rawValue,
      selectedCountry,
    );
    if (countryDetected && country.code !== selectedCountry.code) {
      setSelectedCountry(country);
    }
    setPhone(digits);
    if (!digits) {
      setPhoneError("");
      return;
    }
    validatePhone(digits, country);
  };

  const filteredCountries = phoneCountries.filter((country) => {
    const search = countrySearch.trim().toLowerCase();
    if (!search) return true;
    return (
      country.name.toLowerCase().includes(search) ||
      country.code.toLowerCase().includes(search) ||
      country.dial.includes(search)
    );
  });

  const mapLocationToLeadOwnerTeam = (city, state) => {
    const cityLower = String(city || "")
      .trim()
      .toLowerCase();
    const stateLower = String(state || "")
      .trim()
      .toLowerCase();

    if (cityLower.includes("bengaluru") || cityLower.includes("bangalore"))
      return "Bengaluru";
    if (cityLower.includes("chennai")) return "Chennai";
    if (cityLower.includes("hyderabad")) return "Hyderabad";
    if (cityLower.includes("kolkata")) return "Kolkata";
    if (cityLower.includes("pune")) return "Pune";
    if (
      cityLower.includes("mumbai") ||
      cityLower.includes("ahmedabad") ||
      cityLower.includes("surat") ||
      cityLower.includes("jaipur") ||
      stateLower.includes("maharashtra") ||
      stateLower.includes("gujarat") ||
      stateLower.includes("goa") ||
      stateLower.includes("rajasthan")
    ) {
      return "West";
    }
    if (
      cityLower.includes("agra") ||
      cityLower.includes("delhi") ||
      cityLower.includes("noida") ||
      cityLower.includes("gurugram") ||
      cityLower.includes("gurgaon") ||
      cityLower.includes("chandigarh") ||
      stateLower.includes("delhi") ||
      stateLower.includes("haryana") ||
      stateLower.includes("punjab") ||
      stateLower.includes("uttar pradesh") ||
      stateLower.includes("uttarakhand")
    ) {
      return "North";
    }
    return "Platform";
  };

  const submitLeadToCRM = async (email = "", company = "") => {
    if (!pendingLeadPayload || isSubmitting) return;

    if (!enquiryGuard.ready) {
      setSubmitError(SECURITY_CHECK_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setEmailError("");

    const finalPayload = {
      ...pendingLeadPayload,
      email: email.trim(),
      company: company.trim(),
      ...enquiryGuard.values(),
    };

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalPayload),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || "Unable to create/update lead in CRM.",
        );
      }
      setEnquiryStatus("success");
      thankYouTimerRef.current = setTimeout(() => {
        closeEnquiry();
      }, 5000);
    } catch (error) {
      console.error("CRM Lead creation error:", error);

      setSubmitError(
        error?.message || "Something went wrong while creating the lead.",
      );
    } finally {
      enquiryGuard.afterSubmit();
      setIsSubmitting(false);
    }
  };

  const handleFormOneSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    const form = event.currentTarget;
    const cleanPhone = phone.replace(/\D/g, "");

    const isPhoneValid = validatePhone(cleanPhone, selectedCountry);

    if (!form.checkValidity() || !isPhoneValid) {
      form.reportValidity();
      return;
    }

    setSubmitError("");

    const formData = new FormData(form);
    let physicalStreet = "";
    let physicalCity = "";
    let physicalState = "";
    let physicalCountry = "";
    let physicalPincode = "";

    try {
      const savedLocation = sessionStorage.getItem("anarock_user_location");

      if (savedLocation) {
        const parsedLocation = JSON.parse(savedLocation);

        physicalStreet = String(parsedLocation?.area || "").trim();
        physicalCity = String(parsedLocation?.city || "").trim();
        physicalState = String(parsedLocation?.state || "").trim();
        physicalCountry = String(parsedLocation?.country || "").trim();
        physicalPincode = String(parsedLocation?.pincode || "").trim();
      }
    } catch (error) {
      console.error("Unable to read physical user location:", error);
    }

    let requirementCity = "";
    let requirementType = "";

    try {
      const searchParams = new URLSearchParams(window.location.search);

      const urlCity = String(searchParams.get("city") || "").trim();
      const urlType = String(searchParams.get("type") || "").trim();

      if (urlCity) {
        requirementCity = urlCity;
      }

      if (urlType && urlType.toLowerCase() !== "ai") {
        requirementType = urlType;
      }
    } catch (error) {
      console.error("Unable to read URL search filters:", error);
    }
    if (!requirementCity || !requirementType) {
      try {
        const lastSearched = localStorage.getItem(
          "anarock_last_searched_location",
        );

        if (lastSearched) {
          const parsedSearch = JSON.parse(lastSearched);

          if (!requirementCity) {
            requirementCity = String(parsedSearch?.city || "").trim();
          }

          if (!requirementType) {
            requirementType = String(parsedSearch?.propertyType || "").trim();
          }
        }
      } catch (error) {
        console.error("Unable to read last Hero search:", error);
      }
    }

    const name = String(formData.get("name") || "").trim();
    const nameParts = name.split(/\s+/).filter(Boolean);
    let firstName = "";
    let lastName = "";

    if (nameParts.length === 1) {
      firstName = nameParts[0];
      lastName = "";
    } else {
      firstName = nameParts.slice(0, -1).join(" ");
      lastName = nameParts[nameParts.length - 1];
    }

    const fullPhone = `${selectedCountry.dial}${cleanPhone}`;

    const finalLeadOwnerTeam = mapLocationToLeadOwnerTeam(
      physicalCity,
      physicalState,
    );

    const payload = {
      firstName,
      lastName,
      phone: fullPhone,
      street: physicalStreet,
      city: physicalCity,
      state: physicalState,
      country: physicalCountry,
      pincode: physicalPincode,
      requirementCity: requirementCity || "",
      requirementType: requirementType || "",
      leadSource: "Listing Platform",
      leadStatus: "Not Contacted",
      subLeadSource: "Request a Callback",
      leadOwnerTeam: finalLeadOwnerTeam,
      preferredCurrency: currencyCode,
      preferredUnit: unit,
      countryCode: selectedCountry.code,
      countryDialCode: selectedCountry.dial,
    };
    setPendingLeadPayload(payload);
    setEnquiryStep(2);
  };

  const handleFormTwoSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const company = String(formData.get("company") || "").trim();

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setEmailError("Please enter a valid email address.");
        return;
      }
    }

    setEmailError("");
    await submitLeadToCRM(email, company);
  };

  const handleSkipFormTwo = async () => {
    await submitLeadToCRM("", "");
  };



  return (
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm animate-[navbarFadeIn_200ms_ease-out] sm:p-4 md:p-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            handleModalClose();
          }
        }}
      >
        <div
          ref={enquiryDialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="enquiry-title"
          className="relative flex max-h-[85dvh] outline-none w-full max-w-[580px] 2xl:max-w-[700px] flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-2xl backdrop-blur-2xl animate-[navbarPopup_280ms_cubic-bezier(0.16,1,0.3,1)]"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#A054A0]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-24 h-56 w-56 rounded-full bg-[#A054A0]/10 blur-3xl" />

          <button
            type="button"
            onClick={handleModalClose}
            aria-label="Close enquiry form"
            className="absolute right-3.5 top-3.5 z-30 flex h-9 w-9 items-center justify-center rounded-lg border border-white/90 bg-white/90 text-black shadow-sm backdrop-blur-md transition-all duration-200 hover:rotate-90 hover:bg-white hover:text-[#A054A0] hover:shadow-md active:scale-95 sm:right-5 sm:top-5 sm:h-10 sm:w-10 2xl:h-12 2xl:w-12"
          >
            <X size={18} strokeWidth={2} className="2xl:h-6 2xl:w-6" />
          </button>

          {enquiryStatus === "success" ? (
            <div className="relative flex min-h-[380px] flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[430px] sm:px-10 2xl:min-h-[520px]">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#A054A0] text-white shadow-lg animate-[successPop_450ms_cubic-bezier(0.16,1,0.3,1)] sm:h-24 sm:w-24 2xl:h-28 2xl:w-28">
                <CheckCircle2
                  size={42}
                  strokeWidth={2}
                  className="2xl:h-14 2xl:w-14"
                />
              </div>

              <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#A054A0] sm:text-[13px] 2xl:text-[14px]">
                Thank you
              </p>

              <h2 id="enquiry-title" className="max-w-[440px] text-[24px] font-bold tracking-[-0.02em] text-black sm:text-[27px] lg:text-[30px] 2xl:text-[32px]">
                Your enquiry has been received
              </h2>

              <p className="mt-3 text-[14px] leading-6 text-black/70 sm:text-[15px] 2xl:text-[16px]">
                Our team will get back to you shortly.
              </p>

              <p className="mt-7 rounded-lg border border-[#A054A0]/20 bg-white/80 px-4 py-2 text-[12px] font-medium text-[#A054A0] shadow-sm backdrop-blur-md sm:text-[13px] 2xl:text-[14px]">
                This window will close automatically.
              </p>
            </div>
          ) : enquiryStep === 1 ? (
            <>
              <div className="relative shrink-0 border-b border-[#A054A0]/15 bg-white/50 px-5 pb-5 pt-6 backdrop-blur-md sm:px-8 sm:pb-6 sm:pt-7 2xl:px-10 2xl:pb-6 2xl:pt-7">
                <h2
                  id="enquiry-title"
                  className="pr-10 text-[21px] font-bold tracking-[-0.025em] text-black sm:text-[25px] lg:text-[28px] 2xl:text-[32px]"
                >
                  Tell us what you’re looking for
                </h2>

                <p className="mt-1.5 max-w-[480px] text-[12px] leading-5 text-black/70 sm:text-[14px] sm:leading-6 2xl:text-[16px] 2xl:leading-7">
                  Share your contact info and our team will get back to you.
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                <form
                  key="enquiry-step-1"
                  onSubmit={handleFormOneSubmit}
                  className="px-4 py-4 sm:px-8 sm:py-6 2xl:px-8 2xl:py-7"
                >
                  <div className="space-y-4 2xl:space-y-6">
                    <div>
                      <label
                        htmlFor="enquiry-name"
                        className="mb-1.5 block text-[13px] font-bold text-black sm:text-[14px] 2xl:text-[15px]"
                      >
                        Full Name<span className="text-[#A054A0]">*</span>
                      </label>

                      <input
                        id="enquiry-name"
                        name="name"
                        type="text"
                        placeholder="Enter your name"
                        required
                        autoComplete="name"
                        className="h-10 w-full rounded-lg border border-[#A054A0]/20 bg-white/70 px-4 text-[15px] font-medium text-black shadow-sm outline-none backdrop-blur-md transition-all duration-200 placeholder:text-black/40 hover:bg-white focus:border-[#A054A0] focus:bg-white focus:ring-2 focus:ring-[#A054A0]/20 sm:h-[46px] sm:text-[15px] 2xl:h-[54px] 2xl:text-[16px] 2xl:px-5"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="enquiry-phone"
                        className="mb-1.5 block text-[13px] font-bold text-black sm:text-[14px] 2xl:text-[15px]"
                      >
                        Phone Number <span className="text-[#A054A0]">*</span>
                      </label>

                      <div className="relative w-full">
                        <div
                          className={`flex h-10 w-full rounded-lg border bg-white/70 shadow-sm backdrop-blur-md transition-all duration-200 sm:h-[46px] 2xl:h-[54px] ${phoneError
                            ? "border-[#A054A0] ring-2 ring-[#A054A0]/10"
                            : "border-[#A054A0]/20 focus-within:border-[#A054A0] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#A054A0]/20"
                            }`}
                        >
                          <div className="relative shrink-0">
                            <button
                              ref={countryButtonRef}
                              type="button"
                              onClick={() => {
                                if (!countryOpen) {
                                  setCountryPosition(
                                    countryMenuPosition(
                                      countryButtonRef.current?.getBoundingClientRect(),
                                    ),
                                  );
                                }
                                setCountryOpen((prev) => !prev);
                              }}
                              aria-expanded={countryOpen}
                              aria-haspopup="listbox"
                              className="flex h-full items-center gap-1.5 rounded-l-xl border-r border-[#A054A0]/20 bg-white/60 px-3 text-[14px] font-semibold text-black outline-none transition-all duration-150 hover:bg-white active:scale-95 sm:px-3 sm:text-[14px] 2xl:px-4.5 2xl:text-[15px]"
                            >
                              <span className="text-[18px] leading-none 2xl:text-[22px]">
                                {selectedCountry.flag}
                              </span>

                              <span>{selectedCountry.dial}</span>

                              <ChevronDown
                                size={14}
                                strokeWidth={2}
                                className={`transition-transform duration-200 ${countryOpen
                                  ? "rotate-180 text-[#A054A0]"
                                  : "text-black"
                                  }`}
                              />
                            </button>

                            {countryOpen &&
                              typeof document !== "undefined" &&
                              createPortal(
                                <div
                                  className="fixed inset-0 z-[9998]"
                                  onMouseDown={(e) => {
                                    if (e.target === e.currentTarget) {
                                      setCountryOpen(false);
                                    }
                                  }}
                                >
                                  <div
                                    className="fixed z-[9999] w-[310px] max-w-[calc(100vw-20px)] overflow-hidden rounded-2xl border border-white/90 bg-white/95 shadow-2xl backdrop-blur-2xl"
                                    style={{
                                      top: countryPosition.top,
                                      left: countryPosition.left,
                                      maxHeight: "calc(100vh - 24px)",
                                    }}
                                  >
                                    <div className="border-b border-black/10 p-3">
                                      <div className="flex items-center gap-2 rounded-lg border border-[#A054A0]/20 bg-white/70 px-3 shadow-inner">
                                        <Search
                                          size={14}
                                          className="shrink-0 text-black/40"
                                        />

                                        <input
                                          ref={countrySearchRef}
                                          type="text"
                                          value={countrySearch ?? ""}
                                          onChange={(e) =>
                                            setCountrySearch(e.target.value)
                                          }
                                          placeholder="Search country..."
                                          className="h-9 min-w-0 flex-1 bg-transparent text-[14px] font-medium text-black outline-none placeholder:text-black/40"
                                        />

                                        {countrySearch && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setCountrySearch("")
                                            }
                                            className="flex h-5 w-5 items-center justify-center rounded-lg hover:bg-black/10"
                                          >
                                            <X size={12} className="text-black" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="max-h-[250px] overflow-y-auto overscroll-contain p-1.5">
                                      {filteredCountries.length > 0 ? (
                                        filteredCountries.map((country) => {
                                          const isSelected =
                                            country.code ===
                                            selectedCountry.code &&
                                            country.dial ===
                                            selectedCountry.dial;

                                          return (
                                            <button
                                              key={`${country.code}-${country.dial}`}
                                              type="button"
                                              onClick={() =>
                                                handleCountrySelect(country)
                                              }
                                              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-150 ${isSelected
                                                ? "bg-[#A054A0] font-semibold text-white"
                                                : "text-black hover:bg-[#A054A0]/10 hover:text-[#A054A0]"
                                                }`}
                                            >
                                              <span className="text-[18px] leading-none">
                                                {country.flag}
                                              </span>

                                              <span className="min-w-0 flex-1 truncate text-[14px]">
                                                {country.name}
                                              </span>

                                              <span
                                                className={`text-[13px] font-medium ${isSelected
                                                  ? "text-white/90"
                                                  : "text-black/60"
                                                  }`}
                                              >
                                                {country.dial}
                                              </span>

                                              {isSelected && (
                                                <Check
                                                  size={14}
                                                  className="shrink-0 text-white"
                                                />
                                              )}
                                            </button>
                                          );
                                        })
                                      ) : (
                                        <div className="px-3 py-6 text-center text-[13px] text-black/60">
                                          No country found
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>,
                                document.body,
                              )}
                          </div>

                          <input
                            ref={phoneInputRef}
                            id="enquiry-phone"
                            name="phone"
                            type="tel"
                            inputMode="tel"
                            value={phone ?? ""}
                            onChange={(e) =>
                              handlePhoneInputChange(e.target.value)
                            }
                            onInput={(e) =>
                              handlePhoneInputChange(e.currentTarget.value)
                            }
                            placeholder="Enter phone number"
                            required
                            autoComplete="tel"
                            className="w-full flex-1 rounded-r-xl bg-transparent px-3 text-[14px] font-medium text-black outline-none placeholder:text-black/40 sm:text-[15px] 2xl:text-[17px] 2xl:px-5"
                          />
                        </div>
                      </div>

                      {phoneError ? (
                        <p className="mt-1.5 text-[12px] font-medium leading-4 text-[#A054A0] 2xl:text-[13px]">
                          {phoneError}
                        </p>
                      ) : phone ? (
                        <p className="mt-1.5 text-[11px] text-black/60 2xl:text-[12px]">
                          {selectedCountry.min === selectedCountry.max
                            ? `${selectedCountry.min} digits required`
                            : `${selectedCountry.min}-${selectedCountry.max} digits required`}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {submitError && (
                    <div
                      role="alert"
                      className="mt-4 rounded-lg border border-[#A054A0]/30 bg-[#A054A0]/10 px-4 py-3 text-[13px] leading-5 text-[#A054A0] shadow-sm backdrop-blur-md animate-[errorShake_250ms_ease-out] 2xl:text-[14px]"
                    >
                      {submitError}
                    </div>
                  )}

                  <PrivacyNotice className="mt-4" />

                  <button
                    type="submit"
                    className="group relative mt-6 flex h-[48px] w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-[#A054A0] text-[15px] font-bold text-white shadow-md transition-all duration-200 hover:bg-[#8d478d] hover:shadow-lg active:scale-98 sm:h-[50px] sm:text-[15px] 2xl:h-[58px] 2xl:text-[17px]"
                  >
                    <span className="relative z-10">Next</span>
                    <ArrowUpRight
                      size={18}
                      strokeWidth={2}
                      className="relative z-10 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 2xl:h-6 2xl:w-6"
                    />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              <div className="relative shrink-0 border-b border-[#A054A0]/15 bg-white/50 px-5 pb-5 pt-6 backdrop-blur-md sm:px-8 sm:pb-6 sm:pt-7 2xl:px-10 2xl:pb-6 2xl:pt-7">
                <h2
                  id="enquiry-title"
                  className="pr-10 text-[21px] font-bold tracking-[-0.025em] text-black sm:text-[25px] lg:text-[28px] 2xl:text-[32px]"
                >
                  Almost done!
                </h2>

                <p className="mt-1.5 max-w-[480px] text-[12px] leading-5 text-black/70 sm:text-[14px] sm:leading-6 2xl:text-[16px] 2xl:leading-7">
                  Provide your email and company name to help us serve you
                  better.
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                <form
                  key="enquiry-step-2"
                  onSubmit={handleFormTwoSubmit}
                  className="px-4 py-4 sm:px-8 sm:py-6 2xl:px-8 2xl:py-7"
                >
                  <div className="space-y-4 2xl:space-y-6">
                    <div>
                      <label
                        htmlFor="enquiry-email"
                        className="mb-1.5 block text-[13px] font-bold text-black sm:text-[14px] 2xl:text-[15px]"
                      >
                        Email Address
                      </label>

                      <input
                        id="enquiry-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        autoComplete="email"
                        value={email ?? ""}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          if (emailError) {
                            setEmailError("");
                          }
                        }}
                        className={`h-10 w-full rounded-lg border bg-white/70 px-4 text-[15px] font-medium text-black shadow-sm outline-none backdrop-blur-md transition-all duration-200 placeholder:text-black/40 hover:bg-white focus:bg-white sm:h-[46px] sm:text-[15px] ${emailError
                          ? "border-[#A054A0] ring-2 ring-[#A054A0]/10"
                          : "border-[#A054A0]/20 focus:border-[#A054A0] focus:ring-2 focus:ring-[#A054A0]/20"
                          }`}
                      />
                      {emailError && (
                        <p className="mt-1.5 text-[12px] font-medium leading-4 text-[#A054A0] 2xl:text-[13px]">
                          {emailError}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="enquiry-company"
                        className="mb-1.5 block text-[13px] font-bold text-black sm:text-[14px] 2xl:text-[15px]"
                      >
                        Company Name
                      </label>
                      <input
                        id="enquiry-company"
                        name="company"
                        type="text"
                        placeholder="Enter your company name"
                        autoComplete="organization"
                        value={company ?? ""}
                        onChange={(event) => setCompany(event.target.value)}
                        className="h-10 w-full rounded-lg border border-[#A054A0]/20 bg-white/70 px-4 text-[15px] font-medium text-black shadow-sm outline-none backdrop-blur-md transition-all duration-200 placeholder:text-black/40 hover:bg-white focus:border-[#A054A0] focus:bg-white focus:ring-2 focus:ring-[#A054A0]/20 sm:h-[46px] sm:text-[15px] 2xl:h-[54px] 2xl:text-[16px] 2xl:px-5"
                      />
                    </div>
                  </div>

                  {enquiryGuard.fields}

                  {submitError && (
                    <div
                      role="alert"
                      className="mt-4 rounded-lg border border-[#A054A0]/30 bg-[#A054A0]/10 px-4 py-3 text-[13px] leading-5 text-[#A054A0] shadow-sm backdrop-blur-md animate-[errorShake_250ms_ease-out] 2xl:text-[14px]"
                    >
                      {submitError}
                    </div>
                  )}

                  <PrivacyNotice className="mt-4" />

                  <div className="mt-6 gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="group relative w-full flex h-[48px] flex-1 items-center justify-center gap-2 overflow-hidden rounded-lg bg-[#A054A0] text-[15px] font-bold text-white shadow-md transition-all duration-200 hover:bg-[#8d478d] hover:shadow-lg active:scale-98 disabled:cursor-not-allowed disabled:opacity-70 sm:h-[50px] sm:text-[15px] 2xl:h-[58px] 2xl:text-[17px]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2
                            size={18}
                            className="relative z-10 animate-spin 2xl:h-6 2xl:w-6"
                          />
                          <span className="relative z-10">Submitting...</span>
                        </>
                      ) : (
                        <>
                          <span className="relative z-10">
                            Submit Enquiry
                          </span>
                          <ArrowUpRight
                            size={18}
                            strokeWidth={2}
                            className="relative z-10 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 2xl:h-6 2xl:w-6"
                          />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleSkipFormTwo}
                      disabled={isSubmitting}
                      className="mt-3 flex h-[48px] w-full items-center justify-center rounded-lg border border-[#A054A0]/20 px-6 text-[13px] font-semibold text-black transition-all duration-200 hover:border-[#A054A0] hover:text-[#A054A0] active:scale-98 disabled:cursor-not-allowed disabled:opacity-60 sm:h-[50px] sm:text-[15px] 2xl:h-[58px] 2xl:text-[17px]"
                    >
                      - Skip -
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
  );
}
