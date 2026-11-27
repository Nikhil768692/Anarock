"use client";

// Form controls and layout pieces of the "List your Property" form.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
    ArrowRight,
    Check,
    ChevronDown,
    Loader2,
    Search,
} from "lucide-react";
import { PHONE_COUNTRIES } from "@/lib/phoneCountries";

export function PageShell({ eyebrow, title, description, icon, children, descriptionClassName = "text-slate-500" }) {
    return (
        <div>
            <div className="mb-9">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#A054A0]/15 bg-gradient-to-br from-[#A054A0]/15 to-[#E8CBE8]/30 text-[#A054A0] shadow-[0_10px_30px_rgba(160,84,160,0.10)]">
                    {icon}
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A054A0]">{eyebrow}</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-[42px] sm:leading-[1.06]">
                    {title}
                </h1>
                <p className={`mt-4 text-sm leading-7 sm:text-[15px] ${descriptionClassName}`}>{description}</p>
            </div>
            {children}
        </div>
    );
}

export function CitySelect({ value, options, loading, error, onChange }) {
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

export function MicromarketSelect({ value, options, loading, disabled, error, onChange }) {
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

export function Field({
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
    prefix,
    suffix,
}) {
    const isNumber = type === "number";
    const prefixText = prefix ? String(prefix).trim() : "";
    const id = useId();
    const errorId = `${id}-error`;
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-sm font-semibold">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                {icon && (
                    <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-black/40">
                        {icon}
                    </div>
                )}
                {prefixText && (
                    <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-sm text-black">
                        {prefixText}
                    </span>
                )}
                <input
                    id={id}
                    type={type}
                    inputMode={isNumber ? "decimal" : inputMode}
                    min={isNumber ? 0 : undefined}
                    maxLength={maxLength}
                    autoComplete={autoComplete}
                    value={value}
                    placeholder={placeholder}
                    required={required || undefined}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    onKeyDown={(event) => {
                        // Numbers here are never negative: block minus, plus and exponent keys.
                        if (isNumber && ["-", "+", "e", "E"].includes(event.key)) event.preventDefault();
                    }}
                    onChange={(event) => {
                        const next = event.target.value;
                        onChange(isNumber ? next.replace(/-/g, "") : next);
                    }}
                    className={[
                        "h-12 w-full rounded-xl border bg-white/85 px-4 text-sm outline-none shadow-[0_6px_25px_rgba(15,23,42,0.03)] backdrop-blur transition-all",
                        icon ? "pl-10" : "",
                        prefixText ? (prefixText.length > 1 ? "pl-14" : "pl-9") : "",
                        suffix ? (suffix.length > 6 ? "pr-32" : "pr-20") : "",
                        error
                            ? "border-red-300 focus:border-red-400"
                            : "border-black/[0.09] focus:border-[#A054A0]/50 focus:ring-4 focus:ring-[#A054A0]/10",
                    ].join(" ")}
                />
                {suffix && (
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-black">
                        {suffix}
                    </span>
                )}
            </div>
            {error && <p id={errorId} className="mt-1.5 text-xs text-red-700">{error}</p>}
        </div>
    );
}

export function PhoneField({ country, value, error, onCountryChange, onChange }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const pickerRef = useRef(null);
    const id = useId();
    const errorId = `${id}-error`;

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
            <label htmlFor={id} className="mb-2 block text-sm font-semibold">
                Phone number <span className="text-red-500">*</span>
            </label>
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
                        id={id}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={value}
                        placeholder="Mobile number"
                        required
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? errorId : undefined}
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
                                    aria-label="Search country or code"
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
            {error && <p id={errorId} className="mt-1.5 text-xs text-red-700">{error}</p>}
        </div>
    );
}

export function SelectField({ label, required, value, options, placeholder, error, loading, disabled, onChange }) {
    const id = useId();
    const errorId = `${id}-error`;
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-sm font-semibold">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <select
                    id={id}
                    value={value}
                    disabled={disabled}
                    required={required || undefined}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
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
                    <option value="" className="text-black/50">{placeholder}</option>
                    {options.map((option) => (
                        <option key={option} value={option} className="text-black">
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
            {error && <p id={errorId} className="mt-1.5 text-xs text-red-700">{error}</p>}
        </div>
    );
}

export function MethodCard({ icon, title, description, features, onClick }) {
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

export function SectionCard({ number, title, description, children, descriptionClassName = "text-black/40" }) {
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
                    <p className={`mt-1 text-xs ${descriptionClassName}`}>{description}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

export function ReviewCard({ title, icon, children }) {
    return (
        <div className="rounded-[28px] border border-white bg-white/80 p-6 shadow-[0_15px_50px_rgba(30,20,40,0.045)] backdrop-blur-xl sm:p-7">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8CBE8] text-[#A054A0]">{icon}</div>
                <h2 className="text-sm font-semibold text-black">{title}</h2>
            </div>
            <div className="divide-y divide-black/[0.06]">{children}</div>
        </div>
    );
}

export function ReviewRow({ label, value }) {
    return (
        <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <span className="text-xs font-medium text-[#3F3A40]">{label}</span>
            <span className="text-sm font-semibold text-black sm:text-right">{value || "—"}</span>
        </div>
    );
}

export function FormFooter({ left, right }) {
    return (
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-black/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>{left}</div>
            <div className="flex justify-end">{right}</div>
        </div>
    );
}

export function PrimaryButton({ children, onClick, disabled = false }) {
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

export function SecondaryButton({ children, onClick }) {
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
