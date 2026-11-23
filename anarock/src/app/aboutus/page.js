"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Award, Rocket, Armchair, Mail } from "lucide-react";
import { useState } from "react";
import MarketStats from "@/components/home/MarketStats";
import Breadcrumbs from "@/components/common/Breadcrumbs";

const leaders = [
    {
        name: "Anuj Puri",
        role: "Chairman",
        image: "/services/leaders/AnujPuri.webp",
        linkedin: "https://www.linkedin.com/in/theanujpuri",
        email: "",
        description: (
            <>
                <b className="font-semibold text-black">
                    Leading real estate industry spokesperson,
                </b>{" "}
                <strong>Chairman and Founder of Anarock</strong>, deep networks and
                strong market influence translate into strategic leverage, driving
                best-in-class outcomes for our clients.
            </>
        ),
    },
    {
        name: "Santhosh Kumar",
        role: "Group Vice Chairman",
        image: "/services/leaders/SanthoshKumar.webp",
        linkedin: "https://www.linkedin.com/in/santhosh-kumar-anarock/",
        email: "santhosh.kumar@anarock.com",
        description: (
            <>
                <strong>Head of operations at Anarock</strong>,{" "}
                <b className="font-semibold text-black">deep developer relationships</b>{" "}
                create a distinct advantage, driving superior, benchmark-setting
                outcomes for clients.
            </>
        ),
    },
    {
        name: "Peush Jain",
        role: "MD – Commercial Leasing & Advisory",
        image: "/services/leaders/Peush.webp",
        linkedin: "https://www.linkedin.com/in/peush-jain-62560b5/",
        email: "peush.jain@anarock.com",
        description: (
            <>
                <b className="font-semibold text-black">
                    One of the senior leaders in India&apos;s corporate real estate
                    industry, leading{" "}
                </b>
                <strong>Anarock&apos;s Commercial Leasing &amp; Advisory (CLA)</strong>{" "}
                business with a client-first, advisory-led approach.
            </>
        ),
    },
];
const companyStats = [
    { value: "3000+", label: "Employees" },
    {
        value: "$100 B",
        label: "Transacted & Advised since June 2017",
    },
    { value: "30%", label: "YoY Growth" },
    { value: "15", label: "Offices across India" },
];


const companyJourney = [
    {
        year: "2017",
        detail: (
            <>
                <strong>Inception</strong> of Anarock
            </>
        ),
    },
    {
        year: "2018",
        detail: (
            <>
                JV with HVS for Hospitality. <strong>Launch</strong> of
                Investment Banking, Land Services, Retail Leasing,
                Strategic Advisory &amp; Valuations.
            </>
        ),
    },
    {
        year: "2019",
        detail: (
            <>
                Launch of Anarock Open Market. Certified as a
                <strong> Great Place To Work</strong>.
            </>
        ),
    },
    {
        year: "2020",
        detail: (
            <>
                Forayed into Commercial Strata.
            </>
        ),
    },
    {
        year: "2021",
        detail: (
            <>
                <strong>Acquisition</strong> of ANACITY, a community
                                management application. <strong>Launched</strong> &apos;Astra&apos;,
                an AI/ML tool to boost sales.
            </>
        ),
    },
    {
        year: "2022",
        detail: (
            <>
                <strong>Significant investment</strong> in myHQ, a
                co-working spaces aggregator. <strong>Started</strong>
                {" "}Retail Strata sales.
            </>
        ),
    },
    {
        year: "2023",
        detail: (
            <>
                Launch of Dubai to Dubai Resi Sales. Astra received
                <strong> Patented status</strong> from GOI.
            </>
        ),
    },
    {
        year: "2024",
        detail: (
            <>
                <strong>Raised</strong> ~INR 200cr funding from 360 ONE
                Asset, the first equity investor.
            </>
        ),
    },
    {
        year: "2025",
        detail: (
            <>
                <strong>Launch of PMES</strong> (Project Management &
                Engineering Services).
            </>
        ),
    },
    {
        year: "2026",
        detail: (
            <>
                Commenced <strong>IPO Journey</strong> for Anarock.
                <strong> Acquired 51% Stake</strong> in DSP Design Associates.
            </>
        ),
    },
];


