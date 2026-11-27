"use client";

// The steps of the "List your Property" form.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    Check,
    CheckCircle2,
    FileCheck2,
    Info,
    Loader2,
    MapPin,
    Phone,
    ShieldCheck,
    Sparkles,
    UserRound,
} from "lucide-react";
import { STEPS, propertyTypes } from "./listingShared";
import {
    CitySelect,
    Field,
    FormFooter,
    MethodCard,
    MicromarketSelect,
    PageShell,
    PhoneField,
    PrimaryButton,
    ReviewCard,
    ReviewRow,
    SecondaryButton,
    SectionCard,
} from "./ListingControls";

export function ProgressHeader({ step, method }) {
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

export function BasicDetails({
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
                    <p id="property-type-label" className="mb-3 block text-sm font-semibold">
                        Property type <span className="text-red-500">*</span>
                    </p>
                    <div
                        role="group"
                        aria-labelledby="property-type-label"
                        aria-describedby={errors.propertyType ? "property-type-error" : undefined}
                        className="grid gap-3 sm:grid-cols-2"
                    >
                        {propertyTypes.map((type) => {
                            const selected = form.propertyType === type.value;
                            return (
                                <button
                                    key={type.value}
                                    type="button"
                                    aria-pressed={selected}
                                    aria-invalid={errors.propertyType && !form.propertyType ? true : undefined}
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
                        <p id="property-type-error" className="mt-2 text-xs text-red-700">{errors.propertyType}</p>
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

export function ContactDetails({ form, errors, updateField, phoneCountry, setPhoneCountry, onBack, onNext }) {
    return (
        <PageShell
            eyebrow="02 / Contact details"
            title="How can we reach you?"
            description="We'll use these details only for property verification and listing communication."
            icon={<UserRound size={21} />}
        >
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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
                {/* Company name hidden for now.
                <Field
                    label="Company name"
                    value={form.companyName}
                    placeholder="Optional"
                    onChange={(value) => updateField("companyName", value)}
                />
                */}
            </div>
            <div className="mt-8 rounded-[24px] border border-[#A054A0]/10 bg-[#A054A0]/[0.035] p-5">
                <div className="flex gap-3">
                    <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#A054A0]" />
                    <div>
                        <p className="text-sm font-semibold">Your information is secure</p>
                        <p className="mt-1 text-xs leading-5 text-black/50">
                            Your contact details will be used for verification and communication regarding your listing.
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

export function MethodSelection({ onSelect, onBack }) {
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

export function ListingForm({
    form,
    errors,
    updateField,
    isCoworking,
    currencySymbol,
    areaUnit,
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
                                    label="Per seat cost"
                                    type="number"
                                    value={form.seatPrice}
                                    prefix={currencySymbol}
                                    placeholder="0"
                                    suffix="/ month"
                                    onChange={(value) => updateField("seatPrice", value)}
                                />
                            </>
                        ) : (
                            <>
                                <Field
                                    label="Leasable area"
                                    type="number"
                                    value={form.area}
                                    error={errors.area}
                                    placeholder="e.g. 25000"
                                    suffix={areaUnit}
                                    onChange={(value) => updateField("area", value)}
                                />
                                <Field
                                    label="Floor plate"
                                    type="number"
                                    value={form.floorPlate}
                                    placeholder="e.g. 20000"
                                    suffix={areaUnit}
                                    onChange={(value) => updateField("floorPlate", value)}
                                />
                                <Field
                                    label="Rent"
                                    type="number"
                                    value={form.rent}
                                    prefix={currencySymbol}
                                    placeholder="0"
                                    suffix={`/ ${areaUnit} / month`}
                                    onChange={(value) => updateField("rent", value)}
                                />
                                <Field
                                    label="Achievable rent"
                                    type="number"
                                    value={form.achievableRent}
                                    prefix={currencySymbol}
                                    placeholder="0"
                                    suffix={`/ ${areaUnit} / month`}
                                    onChange={(value) => updateField("achievableRent", value)}
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
                            aria-invalid={Boolean(errors.consent)}
                            aria-describedby={errors.consent ? "listing-consent-error" : undefined}
                            className="mt-0.5 h-4 w-4 accent-[#A054A0]"
                        />
                        <div>
                            <p className="text-sm font-semibold">I confirm that the information provided is accurate.</p>
                            <p className="mt-1 text-xs leading-5 text-black/50">
                                I agree to the platform&apos;s privacy policy and understand that the information may be reviewed by the property administration team before publication.
                            </p>
                        </div>
                    </label>
                    {errors.consent && <p id="listing-consent-error" className="mt-2 text-xs text-red-700">{errors.consent}</p>}
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

export function ReviewSubmission({
    form,
    method,
    isCoworking,
    currencySymbol,
    areaUnit,
    phoneDial,
    formConsent,
    setFormConsent,
    consentError,
    submitError,
    guardFields,
    isSubmitting,
    onBack,
    onSubmit,
}) {
    const isAssistance = method === "callback";
    const price = (value) => (value ? `${currencySymbol}${value}` : "—");
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
            descriptionClassName="text-[#3F3A40]"
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
                            {isCoworking ? (
                                <>
                                    <ReviewRow label="Seats offered" value={form.seats ? `${form.seats} seats` : "—"} />
                                    <ReviewRow label="Per seat cost" value={form.seatPrice ? `${price(form.seatPrice)} / month` : "—"} />
                                </>
                            ) : (
                                <>
                                    <ReviewRow label="Leasable area" value={form.area ? `${form.area} ${areaUnit}` : "—"} />
                                    <ReviewRow label="Floor plate" value={form.floorPlate ? `${form.floorPlate} ${areaUnit}` : "—"} />
                                    <ReviewRow label="Rent" value={form.rent ? `${price(form.rent)} / ${areaUnit} / month` : "—"} />
                                    <ReviewRow label="Achievable rent" value={form.achievableRent ? `${price(form.achievableRent)} / ${areaUnit} / month` : "—"} />
                                </>
                            )}
                        </>
                    )}
                </ReviewCard>
                <ReviewCard title="Contact" icon={<UserRound size={18} />}>
                    <ReviewRow label="Contact" value={form.contactName} />
                    <ReviewRow label="Phone" value={form.phone ? `${phoneDial} ${form.phone}` : ""} />
                    <ReviewRow label="Email" value={form.email} />
                    {/* Company name hidden for now.
                    <ReviewRow label="Company" value={form.companyName} />
                    */}
                </ReviewCard>
                {isAssistance && (
                    <SectionCard title="Declaration & privacy" description="Please confirm before submitting." descriptionClassName="text-[#3F3A40]">
                        <label className="flex cursor-pointer gap-3 rounded-2xl border border-[#A054A0]/10 bg-[#A054A0]/[0.025] p-5">
                            <input
                                type="checkbox"
                                checked={formConsent}
                                onChange={(event) => setFormConsent(event.target.checked)}
                                aria-invalid={Boolean(consentError)}
                                aria-describedby={consentError ? "review-consent-error" : undefined}
                                className="mt-0.5 h-4 w-4 accent-[#A054A0]"
                            />
                            <div>
                                <p className="text-sm font-semibold text-black">I confirm that the information provided is accurate.</p>
                                <p className="mt-1 text-xs leading-5 text-[#3F3A40]">
                                    I agree to be contacted regarding my property listing and to the platform&apos;s privacy policy, and understand that my information may be used for verification purposes.
                                </p>
                            </div>
                        </label>
                        {consentError && <p id="review-consent-error" className="mt-2 text-xs text-red-700">{consentError}</p>}
                    </SectionCard>
                )}
                {guardFields}
                {submitError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {submitError}
                    </div>
                )}
                <div className="flex items-start gap-3 rounded-2xl border border-[#A054A0]/15 bg-[#A054A0]/[0.045] p-5">
                    <Info size={18} className="mt-0.5 shrink-0 text-[#A054A0]" />
                    <p className="text-xs leading-5 text-[#3F3A40]">
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

export function SuccessScreen({ method, onRestart }) {
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
