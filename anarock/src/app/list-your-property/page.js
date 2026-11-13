"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    Check,
    CheckCircle2,
    ChevronDown,
    FileCheck2,
    Info,
    Loader2,
    MapPin,
    Phone,
    Search,
    ShieldCheck,
    Sparkles,
    UserRound,
} from "lucide-react";
import { usePreferences } from "@/lib/preferences";

const STEPS = [
    "Property details",
    "Contact details",
    "Choose method",
    "Complete listing",
    "Review",
];

const initialForm = {
    buildingName: "",
    propertyType: "",
    city: "",
    micromarket: "",
    address: "",
    developer: "",
    companyName: "",
    contactName: "",
    phone: "",
    email: "",
    area: "",
    seats: "",
    rentMin: "",
    rentMax: "",
    seatPriceMin: "",
    seatPriceMax: "",
    description: "",
};

const propertyTypes = [
    {
        value: "conventional",
        label: "Conventional Office",
        description: "Office spaces, commercial buildings & managed offices",
    },
    {
        value: "coworking",
        label: "Coworking",
        description: "Coworking spaces, flexible offices & managed workspaces",
    },
];

// Same country list as the home page and city page forms.
const PHONE_COUNTRIES = [
    { name: "India", code: "IN", dial: "+91", min: 10, max: 10 },
    { name: "United States", code: "US", dial: "+1", min: 10, max: 10 },
    { name: "Canada", code: "CA", dial: "+1", min: 10, max: 10 },
    { name: "United Kingdom", code: "GB", dial: "+44", min: 10, max: 10 },
    { name: "United Arab Emirates", code: "AE", dial: "+971", min: 9, max: 9 },
    { name: "Australia", code: "AU", dial: "+61", min: 9, max: 9 },
    { name: "Singapore", code: "SG", dial: "+65", min: 8, max: 8 },
    { name: "Germany", code: "DE", dial: "+49", min: 10, max: 11 },
    { name: "France", code: "FR", dial: "+33", min: 9, max: 9 },
    { name: "Italy", code: "IT", dial: "+39", min: 9, max: 10 },
    { name: "Spain", code: "ES", dial: "+34", min: 9, max: 9 },
    { name: "Netherlands", code: "NL", dial: "+31", min: 9, max: 9 },
    { name: "Switzerland", code: "CH", dial: "+41", min: 9, max: 9 },
    { name: "Ireland", code: "IE", dial: "+353", min: 9, max: 9 },
    { name: "New Zealand", code: "NZ", dial: "+64", min: 8, max: 10 },
    { name: "Japan", code: "JP", dial: "+81", min: 10, max: 10 },
    { name: "South Korea", code: "KR", dial: "+82", min: 9, max: 10 },
    { name: "China", code: "CN", dial: "+86", min: 11, max: 11 },
    { name: "Hong Kong", code: "HK", dial: "+852", min: 8, max: 8 },
    { name: "Malaysia", code: "MY", dial: "+60", min: 9, max: 10 },
    { name: "Thailand", code: "TH", dial: "+66", min: 9, max: 9 },
    { name: "Israel", code: "IL", dial: "+972", min: 9, max: 9 },
    { name: "Indonesia", code: "ID", dial: "+62", min: 9, max: 12 },
    { name: "Philippines", code: "PH", dial: "+63", min: 10, max: 10 },
    { name: "Vietnam", code: "VN", dial: "+84", min: 9, max: 10 },
    { name: "South Africa", code: "ZA", dial: "+27", min: 9, max: 9 },
    { name: "Saudi Arabia", code: "SA", dial: "+966", min: 9, max: 9 },
    { name: "Qatar", code: "QA", dial: "+974", min: 8, max: 8 },
    { name: "Kuwait", code: "KW", dial: "+965", min: 8, max: 8 },
    { name: "Oman", code: "OM", dial: "+968", min: 8, max: 8 },
    { name: "Bahrain", code: "BH", dial: "+973", min: 8, max: 8 },
    { name: "Pakistan", code: "PK", dial: "+92", min: 10, max: 10 },
    { name: "Bangladesh", code: "BD", dial: "+880", min: 10, max: 10 },
    { name: "Nepal", code: "NP", dial: "+977", min: 10, max: 10 },
    { name: "Sri Lanka", code: "LK", dial: "+94", min: 9, max: 9 },
    { name: "Russia", code: "RU", dial: "+7", min: 10, max: 10 },
    { name: "Brazil", code: "BR", dial: "+55", min: 10, max: 11 },
    { name: "Mexico", code: "MX", dial: "+52", min: 10, max: 10 },
    { name: "Argentina", code: "AR", dial: "+54", min: 10, max: 11 },
    { name: "Turkey", code: "TR", dial: "+90", min: 10, max: 10 },
];

// Same symbols as src/lib/format.js, used for the price fields.
const CURRENCY_SYMBOLS = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "د.إ ",
    SGD: "S$",
};

const ROUTE_CITY_STORAGE_KEYS = [
    "routeCity",
    "selectedCity",
    "userCity",
    "currentCity",
    "city",
    "locationCity",
    "userLocationCity",
];

function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function isValidEmail(value) {
    const email = String(value || "").trim();
    if (email.length > 254 || /\s/.test(email)) return false;
    return /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(
        email,
    );
}

function isValidPhone(digits, country) {
    if (country.code === "IN") {
        return /^[6-9]\d{9}$/.test(digits);
    }
    return digits.length >= country.min && digits.length <= country.max;
}

// The visitor location saved by the site (same one the navbar shows).
function getUserLocation() {
    const empty = { street: "", state: "", country: "", city: "", pincode: "" };
    if (typeof window === "undefined") return empty;
    try {
        const saved = JSON.parse(
            window.sessionStorage.getItem("anarock_user_location") || "null",
        );
        if (!saved || typeof saved !== "object") return empty;
        const text = (value) => String(value || "").trim();
        return {
            street: text(saved.area),
            state: text(saved.state),
            country: text(saved.country),
            city: text(saved.city),
            pincode: text(saved.pincode),
        };
    } catch {
        return empty;
    }
}