const partners = [
    { name: "BINSWANGER", IMG: "/services/research/binswanger.png", scale: 2.2 },
    { name: "HVS", IMG: "/services/research/hvs.png", scale: 0.75 },
    { name: "BROADENING", IMG: "/services/research/bway.png", scale: 1.5 },
    { name: "VINDICO", IMG: "/services/research/vindico.png", scale: 2.3 },
    { name: "myHQ", IMG: "/services/research/myhq.svg", scale: 0.75 },
    { name: "UPFLEX", IMG: "/services/research/upflex.png", scale: 2 },
];
const highlights = [
    {
        icon: Rocket,
        emphasis: "Leading",
        text: "Property Consultant in India",
    },
    {
        icon: Award,
        emphasis: "Patented",
        text: "proprietary AI tools",
    },
    {
        icon: Armchair,
        prefix: "India's ",
        emphasis: "Largest",
        text: "Flex Supply Aggregator",
    },
];
const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.55, ease: "easeOut" },
    },
};

const highlightYears = new Set(["2017", "2026"]);

// Logos shown under a year. Add an entry here when a new logo file is in /public.
const journeyLogos = {
    "2017": [{ src: "/aboutus/journey/anarock.png", alt: "Anarock", width: 366, height: 60 }],
    "2018": [{ src: "/aboutus/journey/hvs.png", alt: "HVS", width: 157, height: 78 }],
    "2019": [{ src: "/aboutus/journey/gptw.png", alt: "Great Place To Work Certified", width: 94, height: 160, tall: true }],
    "2020": [{ src: "/aboutus/journey/anarock-strata.png", alt: "Anarock Commercial & Retail Strata", width: 218, height: 54 }],
    "2021": [{ src: "/aboutus/journey/anacity.png", alt: "ANACITY", width: 580, height: 111 }],
    "2022": [{ src: "/aboutus/journey/myhq.png", alt: "myHQ", width: 143, height: 69 }],
    "2023": [{ src: "/aboutus/journey/anarock-middle-east.png", alt: "Anarock Middle East", width: 394, height: 100 }],
    "2024": [{ src: "/aboutus/journey/360one.png", alt: "360 ONE", width: 120, height: 124, tall: true }],
    "2025": [{ src: "/aboutus/journey/anarock-pmes.png", alt: "Anarock Project Management and Engineering Services", width: 180, height: 58 }],
    "2026": [{ src: "/aboutus/journey/dsp.png", alt: "DSP Design Associates", width: 161, height: 160, tall: true }],
};

function JourneyLogos({ year, className = "" }) {
    const logos = journeyLogos[year];
    if (!logos?.length) return null;

    return (
        <div className={`flex flex-wrap items-center gap-3 ${className}`}>
            {logos.map((logo) => (
                <Image
                    key={logo.src}
                    src={logo.src}
                    alt={logo.alt}
                    width={logo.width}
                    height={logo.height}
                    unoptimized
                    className={`w-auto object-contain ${logo.tall ? "h-10" : "h-7 max-w-[130px]"}`}
                />
            ))}
        </div>
    );
}

function LinkedinIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.44-2.13 2.94v5.67H9.35V8.99h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM3.56 20.45h3.57V8.99H3.56v11.46z" />
        </svg>
    );
}

// Where Anarock comes from: the firms its leadership built before 2017.
const legacyJourney = [
    { year: "1995", name: "Chesterton Meghraj" },
    { year: "2005", name: "Trammell Crow Meghraj" },
    { year: "2007", name: "Jones Lang LaSalle Meghraj" },
    { year: "2012", name: "JLL" },
    { year: "2017", name: "Anarock", logo: "/Anarock(W).svg" },
];

