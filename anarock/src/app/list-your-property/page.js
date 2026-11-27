"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePreferences } from "@/lib/preferences";
import {
    SECURITY_CHECK_MESSAGE,
    useFormGuard,
} from "@/components/common/FormGuard";
import { PHONE_COUNTRIES } from "@/lib/phoneCountries";
import {
    CURRENCY_SYMBOLS,
    getRecordName,
    getStorageCity,
    getUserLocation,
    initialForm,
    isValidEmail,
    isValidPhone,
    normalize,
    uniqueValues,
} from "./listingShared";
import {
    BasicDetails,
    ContactDetails,
    ListingForm,
    MethodSelection,
    ProgressHeader,
    ReviewSubmission,
    SuccessScreen,
} from "./ListingSteps";

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
    const { currency, unit } = usePreferences();
    const currencySymbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
    // Area unit follows the navbar (sq ft / sq m).
    const areaUnit = unit === "sqm" ? "sq m" : "sq ft";
    const [showReview, setShowReview] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const guard = useFormGuard();
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

    // After a failed check, move keyboard focus to the first field with an error.
    const focusFirstError = () => {
        window.requestAnimationFrame(() => {
            document
                .querySelector('main [aria-invalid="true"]')
                ?.focus({ preventScroll: false });
        });
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
        if (Object.keys(nextErrors).length) focusFirstError();
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

        if (Object.keys(nextErrors).length) focusFirstError();
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
        if (Object.keys(nextErrors).length) focusFirstError();
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
        if (!guard.ready) {
            setSubmitError(SECURITY_CHECK_MESSAGE);
            return;
        }
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
                    unit,
                    location: getUserLocation(),
                    ...guard.values(),
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
            guard.afterSubmit();
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
            focusFirstError();
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
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(160,84,160,0.14),_transparent_32%),linear-gradient(180deg,#fcfbfd_0%,#f7f5f8_100%)] text-[#171717]">
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
                                    areaUnit={areaUnit}
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
                                    areaUnit={areaUnit}
                                    phoneDial={phoneCountry.dial}
                                    formConsent={formConsent}
                                    setFormConsent={(value) => {
                                        setFormConsent(value);
                                        setErrors((previous) => ({ ...previous, consent: "" }));
                                    }}
                                    consentError={errors.consent}
                                    submitError={submitError}
                                    guardFields={guard.fields}
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
        </div>
    );
}