function uniqueValues(values) {
    const seen = new Set();
    return values
        .map((value) => String(value || "").trim())
        .filter((value) => {
            const key = normalize(value);
            if (!key || seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
}

function getStorageCity() {
    if (typeof window === "undefined") {
        return "";
    }
    try {
        for (const key of ROUTE_CITY_STORAGE_KEYS) {
            const raw = window.localStorage.getItem(key);
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw);
                if (typeof parsed === "string" && parsed.trim()) {
                    return parsed.trim();
                }
                const city =
                    parsed?.city ??
                    parsed?.City ??
                    parsed?.name ??
                    parsed?.Name ??
                    parsed?.location?.city ??
                    parsed?.address?.city ??
                    parsed?.result?.city ??
                    "";
                if (city) return String(city).trim();
            } catch {
                if (raw.trim()) return raw.trim();
            }
        }
    } catch {
        return "";
    }
    return "";
}

function getRecordName(record) {
    if (typeof record === "string") return record;
    return (
        record?.name ??
        record?.Name ??
        record?.city ??
        record?.City ??
        record?.City_Name ??
        record?.Micromarket ??
        record?.Micromarket_Name ??
        ""
    );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function ListYourPropertyPage() {
    const [step, setStep] = useState(0);
    const [method, setMethod] = useState(null);
    const [form, setForm] = useState(initialForm);
    const [cities, setCities] = useState([]);
    const [micromarkets, setMicromarkets] = useState([]);
    const [citiesLoading, setCitiesLoading] = useState(true);
    const [micromarketsLoading, setMicromarketsLoading] = useState(false);
    const [optionsError, setOptionsError] = useState("");
    const [phoneCountry, setPhoneCountry] = useState(PHONE_COUNTRIES[0]);
    const [formConsent, setFormConsent] = useState(false);
    const { currency } = usePreferences();
    const currencySymbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
    const [showReview, setShowReview] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [errors, setErrors] = useState({});
    const isCoworking = form.propertyType === "coworking";

    useEffect(() => {
        let cancelled = false;
        async function loadCities() {
            setCitiesLoading(true);
            setOptionsError("");
            const storedCity = getStorageCity();
            try {
                const response = await fetch("/api/cities");
                const result = await response.json();
                if (!response.ok || !result?.success) {
                    throw new Error(result?.message || "Unable to load cities.");
                }
                if (cancelled) return;
                const cityList = uniqueValues(result?.cities || []);
                setCities(cityList);
                if (storedCity) {
                    const matchedCity = cityList.find(
                        (city) => normalize(city) === normalize(storedCity),
                    );
                    if (matchedCity) {
                        setForm((previous) => ({
                            ...previous,
                            city: matchedCity,
                            micromarket: "",
                        }));
                    }
                }
            } catch (error) {
                if (cancelled) return;
                setCities([]);
                setOptionsError("Unable to load cities right now. Please refresh the page.");
            } finally {
                if (!cancelled) {
                    setCitiesLoading(false);
                }
            }
        }
        loadCities();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function loadMicromarkets() {
            const city = form.city;
            setMicromarkets([]);
            setMicromarketsLoading(false);
            if (!city) return;
            setMicromarketsLoading(true);
            setOptionsError("");

            try {
                const response = await fetch(
                    `/api/micromarkets?city=${encodeURIComponent(city)}`,
                );
                const result = await response.json();
                if (!response.ok || !result?.success) {
                    throw new Error(result?.message || "Unable to load micromarkets.");
                }
                if (cancelled) return;
                const values = uniqueValues(
                    (result?.micromarkets || []).map(getRecordName),
                );
                setMicromarkets(values);
                setForm((previous) => {
                    const current = previous.micromarket;
                    if (
                        current &&
                        !values.some((item) => normalize(item) === normalize(current))
                    ) {
                        return { ...previous, micromarket: "" };
                    }
                    return previous;
                });
            } catch (error) {
                if (cancelled) return;
                setMicromarkets([]);
                setOptionsError("Unable to load micromarkets right now. Please try again.");
            } finally {
                if (!cancelled) {
                    setMicromarketsLoading(false);
                }
            }
        }
        loadMicromarkets();
        return () => {
            cancelled = true;
        };
    }, [form.city]);

    const updateField = (field, value) => {
        setForm((previous) => ({
            ...previous,
            [field]: value,
            ...(field === "city" ? { micromarket: "" } : {}),
        }));
        setErrors((previous) => ({ ...previous, [field]: "" }));
        setSubmitError("");
    };

    const validateBasicDetails = () => {
        const nextErrors = {};
        if (!form.buildingName.trim()) nextErrors.buildingName = "Building name is required";
        if (!form.propertyType) nextErrors.propertyType = "Please select a property type";
        if (!form.city) nextErrors.city = "Please select a city";
        if (!form.micromarket && micromarkets.length > 0) {
            nextErrors.micromarket = "Please select a micromarket";
        }
        if (!form.address.trim()) nextErrors.address = "Address is required";
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const validateContact = () => {
        const nextErrors = {};
        const contactName = String(form.contactName || "").trim();
        const phone = String(form.phone || "").replace(/\D/g, "");
        const email = String(form.email || "").trim();

        if (!contactName) nextErrors.contactName = "Please enter your contact name.";
        if (!phone) {
            nextErrors.phone = "Phone number is required.";
        } else if (!isValidPhone(phone, phoneCountry)) {
            nextErrors.phone =
                phoneCountry.code === "IN"
                    ? "Enter a valid 10-digit Indian mobile number."
                    : `Enter a valid ${phoneCountry.name} phone number.`;
        }
        // Email is optional, but must be valid when entered.
        if (email && !isValidEmail(email)) {
            nextErrors.email = "Enter a valid email address, e.g. name@company.com.";
        }

        setErrors((previous) => ({
            ...previous,
            contactName: nextErrors.contactName || "",
            phone: nextErrors.phone || "",
            email: nextErrors.email || "",
        }));

        return Object.keys(nextErrors).length === 0;
    };

    const validateListing = () => {
        const nextErrors = {};
        if (!form.buildingName.trim()) nextErrors.buildingName = "Building name is required";
        if (!form.city) nextErrors.city = "Please select a city";
        if (!form.micromarket && micromarkets.length > 0) {
            nextErrors.micromarket = "Please select a micromarket";
        }
        if (!form.address.trim()) nextErrors.address = "Address is required";
        if (!formConsent) nextErrors.consent = "Please confirm the declaration to continue.";
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleNext = () => {
        if (step === 0 && !validateBasicDetails()) return;
        if (step === 1 && !validateContact()) return;
        setStep((previous) => Math.min(previous + 1, 4));
    };

    const handleMethodSelect = (selectedMethod) => {
        setMethod(selectedMethod);
        setSubmitError("");
        setErrors({});
        if (selectedMethod === "callback") {
            // Assistance: no listing form, go straight to review + declaration.
            setShowReview(true);
            setStep(4);
            return;
        }
        setShowReview(false);
        setStep(3);
    };

    const submitToServer = async (submissionMethod) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setSubmitError("");

        try {
            const response = await fetch("/api/list-your-property", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    method: submissionMethod,
                    form: {
                        ...form,
                        phone: `${phoneCountry.dial}${String(form.phone || "").replace(/\D/g, "")}`,
                    },
                    currency,
                    location: getUserLocation(),
                }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result?.message || "Unable to submit your request.");
            }
            setSubmitted(true);
            setShowReview(false);
        } catch (error) {
            setSubmitError(
                error instanceof Error ? error.message : "Unable to submit your request. Please try again.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleListingContinue = () => {
        if (!validateListing()) return;
        setSubmitError("");
        setShowReview(true);
        setStep(4);
    };

    const handleFinalSubmit = async () => {
        if (method === "callback" && !formConsent) {
            setErrors({ consent: "Please confirm the declaration to continue." });
            return;
        }
        await submitToServer(method === "callback" ? "callback" : "form");
    };

    const restart = () => {
        const storedCity = getStorageCity();
        setStep(0);
        setMethod(null);
        setForm({ ...initialForm, city: storedCity || "" });
        setMicromarkets([]);
        setPhoneCountry(PHONE_COUNTRIES[0]);
        setFormConsent(false);
        setShowReview(false);
        setSubmitted(false);
        setIsSubmitting(false);
        setSubmitError("");
        setErrors({});
    };

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(160,84,160,0.14),_transparent_32%),linear-gradient(180deg,#fcfbfd_0%,#f7f5f8_100%)] text-[#171717]">
            {!submitted && <ProgressHeader step={step} method={method} />}
            <section className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
                <AnimatePresence mode="wait">
                    {submitted ? (
                        <SuccessScreen key="success" method={method} onRestart={restart} />
                    ) : (
                        <motion.div
                            key={`${step}-${showReview}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.25 }}
                        >
                            {step === 0 && (
                                <BasicDetails
                                    form={form}
                                    errors={errors}
                                    cities={cities}
                                    micromarkets={micromarkets}
                                    citiesLoading={citiesLoading}
                                    micromarketsLoading={micromarketsLoading}
                                    optionsError={optionsError}
                                    updateField={updateField}
                                    onNext={handleNext}
                                />
                            )}
                            {step === 1 && (
                                <ContactDetails
                                    form={form}
                                    errors={errors}
                                    updateField={updateField}
                                    phoneCountry={phoneCountry}
                                    setPhoneCountry={setPhoneCountry}
                                    onBack={() => setStep(0)}
                                    onNext={handleNext}
                                />
                            )}
                            {step === 2 && (
                                <MethodSelection
                                    onSelect={handleMethodSelect}
                                    onBack={() => setStep(1)}
                                />
                            )}
                            {step === 3 && method === "form" && !showReview && (
                                <ListingForm
                                    form={form}
                                    errors={errors}
                                    updateField={updateField}
                                    isCoworking={isCoworking}
                                    currencySymbol={currencySymbol}
                                    formConsent={formConsent}
                                    setFormConsent={(value) => {
                                        setFormConsent(value);
                                        setErrors((previous) => ({ ...previous, consent: "" }));
                                    }}
                                    cities={cities}
                                    micromarkets={micromarkets}
                                    citiesLoading={citiesLoading}
                                    micromarketsLoading={micromarketsLoading}
                                    optionsError={optionsError}
                                    onBack={() => setStep(2)}
                                    onContinue={handleListingContinue}
                                />
                            )}
                            {step === 4 && showReview && (
                                <ReviewSubmission
                                    form={form}
                                    method={method}
                                    isCoworking={isCoworking}
                                    currencySymbol={currencySymbol}
                                    phoneDial={phoneCountry.dial}
                                    formConsent={formConsent}
                                    setFormConsent={(value) => {
                                        setFormConsent(value);
                                        setErrors((previous) => ({ ...previous, consent: "" }));
                                    }}
                                    consentError={errors.consent}
                                    submitError={submitError}
                                    isSubmitting={isSubmitting}
                                    onBack={() => {
                                        setShowReview(false);
                                        setStep(method === "callback" ? 2 : 3);
                                    }}
                                    onSubmit={handleFinalSubmit}
                                />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </section>
        </main>
    );
}

function ProgressHeader({ step, method }) {
    // The assistance path has no "Complete listing" page, so that step is
    // left out and the review becomes step 4 of 4.
    const assisted = method === "callback" && step >= 3;
    const steps = assisted ? STEPS.filter((item) => item !== "Complete listing") : STEPS;
    const current = assisted ? Math.min(step - 1, steps.length - 1) : step;

    // Stick just below the site navbar, whose height changes with screen size.
    const [navbarHeight, setNavbarHeight] = useState(0);
    useEffect(() => {
        const header = document.querySelector("header");
        if (!header) return undefined;
        const update = () => setNavbarHeight(Math.round(header.getBoundingClientRect().height));
        update();
        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", update);
            return () => window.removeEventListener("resize", update);
        }
        const observer = new ResizeObserver(update);
        observer.observe(header);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            style={{ top: navbarHeight }}
            className="sticky z-30 border-b border-white/70 bg-white/80 shadow-[0_8px_30px_rgba(30,20,40,0.05)] backdrop-blur-xl"
        >
            <div className="mx-auto max-w-[1180px] px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center">
                    {steps.map((item, index) => {
                        const active = index === current;
                        const complete = index < current;
                        const last = index === steps.length - 1;
                        return (
                            <div key={item} className={last ? "flex items-center" : "flex flex-1 items-center"}>
                                <div className="flex items-center gap-2">
                                    <div
                                        className={[
                                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                                            complete
                                                ? "bg-[#A054A0] text-white shadow-[0_6px_18px_rgba(160,84,160,0.28)]"
                                                : active
                                                    ? "bg-[#E8CBE8] text-[#6D356D] ring-4 ring-[#A054A0]/10"
                                                    : "bg-black/[0.05] text-black/40",
                                        ].join(" ")}
                                    >
                                        {complete ? <Check size={14} /> : index + 1}
                                    </div>
                                    <span
                                        className={[
                                            "hidden text-xs font-medium sm:block",
                                            active ? "text-[#7E3F82]" : complete ? "text-black/65" : "text-black/35",
                                        ].join(" ")}
                                    >
                                        {item}
                                    </span>
                                </div>
                                {!last && (
                                    <div
                                        className={[
                                            "mx-2 h-px flex-1",
                                            index < current ? "bg-[#A054A0]/35" : "bg-black/[0.08]",
                                        ].join(" ")}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function BasicDetails({
    form,
    errors,
    cities,
    micromarkets,
    citiesLoading,
    micromarketsLoading,
    optionsError,
    updateField,
    onNext,
}) {
    return (
        <PageShell
            eyebrow="01 / Property details"
            title="Tell us about your property"
            description="Start with a few basic details about the building you want to list."
            icon={<Building2 size={21} />}
        >
            <div className="grid gap-5 md:grid-cols-2">
                <Field
                    label="Building name"
                    required
                    value={form.buildingName}
                    placeholder="e.g. DLF Cyber City"
                    error={errors.buildingName}
                    onChange={(value) => updateField("buildingName", value)}
                />
                <CitySelect
                    value={form.city}
                    options={cities}
                    loading={citiesLoading}
                    error={errors.city}
                    onChange={(value) => updateField("city", value)}
                />
                <div className="md:col-span-2">
                    <label className="mb-3 block text-sm font-semibold">
                        Property type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {propertyTypes.map((type) => {
                            const selected = form.propertyType === type.value;
                            return (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => updateField("propertyType", type.value)}
                                    className={[
                                        "group rounded-[24px] border p-5 text-left transition-all duration-300",
                                        selected
                                            ? "border-[#A054A0] bg-gradient-to-br from-[#A054A0] to-[#7E3F82] text-white shadow-[0_20px_50px_rgba(160,84,160,0.22)]"
                                            : "border-black/[0.08] bg-white/80 hover:-translate-y-0.5 hover:border-[#A054A0]/30 hover:shadow-[0_20px_50px_rgba(30,20,40,0.07)]",
                                    ].join(" ")}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-semibold">{type.label}</p>
                                            <p
                                                className={[
                                                    "mt-1 text-xs leading-5",
                                                    selected ? "text-white/70" : "text-black/45",
                                                ].join(" ")}
                                            >
                                                {type.description}
                                            </p>
                                        </div>
                                        <div
                                            className={[
                                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                                                selected ? "border-white bg-white text-[#A054A0]" : "border-black/15",
                                            ].join(" ")}
                                        >
                                            {selected && <Check size={13} />}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {errors.propertyType && (
                        <p className="mt-2 text-xs text-red-500">{errors.propertyType}</p>
                    )}
                </div>
                <div className="md:col-span-2">
                    <Field
                        label="Property address"
                        required
                        value={form.address}
                        placeholder="Enter complete building address"
                        error={errors.address}
                        onChange={(value) => updateField("address", value)}
                        icon={<MapPin size={16} />}
                    />
                </div>
                <Field
                    label={form.propertyType === "coworking" ? "Operator" : "Developer"}
                    value={form.developer}
                    placeholder={form.propertyType === "coworking" ? "Operator name" : "Developer name"}
                    onChange={(value) => updateField("developer", value)}
                />
                <MicromarketSelect
                    value={form.micromarket}
                    options={micromarkets}
                    loading={micromarketsLoading}
                    disabled={!form.city}
                    error={errors.micromarket}
                    onChange={(value) => updateField("micromarket", value)}
                />
                {optionsError && (
                    <div className="md:col-span-2 rounded-2xl border border-[#A054A0]/15 bg-[#A054A0]/[0.045] px-4 py-3 text-xs text-[#70456F]">
                        {optionsError}
                    </div>
                )}
            </div>
            <FormFooter
                right={
                    <PrimaryButton onClick={onNext}>
                        Continue <ArrowRight size={16} />
                    </PrimaryButton>
                }
            />
        </PageShell>
    );
}

function ContactDetails({ form, errors, updateField, phoneCountry, setPhoneCountry, onBack, onNext }) {
    return (
        <PageShell
            eyebrow="02 / Contact details"
            title="How can we reach you?"
            description="We'll use these details only for property verification and listing communication."
            icon={<UserRound size={21} />}
        >
            <div className="grid gap-5 md:grid-cols-2">
                <Field
                    label="Contact name"
                    required
                    value={form.contactName}
                    placeholder="Your full name"
                    error={errors.contactName}
                    onChange={(value) => updateField("contactName", value)}
                />
                <PhoneField
                    country={phoneCountry}
                    value={form.phone}
                    error={errors.phone}
                    onCountryChange={(country) => {
                        setPhoneCountry(country);
                        updateField(
                            "phone",
                            String(form.phone || "").replace(/\D/g, "").slice(0, country.max),
                        );
                    }}
                    onChange={(value) =>
                        updateField("phone", value.replace(/\D/g, "").slice(0, phoneCountry.max))
                    }
                />
                <Field
                    label="Email address"
                    type="email"
                    inputMode="email"
                    value={form.email}
                    placeholder="you@company.com"
                    error={errors.email}
                    onChange={(value) => updateField("email", value)}
                />
                <Field
                    label="Company name"
                    value={form.companyName}
                    placeholder="Optional"
                    onChange={(value) => updateField("companyName", value)}
                />
            </div>
            <div className="mt-8 rounded-[24px] border border-[#A054A0]/10 bg-[#A054A0]/[0.035] p-5">
                <div className="flex gap-3">
                    <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#A054A0]" />
                    <div>
                        <p className="text-sm font-semibold">Your information is secure</p>
                        <p className="mt-1 text-xs leading-5 text-black/50">
                            Your contact details will not be displayed publicly. They are used for verification and communication regarding your listing.
                        </p>
                    </div>
                </div>
            </div>
            <FormFooter
                left={
                    <SecondaryButton onClick={onBack}>
                        <ArrowLeft size={16} /> Back
                    </SecondaryButton>
                }
                right={
                    <PrimaryButton onClick={onNext}>
                        Continue <ArrowRight size={16} />
                    </PrimaryButton>
                }
            />
        </PageShell>
    );
}

function MethodSelection({ onSelect, onBack }) {
    return (
        <PageShell
            eyebrow="03 / Choose how to proceed"
            title="How would you like to list?"
            description="Choose the option that works best for you. You can either complete the listing yourself or have our team assist you."
            icon={<Sparkles size={21} />}
        >
            <div className="grid gap-5 md:grid-cols-2">
                <MethodCard
                    icon={<FileCheck2 size={24} />}
                    title="I'll Complete the Listing"
                    description="Complete the property details yourself. You'll be able to review everything before submitting."
                    features={[
                        "Complete property information",
                        "Review before submission",
                        "Submit directly to our team",
                    ]}
                    onClick={() => onSelect("form")}
                />
                <MethodCard
                    icon={<Phone size={24} />}
                    title="I'd Like Assistance"
                    description="Our property team will contact you and help complete the listing."
                    features={[
                        "No long forms to fill",
                        "Talk to our property team",
                        "We help with the listing",
                    ]}
                    onClick={() => onSelect("callback")}
                />
            </div>
            <FormFooter
                left={
                    <SecondaryButton onClick={onBack}>
                        <ArrowLeft size={16} /> Back
                    </SecondaryButton>
                }
            />
        </PageShell>
    );
}

function ListingForm({
    form,
    errors,
    updateField,
    isCoworking,
    currencySymbol,
    formConsent,
    setFormConsent,
    micromarkets,
    micromarketsLoading,
    citiesLoading,
    cities,
    optionsError,
    onBack,
    onContinue,
}) {
    return (
        <PageShell
            eyebrow="04 / Property information"
            title="Complete your property listing"
            description="Provide the information that will be used to create your property profile."
            icon={<Building2 size={21} />}
        >
            <div className="space-y-6">
                <SectionCard number="01" title="Property overview" description="Basic information about your property.">
                    <div className="grid gap-5 md:grid-cols-2">
                        <Field
                            label="Building name"
                            required
                            value={form.buildingName}
                            error={errors.buildingName}
                            onChange={(value) => updateField("buildingName", value)}
                        />
                        <CitySelect
                            value={form.city}
                            options={cities}
                            loading={citiesLoading}
                            error={errors.city}
                            onChange={(value) => updateField("city", value)}
                        />
                        <MicromarketSelect
                            value={form.micromarket}
                            options={micromarkets}
                            loading={micromarketsLoading}
                            disabled={!form.city}
                            error={errors.micromarket}
                            onChange={(value) => updateField("micromarket", value)}
                        />
                        <Field
                            label={isCoworking ? "Operator" : "Developer"}
                            value={form.developer}
                            placeholder={isCoworking ? "Operator name" : "Developer name"}
                            onChange={(value) => updateField("developer", value)}
                        />
                        <div className="md:col-span-2">
                            <Field
                                label="Address"
                                required
                                value={form.address}
                                error={errors.address}
                                onChange={(value) => updateField("address", value)}
                            />
                        </div>
                        {optionsError && (
                            <div className="md:col-span-2 rounded-2xl border border-[#A054A0]/15 bg-[#A054A0]/[0.045] px-4 py-3 text-xs text-[#70456F]">
                                {optionsError}
                            </div>
                        )}
                    </div>
                </SectionCard>

                <SectionCard
                    number="02"
                    title={isCoworking ? "Coworking information" : "Office information"}
                    description={
                        isCoworking
                            ? "Tell us about the available coworking inventory."
                            : "Tell us about the available office inventory."
                    }
                >
                    <div className="grid gap-5 md:grid-cols-2">
                        {isCoworking ? (
                            <>
                                <Field
                                    label="Seats offered"
                                    type="number"
                                    value={form.seats}
                                    error={errors.seats}
                                    placeholder="e.g. 250"
                                    onChange={(value) => updateField("seats", value)}
                                />
                                <Field
                                    label="Minimum seat price / month"
                                    type="number"
                                    value={form.seatPriceMin}
                                    error={errors.seatPriceMin}
                                    placeholder={`${currencySymbol}0`}
                                    onChange={(value) => updateField("seatPriceMin", value)}
                                />
                                <Field
                                    label="Maximum seat price / month"
                                    type="number"
                                    value={form.seatPriceMax}
                                    placeholder={`${currencySymbol}0`}
                                    onChange={(value) => updateField("seatPriceMax", value)}
                                />
                            </>
                        ) : (
                            <>
                                <Field
                                    label="Area"
                                    type="number"
                                    value={form.area}
                                    error={errors.area}
                                    placeholder="e.g. 25000"
                                    suffix="sq ft"
                                    onChange={(value) => updateField("area", value)}
                                />
                                <Field
                                    label="Minimum rent / month"
                                    type="number"
                                    value={form.rentMin}
                                    error={errors.rentMin}
                                    placeholder={`${currencySymbol}0`}
                                    onChange={(value) => updateField("rentMin", value)}
                                />
                                <Field
                                    label="Maximum rent / month"
                                    type="number"
                                    value={form.rentMax}
                                    placeholder={`${currencySymbol}0`}
                                    onChange={(value) => updateField("rentMax", value)}
                                />
                            </>
                        )}
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-semibold">Property description</label>
                            <textarea
                                rows={5}
                                value={form.description}
                                onChange={(event) => updateField("description", event.target.value)}
                                placeholder="Tell potential tenants about the property..."
                                className="w-full resize-none rounded-2xl border border-black/[0.09] bg-white/85 px-4 py-3 text-sm outline-none transition placeholder:text-black/30 focus:border-[#A054A0]/50 focus:ring-4 focus:ring-[#A054A0]/10"
                            />
                        </div>
                    </div>
                </SectionCard>

                <SectionCard number="03" title="Declaration & privacy" description="Please confirm before continuing.">
                    <label className="flex cursor-pointer gap-3 rounded-2xl border border-[#A054A0]/10 bg-[#A054A0]/[0.025] p-5">
                        <input
                            type="checkbox"
                            checked={formConsent}
                            onChange={(event) => setFormConsent(event.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-[#A054A0]"
                        />
                        <div>
                            <p className="text-sm font-semibold">I confirm that the information provided is accurate.</p>
                            <p className="mt-1 text-xs leading-5 text-black/50">
                                I agree to the platform&apos;s privacy policy and understand that the information may be reviewed by the property administration team before publication.
                            </p>
                        </div>
                    </label>
                    {errors.consent && <p className="mt-2 text-xs text-red-500">{errors.consent}</p>}
                </SectionCard>
            </div>
            <FormFooter
                left={
                    <SecondaryButton onClick={onBack}>
                        <ArrowLeft size={16} /> Back
                    </SecondaryButton>
                }
                right={
                    <PrimaryButton onClick={onContinue}>
                        Review submission <ArrowRight size={16} />
                    </PrimaryButton>
                }
            />
        </PageShell>
    );
}

function ReviewSubmission({
    form,
    method,
    isCoworking,
    currencySymbol,
    phoneDial,
    formConsent,
    setFormConsent,
    consentError,
    submitError,
    isSubmitting,
    onBack,
    onSubmit,
}) {
    const isAssistance = method === "callback";
    const price = (value) => (value ? `${currencySymbol}${value}` : "—");
    const range = (min, max) =>
        min || max ? `${price(min)} – ${price(max)}` : "—";
    return (
        <PageShell
            eyebrow={isAssistance ? "04 / Review" : "05 / Review"}
            title="Review your submission"
            description={
                isAssistance
                    ? "Please review your details. Our property team will contact you to complete the listing."
                    : "Please review the information before submitting your property."
            }
            icon={<FileCheck2 size={21} />}
        >
            <div className="space-y-5">
                <ReviewCard title="Property" icon={<Building2 size={18} />}>
                    <ReviewRow label="Building" value={form.buildingName} />
                    <ReviewRow label="Type" value={isCoworking ? "Coworking" : "Conventional Office"} />
                    <ReviewRow label="City" value={form.city} />
                    <ReviewRow label="Micromarket" value={form.micromarket || "—"} />
                    <ReviewRow label="Address" value={form.address} />
                    <ReviewRow label={isCoworking ? "Operator" : "Developer"} value={form.developer} />
                    {!isAssistance && (
                        <>
                            <ReviewRow
                                label={isCoworking ? "Seats" : "Area"}
                                value={
                                    isCoworking
                                        ? form.seats
                                            ? `${form.seats} seats`
                                            : "—"
                                        : form.area
                                            ? `${form.area} sq ft`
                                            : "—"
                                }
                            />
                            <ReviewRow
                                label={isCoworking ? "Seat price / month" : "Rent / month"}
                                value={
                                    isCoworking
                                        ? range(form.seatPriceMin, form.seatPriceMax)
                                        : range(form.rentMin, form.rentMax)
                                }
                            />
                        </>
                    )}
                </ReviewCard>
                <ReviewCard title="Contact" icon={<UserRound size={18} />}>
                    <ReviewRow label="Contact" value={form.contactName} />
                    <ReviewRow label="Phone" value={form.phone ? `${phoneDial} ${form.phone}` : ""} />
                    <ReviewRow label="Email" value={form.email} />
                    <ReviewRow label="Company" value={form.companyName} />
                </ReviewCard>
                {isAssistance && (
                    <SectionCard title="Declaration & privacy" description="Please confirm before submitting.">
                        <label className="flex cursor-pointer gap-3 rounded-2xl border border-[#A054A0]/10 bg-[#A054A0]/[0.025] p-5">
                            <input
                                type="checkbox"
                                checked={formConsent}
                                onChange={(event) => setFormConsent(event.target.checked)}
                                className="mt-0.5 h-4 w-4 accent-[#A054A0]"
                            />
                            <div>
                                <p className="text-sm font-semibold">I confirm that the information provided is accurate.</p>
                                <p className="mt-1 text-xs leading-5 text-black/50">
                                    I agree to be contacted regarding my property listing and to the platform&apos;s privacy policy, and understand that my information may be used for verification purposes.
                                </p>
                            </div>
                        </label>
                        {consentError && <p className="mt-2 text-xs text-red-500">{consentError}</p>}
                    </SectionCard>
                )}
                {submitError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {submitError}
                    </div>
                )}
                <div className="flex items-start gap-3 rounded-2xl border border-[#A054A0]/15 bg-[#A054A0]/[0.045] p-5">
                    <Info size={18} className="mt-0.5 shrink-0 text-[#A054A0]" />
                    <p className="text-xs leading-5 text-[#70456F]">
                        After submission, our administration team will verify the information. The property will only be published after successful verification.
                    </p>
                </div>
            </div>
            <FormFooter
                left={
                    <SecondaryButton onClick={onBack}>
                        <ArrowLeft size={16} /> Edit details
                    </SecondaryButton>
                }
                right={
                    <PrimaryButton onClick={onSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 size={15} className="animate-spin" /> Submitting...
                            </>
                        ) : (
                            <>
                                Submit property <Check size={16} />
                            </>
                        )}
                    </PrimaryButton>
                }
            />
        </PageShell>
    );
}

function SuccessScreen({ method, onRestart }) {
    return (
        <div className="mx-auto max-w-2xl py-10 text-center">
            <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.35 }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#A054A0] to-[#7E3F82] text-white shadow-[0_20px_50px_rgba(160,84,160,0.28)]"
            >
                <CheckCircle2 size={34} />
            </motion.div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#A054A0]">Submission received</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                {method === "callback" ? "Your callback request has been received." : "Your property has been submitted."}
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-black/50">
                {method === "callback"
                    ? "Our property team will contact you shortly and help you complete the listing."
                    : "Our administration team will review the information you've provided. Your property will be published after successful verification."}
            </p>
            <div className="mx-auto mt-10 max-w-md rounded-[28px] border border-white bg-white/85 p-6 text-left shadow-[0_20px_60px_rgba(30,20,40,0.07)]">
                <div className="flex items-start gap-3">
                    <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#A054A0]" />
                    <div>
                        <p className="text-sm font-semibold">What happens next?</p>
                        <div className="mt-4 space-y-4">
                            {[
                                "Our team reviews your information",
                                "Property details are verified",
                                "Your property is approved",
                                "The property is published",
                            ].map((item, index) => (
                                <div key={item} className="flex items-center gap-3">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E8CBE8] text-[10px] font-semibold text-[#7E3F82]">
                                        {index + 1}
                                    </div>
                                    <span className="text-xs text-black/55">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <button
                type="button"
                onClick={onRestart}
                className="mt-8 text-sm font-semibold text-[#A054A0] underline underline-offset-4"
            >
                List another property
            </button>
        </div>
    );
}

function PageShell({ eyebrow, title, description, icon, children }) {
    return (
        <div>
            <div className="mb-9 max-w-3xl">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#A054A0]/15 bg-gradient-to-br from-[#A054A0]/15 to-[#E8CBE8]/30 text-[#A054A0] shadow-[0_10px_30px_rgba(160,84,160,0.10)]">
                    {icon}
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A054A0]">{eyebrow}</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-[42px] sm:leading-[1.06]">
                    {title}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-[15px]">{description}</p>
            </div>
            {children}
        </div>
    );
}

function CitySelect({ value, options, loading, error, onChange }) {
    return (
        <SelectField
            label="City"
            required
            value={value}
            options={options}
            placeholder={loading ? "Loading cities..." : "Select city"}
            error={error}
            loading={loading}
            onChange={onChange}
        />
    );
}

function MicromarketSelect({ value, options, loading, disabled, error, onChange }) {
    return (
        <SelectField
            label="Micromarket"
            required={options.length > 0}
            value={value}
            options={options}
            placeholder={
                disabled
                    ? "Select city first"
                    : loading
                        ? "Loading micromarkets..."
                        : options.length
                            ? "Select micromarket"
                            : "No micromarkets available"
            }
            error={error}
            loading={loading}
            disabled={disabled || loading || options.length === 0}
            onChange={onChange}
        />
    );
}

function Field({
    label,
    required,
    value,
    placeholder,
    error,
    onChange,
    type = "text",
    inputMode,
    maxLength,
    autoComplete,
    icon,
    suffix,
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-semibold">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                {icon && (
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    inputMode={inputMode}
                    maxLength={maxLength}
                    autoComplete={autoComplete}
                    value={value}
                    placeholder={placeholder}
                    aria-invalid={Boolean(error)}
                    onChange={(event) => onChange(event.target.value)}
                    className={[
                        "h-12 w-full rounded-xl border bg-white/85 px-4 text-sm outline-none shadow-[0_6px_25px_rgba(15,23,42,0.03)] backdrop-blur transition-all",
                        suffix ? "pr-20" : "",
                        error
                            ? "border-red-300 focus:border-red-400"
                            : "border-black/[0.09] focus:border-[#A054A0]/50 focus:ring-4 focus:ring-[#A054A0]/10",
                    ].join(" ")}
                />
                {suffix && (
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-black/35">
                        {suffix}
                    </span>
                )}
            </div>
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function PhoneField({ country, value, error, onCountryChange, onChange }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const pickerRef = useRef(null);

    const filteredCountries = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return PHONE_COUNTRIES;
        return PHONE_COUNTRIES.filter(
            (item) =>
                item.name.toLowerCase().includes(query) ||
                item.dial.includes(query) ||
                item.code.toLowerCase().includes(query),
        );
    }, [search]);

    useEffect(() => {
        if (!open) return undefined;
        const handlePointerDown = (event) => {
            if (!pickerRef.current?.contains(event.target)) {
                setOpen(false);
                setSearch("");
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    return (
        <div>
            <p className="mb-2 block text-sm font-semibold">
                Phone number <span className="text-red-500">*</span>
            </p>
            <div ref={pickerRef} className="relative">
                <div
                    className={[
                        "flex h-12 w-full overflow-hidden rounded-xl border bg-white/85 shadow-[0_6px_25px_rgba(15,23,42,0.03)] backdrop-blur transition-all",
                        error
                            ? "border-red-300 focus-within:border-red-400"
                            : "border-black/[0.09] focus-within:border-[#A054A0]/50 focus-within:ring-4 focus-within:ring-[#A054A0]/10",
                    ].join(" ")}
                >
                    <button
                        type="button"
                        onClick={() => setOpen((previous) => !previous)}
                        aria-haspopup="listbox"
                        aria-expanded={open}
                        aria-label={`Country code ${country.name} ${country.dial}`}
                        className="flex shrink-0 items-center gap-1.5 border-r border-black/[0.07] bg-black/[0.025] px-3.5 text-sm font-medium text-black/75 transition hover:bg-black/[0.05]"
                    >
                        <span className="text-xs font-semibold text-black/50">{country.code}</span>
                        {country.dial}
                        <ChevronDown
                            size={14}
                            className={`transition-transform ${open ? "rotate-180 text-[#A054A0]" : ""}`}
                        />
                    </button>
                    <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={value}
                        placeholder="Mobile number"
                        aria-label="Phone number"
                        aria-invalid={Boolean(error)}
                        onChange={(event) => onChange(event.target.value)}
                        className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-black/30"
                    />
                </div>
                {open && (
                    <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[300px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-xl">
                        <div className="border-b border-black/[0.07] p-2.5">
                            <div className="flex items-center gap-2 rounded-lg border border-black/[0.1] px-3">
                                <Search size={14} className="shrink-0 text-black/40" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search country or code..."
                                    autoFocus
                                    className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/40"
                                />
                            </div>
                        </div>
                        <div role="listbox" className="max-h-[240px] overflow-y-auto overscroll-contain p-1.5">
                            {filteredCountries.length > 0 ? (
                                filteredCountries.map((item) => {
                                    const selected = item.code === country.code && item.dial === country.dial;
                                    return (
                                        <button
                                            key={`${item.code}-${item.dial}`}
                                            type="button"
                                            role="option"
                                            aria-selected={selected}
                                            onClick={() => {
                                                onCountryChange(item);
                                                setOpen(false);
                                                setSearch("");
                                            }}
                                            className={[
                                                "flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition",
                                                selected
                                                    ? "bg-[#A054A0] font-semibold text-white"
                                                    : "text-black hover:bg-[#A054A0]/10 hover:text-[#7E3F82]",
                                            ].join(" ")}
                                        >
                                            <span className="flex min-w-0 items-center gap-2.5">
                                                <span className="w-6 shrink-0 text-xs font-semibold opacity-70">{item.code}</span>
                                                <span className="truncate">{item.name}</span>
                                            </span>
                                            <span className="flex shrink-0 items-center gap-2 text-xs">
                                                {item.dial}
                                                {selected && <Check size={14} />}
                                            </span>
                                        </button>
                                    );
                                })
                            ) : (
                                <p className="px-3 py-6 text-center text-sm text-black/60">No country found</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function SelectField({ label, required, value, options, placeholder, error, loading, disabled, onChange }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-semibold">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <select
                    value={value}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.value)}
                    className={[
                        "h-12 w-full appearance-none rounded-xl border bg-white/85 px-4 pr-12 text-sm outline-none shadow-[0_6px_25px_rgba(15,23,42,0.03)] backdrop-blur transition-all",
                        error
                            ? "border-red-300"
                            : "border-black/[0.09] focus:border-[#A054A0]/50 focus:ring-4 focus:ring-[#A054A0]/10",
                        !value ? "text-black/35" : "text-black",
                        disabled ? "cursor-not-allowed bg-black/[0.025] opacity-60" : "",
                    ].join(" ")}
                >
                    <option value="">{placeholder}</option>
                    {options.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
                {loading ? (
                    <Loader2 size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[#A054A0]" />
                ) : (
                    <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/40" />
                )}
            </div>
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function MethodCard({ icon, title, description, features, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative overflow-hidden rounded-[28px] border border-white bg-white/80 p-7 text-left shadow-[0_15px_50px_rgba(30,20,40,0.045)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#A054A0]/20 hover:shadow-[0_25px_70px_rgba(160,84,160,0.12)]"
        >
            <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8CBE8] text-[#A054A0]">{icon}</div>
                <ArrowRight size={18} className="text-black/30 transition-transform group-hover:translate-x-1 group-hover:text-[#A054A0]" />
            </div>
            <h3 className="mt-7 text-lg font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-black/45">{description}</p>
            <div className="mt-7 space-y-3">
                {features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2.5">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E8CBE8] text-[#A054A0]">
                            <Check size={11} />
                        </div>
                        <span className="text-xs text-black/60">{feature}</span>
                    </div>
                ))}
            </div>
        </button>
    );
}

function SectionCard({ number, title, description, children }) {
    return (
        <div className="rounded-[28px] border border-white bg-white/80 p-6 shadow-[0_15px_50px_rgba(30,20,40,0.045)] backdrop-blur-xl sm:p-8">
            <div className="mb-7 flex gap-4">
                {number && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8CBE8] text-xs font-semibold text-[#7E3F82]">
                        {number}
                    </div>
                )}
                <div>
                    <h2 className="text-base font-semibold">{title}</h2>
                    <p className="mt-1 text-xs text-black/40">{description}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

function ReviewCard({ title, icon, children }) {
    return (
        <div className="rounded-[28px] border border-white bg-white/80 p-6 shadow-[0_15px_50px_rgba(30,20,40,0.045)] backdrop-blur-xl sm:p-7">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8CBE8] text-[#A054A0]">{icon}</div>
                <h2 className="text-sm font-semibold">{title}</h2>
            </div>
            <div className="divide-y divide-black/[0.06]">{children}</div>
        </div>
    );
}

function ReviewRow({ label, value }) {
    return (
        <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <span className="text-xs text-black/40">{label}</span>
            <span className="text-sm font-medium sm:text-right">{value || "—"}</span>
        </div>
    );
}

function FormFooter({ left, right }) {
    return (
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-black/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>{left}</div>
            <div className="flex justify-end">{right}</div>
        </div>
    );
}

function PrimaryButton({ children, onClick, disabled = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#A054A0] px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(160,84,160,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#7E3F82] hover:shadow-[0_16px_36px_rgba(160,84,160,0.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {children}
        </button>
    );
}

function SecondaryButton({ children, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-black/[0.09] bg-white/85 px-5 text-sm font-semibold shadow-sm transition hover:border-[#A054A0]/25 hover:bg-[#A054A0]/[0.03]"
        >
            {children}
        </button>
    );
}