function LegacyJourney() {
    return (
        <section
            aria-labelledby="legacy-journey-heading"
            className="bg-[#FAF9FA] px-4 pt-12 sm:px-6 sm:pt-16 md:px-8 lg:px-12 lg:pt-20 xl:px-16"
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative mx-auto w-full max-w-[1440px] min-w-0 overflow-hidden rounded-2xl bg-[#33203A] px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14 lg:py-14"
            >
                <div className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#E4B8E4]">
                            The Journey
                        </p>
                        <h2
                            id="legacy-journey-heading"
                            className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl"
                        >
                            Three decades in the making
                        </h2>
                    </div>
                    <p className="max-w-md text-sm leading-6 text-white sm:text-base lg:text-right">
                        The leadership behind Anarock built some of India&apos;s best-known real estate firms before starting its own in 2017.
                    </p>
                </div>

                {/* Tablet and desktop: one line, five stops */}
                <ol className="relative mt-12 hidden grid-cols-5 md:grid lg:mt-14">
                    <span className="absolute left-0 right-[10%] top-[7px] h-px bg-gradient-to-r from-white/15 via-white/35 to-[#D7A8D7]" />
                    {legacyJourney.map((item, index) => {
                        const last = index === legacyJourney.length - 1;
                        return (
                            <motion.li
                                key={item.year}
                                initial={{ opacity: 0, y: 14 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.4 }}
                                transition={{ duration: 0.45, delay: 0.1 + index * 0.08 }}
                                className="relative min-w-0 pr-4"
                            >
                                <span className="relative block h-[15px] w-[15px]">
                                    <span
                                        className={`absolute rounded-full ${last
                                            ? "-left-[2.5px] -top-[2.5px] h-5 w-5 bg-[#A054A0] ring-4 ring-[#A054A0]/30"
                                            : "inset-0 border-2 border-[#D7A8D7] bg-[#33203A]"
                                            }`}
                                    />
                                </span>
                                <p
                                    className={`mt-5 font-semibold leading-none tracking-tight ${last ? "text-[#E9B9E9]" : "text-white"
                                        } text-2xl lg:text-[28px]`}
                                >
                                    {item.year}
                                </p>
                                {item.logo ? (
                                    <Image
                                        src={item.logo}
                                        alt={item.name}
                                        width={119}
                                        height={32}
                                        unoptimized
                                        className="mt-3 h-7 w-auto lg:h-8"
                                    />
                                ) : (
                                    <p className="mt-3 text-sm leading-6 text-white lg:text-[15px]">
                                        {item.name}
                                    </p>
                                )}
                            </motion.li>
                        );
                    })}
                </ol>

                {/* Phone: the same stops, top to bottom */}
                <ol className="relative mt-10 space-y-7 md:hidden">
                    <span className="absolute bottom-3 left-[7px] top-2 w-px bg-gradient-to-b from-white/20 to-[#D7A8D7]" />
                    {legacyJourney.map((item, index) => {
                        const last = index === legacyJourney.length - 1;
                        return (
                            <li key={item.year} className="relative pl-9">
                                <span
                                    className={`absolute top-1 rounded-full ${last
                                        ? "left-[-2px] h-[19px] w-[19px] bg-[#A054A0] ring-4 ring-[#A054A0]/30"
                                        : "left-0 h-[15px] w-[15px] border-2 border-[#D7A8D7] bg-[#33203A]"
                                        }`}
                                />
                                <p className={`text-2xl font-semibold leading-none ${last ? "text-[#E9B9E9]" : "text-white"}`}>
                                    {item.year}
                                </p>
                                {item.logo ? (
                                    <Image
                                        src={item.logo}
                                        alt={item.name}
                                        width={119}
                                        height={32}
                                        unoptimized
                                        className="mt-2.5 h-7 w-auto"
                                    />
                                ) : (
                                    <p className="mt-2 text-[15px] text-white">{item.name}</p>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </motion.div>
        </section>
    );
}

const journeyRowsInOrder = [
    companyJourney.slice(0, 5), // 2017 to 2021
    companyJourney.slice(5), // 2022 to 2026
];

function JourneyYear({ item, index, now = false }) {
    const highlight = highlightYears.has(item.year);

    return (
        <motion.li
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: (index % 5) * 0.06 }}
            className="relative flex min-w-0 flex-col"
        >
            {/* dot on the line */}
            <span className="relative z-10 block h-[15px] w-[15px]">
                <span
                    className={`absolute rounded-full ${now
                        ? "-left-[2.5px] -top-[2.5px] h-5 w-5 bg-[#A054A0] ring-4 ring-[#A054A0]/20"
                        : highlight
                            ? "inset-0 bg-[#A054A0]"
                            : "inset-0 border-2 border-[#C99BC9] bg-[#FAF9FA]"
                        }`}
                />
            </span>

            <div className="mt-4 flex flex-1 flex-col rounded-xl border border-[#ECE6ED] bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#D8C3D8] hover:shadow-[0_14px_30px_rgba(40,25,43,0.07)] xl:p-5">
                <div className="flex items-center gap-2">
                    <h3
                        className={`text-[22px] font-semibold leading-none tracking-tight xl:text-2xl ${highlight ? "text-[#A054A0]" : "text-black"
                            }`}
                    >
                        {item.year}
                    </h3>
                    {now && (
                        <span className="rounded-full bg-[#F3E6F3] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A054A0]">
                            Now
                        </span>
                    )}
                </div>
                <p className="mt-3 text-[13px] leading-[1.6] text-black [&_strong]:font-semibold [&_strong]:text-black xl:text-sm">
                    {item.detail}
                </p>
                <JourneyLogos year={item.year} className="mt-auto pt-4" />
            </div>
        </motion.li>
    );
}

export default function AboutUsPage() {
    return (
        <main className="w-full min-w-0 overflow-x-clip text-black">
            <Breadcrumbs items={[{
                label: "About us", href: "/aboutus",
            }]} />

            <section className="relative">
                <div className="relative mx-auto grid w-full max-w-[1440px] min-w-0 grid-cols-1 items-center gap-8 px-4 py-6 sm:gap-10 sm:px-6 sm:py-8 md:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10 lg:px-12 xl:px-16">
                    <motion.div initial="hidden" animate="visible" variants={{
                        hidden: {}, visible: { transition: { staggerChildren: 0.12 }, },
                    }}
                        className="relative z-10">
                        <motion.div variants={fadeUp}></motion.div>

                        <motion.h1
                            variants={fadeUp}
                            className="text-[clamp(2.75rem,7vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.05em]"
                        >
                            Who
                            <br />
                            <span className="text-[#A054A0]">we are.</span>
                        </motion.h1>

                        <motion.p
                            variants={fadeUp}
                            className="mt-5 max-w-[510px] text-[15px] leading-7 text-black sm:mt-6 sm:text-lg sm:leading-8"
                        >
                            <span className="font-semibold italic text-[#A054A0]">
                                Anarock
                            </span>{" "}
                            is a leading international property consultant that delivers
                            comprehensive real estate services to a large and diversified
                            client base including developers, corporates, financial
                            institutions, government, and individuals.
                        </motion.p>

                        <motion.div
                            variants={fadeUp}
                            className="mt-7 border-t border-[#ded9df] pt-6 sm:mt-9 sm:pt-7"
                        >
                            <div className="space-y-5">
                                {highlights.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <div
                                            key={item.emphasis}
                                            className="flex min-w-0 items-center gap-3 sm:gap-4"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e5d9e5] bg-white text-[#A054A0] sm:h-11 sm:w-11">
                                                <Icon size={20} strokeWidth={1.6} />
                                            </div>

                                            <p className="min-w-0 text-sm leading-6 text-black sm:text-base">
                                                {item.prefix || ""}
                                                <strong className="font-bold text-[#A054A0]">
                                                    {item.emphasis}
                                                </strong>{" "}
                                                {item.text}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.75 }}
                        className="relative z-10"
                    >
                        <div className="pointer-events-none absolute -inset-1 border border-white border-t-black/75 border-r-black/75 sm:-inset-3" />

                        <div className="relative min-h-[280px] w-full overflow-hidden sm:min-h-[380px] md:min-h-[460px] lg:min-h-[540px]">
                            <Image
                                src="/services/OfficeMarket.avif"
                                alt="Anarock commercial office workspace"
                                fill
                                priority
                                sizes="(max-width: 1024px) 100vw, 60vw"
                                className="object-cover grayscale-[25%]"
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/5" />

                            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-9">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                                    International property consultant
                                </p>
                                <h2 className="mt-3 max-w-md text-2xl font-medium leading-snug text-white sm:text-4xl">
                                    Comprehensive real estate services.
                                </h2>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Company statistics */}
            <section className="border-y border-[#eae6eb] bg-[#f8f7f8] px-4 py-12 sm:px-6 sm:py-16 md:px-8 lg:px-12 lg:py-20 xl:px-16">
                <div className="mx-auto w-full max-w-[1280px] min-w-0">
                    <div className="mb-9">
                        <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                            Our scale and reach.
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-px overflow-hidden border border-[#e9e4e9] bg-[#e9e4e9] sm:grid-cols-2 lg:grid-cols-4">
                        {companyStats.map((stat) => (
                            <motion.div
                                key={stat.label}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.2 }}
                                variants={fadeUp}
                                className="flex min-h-[130px] min-w-0 flex-col justify-between bg-white p-4 sm:min-h-[160px] sm:p-6 lg:p-7"
                            >
                                <div>
                                    <p className="text-2xl font-semibold tracking-[-0.04em] text-[#A054A0] sm:text-4xl">
                                        {stat.value}
                                    </p>
                                    <p className="mt-2 text-xs leading-5 text-black sm:text-sm sm:leading-6">
                                        {stat.label}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="relative min-h-[190px] overflow-hidden bg-[#e8e5e8] sm:min-h-[230px]">
                            <Image
                                src="/services/research/seat.webp"
                                alt="Commercial office workspace"
                                fill
                                priority
                                sizes="(max-width: 640px) 100vw, 50vw"
                                className="object-cover grayscale"
                            />
                        </div>

                        <div className="flex min-h-[190px] min-w-0 flex-col justify-center bg-white p-6 sm:min-h-[230px] sm:p-10">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black">
                                Annual revenue
                            </p>
                            <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-[#A054A0] sm:text-5xl">
                                $110 M
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex min-h-[190px] min-w-0 flex-col justify-center bg-white p-6 sm:min-h-[230px] sm:p-10">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black">
                                Presence in
                            </p>
                            <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-[#A054A0] sm:text-3xl">
                                India, US, UK,
                                <br />
                                Middle East &amp; Singapore
                            </p>
                        </div>

                        <div className="relative min-h-[190px] overflow-hidden bg-[#e8e5e8] sm:min-h-[230px]">
                            <Image
                                src="/services/research/seat2.jpg"
                                alt="Commercial office workspace"
                                fill
                                priority
                                sizes="(max-width: 640px) 100vw, 50vw"
                                className="object-cover grayscale"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Where it started */}
            <LegacyJourney />

            {/* Company Journey */}
            <section
                aria-labelledby="company-journey-heading"
                className="bg-[#FAF9FA] px-4 py-12 sm:px-6 sm:py-16 md:px-8 lg:px-12 lg:py-20 xl:px-16"
            >
                <div className="mx-auto w-full max-w-[1440px] min-w-0">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10"
                    >
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#A054A0]">
                                2017 &ndash; Today
                            </p>
                            <h2
                                id="company-journey-heading"
                                className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl"
                            >
                                From Foundation to{" "}
                                <span className="text-[#A054A0]">Future</span>
                            </h2>
                        </div>
                        <p className="max-w-md text-sm italic leading-6 text-black sm:text-base lg:text-right">
                            A journey of expansion, innovation and new opportunities
                            shaping{" "}
                            <span className="text-[#A054A0]">Anarock&apos;s evolution</span>.
                        </p>
                    </motion.div>

                    {/* Desktop: two rows of five, read left to right */}
                    <div className="mt-12 hidden space-y-10 lg:block lg:mt-14">
                        {journeyRowsInOrder.map((row, rowIndex) => (
                            <ol key={rowIndex} className="relative grid grid-cols-5 gap-4 xl:gap-5">
                                <span className="absolute left-0 right-0 top-[7px] h-px bg-gradient-to-r from-[#E2CFE2] to-[#C99BC9]" />
                                {row.map((item, index) => (
                                    <JourneyYear
                                        key={item.year}
                                        item={item}
                                        index={index}
                                        now={item.year === "2026"}
                                    />
                                ))}
                            </ol>
                        ))}
                    </div>

                    {/* Phone and tablet: one list, oldest first */}
                    <ol className="relative mt-10 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:hidden">
                        {companyJourney.map((item, index) => {
                            const highlight = highlightYears.has(item.year);
                            return (
                                <motion.li
                                    key={item.year}
                                    initial={{ opacity: 0, y: 14 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.2 }}
                                    transition={{ duration: 0.45, delay: (index % 2) * 0.05 }}
                                    className="relative min-w-0 border-l-2 border-[#E4D3E4] pl-5"
                                >
                                    <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-[#FAF9FA] bg-[#A054A0]" />
                                    <div className="flex items-center gap-2">
                                        <h3
                                            className={`font-semibold leading-none tracking-tight ${highlight
                                                ? "text-2xl text-[#A054A0]"
                                                : "text-xl text-black"
                                                }`}
                                        >
                                            {item.year}
                                        </h3>
                                        {item.year === "2026" && (
                                            <span className="rounded-full bg-[#F3E6F3] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A054A0]">
                                                Now
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-2.5 text-sm leading-6 text-black [&_strong]:font-semibold [&_strong]:text-black">
                                        {item.detail}
                                    </p>
                                    <JourneyLogos year={item.year} className="mt-3" />
                                </motion.li>
                            );
                        })}
                    </ol>
                </div>
            </section>

            {/* Market statistics */}
            <section aria-label="Commercial real estate market statistics" className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
                <div className="mx-auto w-full max-w-[1600px] min-w-0">
                    <div className="mb-6 px-1 sm:px-2 lg:px-4">
                        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            Commercial real estate at a glance
                        </h2>
                    </div>
                    <MarketStats />
                </div>
            </section>

            {/* Global partners */}
            <section className="px-4 py-12 sm:px-6 sm:py-16 md:px-8 lg:px-12 lg:py-20 xl:px-16">
                <div className="mx-auto grid w-full max-w-[1280px] min-w-0 grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-5 lg:gap-12">
                    <div className="lg:col-span-2">
                        <h2 className="text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
                            A connected
                            <span className="block text-[#A054A0]">global network.</span>
                        </h2>
                    </div>
                    <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-3">
                        {partners.map((partner) => (
                            <div
                                key={partner.name}
                                className="flex h-[150px] items-center justify-center overflow-hidden rounded-sm border border-dashed border-slate-400 bg-white p-5 transition-all duration-300 hover:border-[#cda5c7] hover:shadow-sm sm:h-[170px]"
                            >
                                {partner.IMG && (
                                    <div className="flex h-[80px] w-[180px] items-center justify-center">
                                        <img
                                            src={partner.IMG}
                                            alt={partner.name}
                                            loading="lazy"
                                            className="max-h-full max-w-full object-contain"
                                            style={{
                                                transform: `scale(${partner.scale || 1})`,
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Leadership */}
            <section className="border-t border-[#eae6eb] bg-[#f8f7f8] px-4 py-14 sm:px-6 sm:py-16 md:px-8 lg:px-12 lg:py-20 xl:px-16">
                <div className="mx-auto w-full max-w-[1280px] min-w-0">
                    <div className="mb-10 sm:mb-12">
                        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#A054A0]">
                            Executive Leadership
                        </span>
                        <h2 className="mt-2 text-3xl font-light tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
                            The minds driving our vision.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {leaders.map((leader, index) => (
                            <motion.article
                                key={leader.name}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.2 }}
                                transition={{ duration: 0.5, delay: index * 0.08 }}
                                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E9E3EA] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#D8C3D8] hover:shadow-[0_18px_40px_rgba(40,25,43,0.08)] sm:flex-row lg:flex-col"
                            >
                                {/* Photo: every photo is shown at the same height, close to its
                                    own size and without re-compression, so none is blurred by
                                    stretching. Files of 600px or more look sharpest. */}
                                <div className="relative flex h-[250px] shrink-0 items-end justify-center overflow-hidden bg-gradient-to-b from-[#F5EEF5] to-[#FBF8FB] sm:h-auto sm:min-h-[250px] sm:w-[260px] lg:h-[260px] lg:w-full">
                                    <span className="absolute -bottom-16 left-1/2 h-[230px] w-[230px] -translate-x-1/2 rounded-full bg-[#EEDFEE] transition-transform duration-500 group-hover:scale-105" />
                                    <Image
                                        src={leader.image}
                                        alt={leader.name}
                                        width={300}
                                        height={300}
                                        unoptimized
                                        className="relative h-[215px] w-auto max-w-[90%] object-contain object-bottom"
                                    />
                                </div>

                                <div className="flex min-w-0 flex-1 flex-col p-6 sm:p-7">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A054A0]">
                                        {leader.role}
                                    </p>
                                    <h3 className="mt-1.5 text-2xl font-semibold tracking-tight text-gray-900">
                                        {leader.name}
                                    </h3>
                                    <div className="my-4 h-px w-12 bg-[#D8C3D8] transition-all duration-300 group-hover:w-24" />
                                    <p className="text-sm leading-6 text-gray-600 [&_b]:font-semibold [&_b]:text-gray-900 [&_strong]:font-medium [&_strong]:text-[#A054A0]">
                                        {leader.description}
                                    </p>

                                    <div className="mt-auto flex items-center gap-2 pt-6">
                                        {leader.linkedin && (
                                            <a
                                                href={leader.linkedin}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={`${leader.name} on LinkedIn`}
                                                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E3D6E3] text-[#A054A0] transition-colors hover:border-[#A054A0] hover:bg-[#A054A0] hover:text-white"
                                            >
                                                <LinkedinIcon />
                                            </a>
                                        )}
                                        {leader.email && (
                                            <a
                                                href={`mailto:${leader.email}`}
                                                aria-label={`Email ${leader.name}`}
                                                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E3D6E3] text-[#A054A0] transition-colors hover:border-[#A054A0] hover:bg-[#A054A0] hover:text-white"
                                            >
                                                <Mail size={16} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}