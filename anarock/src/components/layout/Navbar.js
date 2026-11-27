"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePreferences, setPreferences } from "@/lib/preferences";
import {
    ChevronDown,
    Menu,
    X,
    ArrowUpRight,
    Check,
    Heart,
    ChevronRight,
} from "lucide-react";

import { useWishlist } from "@/lib/wishlist";
import { useEffect, useRef, useState } from "react";
import LocationControl from "@/components/common/LocationControl";
import EnquiryDialog from "@/components/layout/EnquiryDialog";

const CURRENCY_CONFIG = {
  INR: { symbol: "₹", rate: 1, label: "₹  INR" },
  AED: { symbol: "د.إ", rate: 0.044, label: "د.إ  AED" },
  USD: { symbol: "$", rate: 0.012, label: "$  USD" },
  EUR: { symbol: "€", rate: 0.011, label: "€  EUR" },
  SGD: { symbol: "S$", rate: 0.016, label: "S$ SGD" },
};

const currencies = [
  ["INR", "₹  INR"],
  ["AED", "د.إ  AED"],
  ["USD", "$  USD"],
  ["EUR", "€  EUR"],
  ["SGD", "S$ SGD"],
];


const navigation = [
  { label: "Properties", href: "/properties", type: "link" },
  { label: "Services", href: "/services", type: "link" },
  { label: "About Us", href: "/aboutus", type: "link" },
  { label: "Post a Requirement", href: "/#enquiry", type: "link" },
  { label: "List your Property", href: "/list-your-property", type: "link" },
];

const mainServices = [
  {
    title: "Leasing Services",
    slug: "leasing-services",
  },
  {
    title: "Transaction Management",
    slug: "transaction-management",
  },
  {
    title: "Advisory Services",
    slug: "advisory-services",
  },
  {
    title: "Enterprise Advisory Solutions",
    slug: "enterprise-advisory-solutions",
  },
  {
    // Opens its own page instead of a tab on /services.
    title: "GCC Calculator",
    slug: "gcc-calculator",
    href: "/gcc-calculator",
  },
];

const ALL_SERVICES_URL = "/services";

export default function Navbar() {
  const router = useRouter();
  const { count: wishlistCount } = useWishlist();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const { currency: currencyCode, unit } = usePreferences();

  const currencyLabel = CURRENCY_CONFIG[currencyCode]?.label || "₹  INR";

  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const servicesMenuRef = useRef(null);

  const [servicesMenuOpen, setServicesMenuOpen] = useState(false);
  const [mobileServicesExpanded, setMobileServicesExpanded] = useState(false);

  const handleCurrencySelect = (code) => {
    setCurrencyOpen(false);
    setPreferences({ currency: code, unit });
  };

  const handleUnitSelect = (selectedUnit) => {
    const normalizedUnit = selectedUnit === "sq.m" ? "sqm" : "sqft";
    setPreferences({ currency: currencyCode, unit: normalizedUnit });
  };

  const handleServiceNavigation = (service) => {
    if (service.href) {
      closeMenu();
      router.push(service.href);
      return;
    }

    const slug = service.slug;
    sessionStorage.setItem("anarock_selected_service", slug);

    closeMenu();

    if (window.location.pathname.replace(/\/$/, "") === "/services") {
      window.dispatchEvent(
        new CustomEvent("anarock-service-selected", {
          detail: { slug },
        }),
      );
      return;
    }

    router.push("/services");
  };


  const closeMenu = () => {
    setMobileOpen(false);
    setCurrencyOpen(false);
    setServicesMenuOpen(false);
    setMobileServicesExpanded(false);
  };

  const openEnquiry = () => {
    setEnquiryOpen(true);
  };

  const handleScrollNavigation = (href) => {
    closeMenu();
    const targetId = href?.replace("#", "");
    if (!targetId) return;

    setTimeout(() => {
      const section = document.getElementById(targetId);
      if (!section) return;
      const header = document.querySelector("header");
      const headerHeight = header?.offsetHeight || 80;
      const sectionTop =
        section.getBoundingClientRect().top + window.pageYOffset - headerHeight;

      window.scrollTo({
        top: Math.max(0, sectionTop),
        behavior: "smooth",
      });
    }, 100);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
        setCurrencyOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (mobileOpen || enquiryOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [mobileOpen, enquiryOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      setCurrencyOpen(false);
      setServicesMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky inset-x-0 top-0 z-[100] w-full translate-y-0 opacity-100">
        <div className="relative mx-auto w-full overflow-visible border shadow-lg border-white/40 bg-transparent backdrop-blur-2xl">
          <div className="flex h-[70px] min-h-[70px] w-full items-center justify-between gap-2 px-3 sm:h-[70px] sm:px-4 md:gap-3 md:px-5 lg:h-[85px] lg:px-3 lg:max-[1279px]:gap-1.5 min-[1280px]:h-[80px] min-[1280px]:gap-2 min-[1280px]:px-3 min-[1920px]:h-[80px] min-[1920px]:px-8">
            <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3 md:gap-3.5 min-[1920px]:gap-5">
              <Link
                href="/"
                onClick={closeMenu}
                aria-label="Anarock Commercial Listing Platform"
                className="group flex shrink-0 items-center transition-transform duration-200 active:scale-95"
              >
                <Image
                  src="/Anarock.svg"
                  alt="Anarock"
                  width={148}
                  height={40}
                  priority
                  unoptimized
                  className="block h-auto w-[90px] object-contain transition-transform duration-300 group-hover:scale-105 sm:w-[102px] md:w-[112px] lg:w-[120px] lg:max-[1279px]:w-[100px] min-[1280px]:w-[122px] min-[1920px]:w-[150px]"
                />
              </Link>
              {/* Location is asked for only when the visitor uses this button. */}
              <LocationControl />
            </div>

            {/* Desktop Navigation */}
            <nav className="no-scrollbar mx-0 hidden min-w-0 items-center justify-center gap-1 overflow-visible rounded-lg border border-white/80 bg-white/90 px-4 py-1.5 shadow-sm backdrop-blur-md lg:flex lg:max-[1279px]:gap-0 lg:max-[1279px]:px-1 min-[1280px]:gap-0.5 min-[1280px]:px-2 min-[1366px]:gap-1 min-[1366px]:px-4 min-[1920px]:gap-2 min-[1920px]:p-2">
              {navigation.map((item) => {
                if (item.type === "scroll") {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleScrollNavigation(item.href)}
                      className="group relative cursor-pointer whitespace-nowrap rounded-lg border-0 bg-transparent px-3 py-1.5 text-[14px] font-semibold text-black transition-all duration-200 hover:text-[#A054A0] lg:max-[1279px]:px-1.5 lg:max-[1279px]:text-[11px] min-[1280px]:px-2 min-[1280px]:text-[12px] min-[1366px]:px-2.5 min-[1920px]:px-4 min-[1920px]:py-2 min-[1920px]:text-[16px]"
                    >
                      <span>{item.label}</span>
                      <span className="absolute bottom-0 left-2.5 right-2.5 h-[2.5px] rounded-lg bg-[#A054A0] scale-x-0 transition-transform duration-200 group-hover:scale-x-100 min-[1280px]:left-2 min-[1280px]:right-2" />
                    </button>
                  );
                }

                if (item.label === "Services") {
                  return (
                    <div
                      key={item.label}
                      ref={servicesMenuRef}
                      className="relative"
                      onMouseEnter={() => setServicesMenuOpen(true)}
                      onMouseLeave={() => setServicesMenuOpen(false)}
                    >
                      <button
                        type="button"
                        aria-expanded={servicesMenuOpen}
                        onClick={() => setServicesMenuOpen((prev) => !prev)}
                        className={`group relative flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[14px] font-semibold transition-all duration-200 lg:max-[1279px]:px-1.5 lg:max-[1279px]:text-[11px] min-[1280px]:px-2 min-[1280px]:text-[12px] min-[1366px]:px-2.5 min-[1920px]:px-4 min-[1920px]:py-2 min-[1920px]:text-[16px] ${servicesMenuOpen
                          ? "text-[#A054A0]"
                          : "text-black hover:text-[#A054A0]"
                          }`}
                      >
                        <span>{item.label}</span>

                        <span
                          className={`absolute bottom-0 left-2.5 right-2.5 h-[2.5px] rounded-lg bg-[#A054A0] transition-transform duration-200 min-[1280px]:left-2 min-[1280px]:right-2 ${servicesMenuOpen
                            ? "scale-x-100"
                            : "scale-x-0 group-hover:scale-x-100"
                            }`}
                        />
                      </button>

                      {/* DROPDOWN MENU */}
                      {servicesMenuOpen && (
                        <div className="absolute left-1/2 top-full z-[300] pt-2 -translate-x-1/2 animate-[countryDrop_180ms_cubic-bezier(0.16,1,0.3,1)]">
                          <div className="w-[340px] rounded-lg border border-white/90 bg-white/95 p-3 pt-5 shadow-2xl backdrop-blur-2xl">
                            <div className="flex flex-col gap-1">
                              {mainServices.map((service) => (
                                <button
                                  key={service.slug}
                                  type="button"
                                  onClick={() =>
                                    handleServiceNavigation(service)
                                  }
                                  className="group/item flex items-center justify-between rounded-lg px-3.5 py-2.5 transition-all duration-150 hover:bg-[#A054A0]/10"
                                >
                                  <div>
                                    <div className="text-[14px] font-bold text-black transition-colors group-hover/item:text-[#A054A0]">
                                      {service.title}
                                    </div>
                                  </div>
                                  <ChevronRight
                                    size={16}
                                    className="text-black opacity-40 transition-all duration-150 group-hover/item:translate-x-0.5 group-hover/item:opacity-100 group-hover/item:text-[#A054A0]"
                                  />
                                </button>
                              ))}
                            </div>

                            <div className="mt-2 border-t border-black/10 pt-2">
                              <Link
                                href={ALL_SERVICES_URL}
                                onClick={() => setServicesMenuOpen(false)}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#A054A0] py-2.5 text-[13px] font-bold text-white shadow-md transition-all duration-200 hover:bg-[#8d478d] active:scale-95"
                              >
                                <span>View All Services</span>
                                <ArrowUpRight size={15} strokeWidth={2} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="group relative whitespace-nowrap rounded-lg px-3 py-1.5 text-[14px] font-semibold text-black transition-all duration-200 hover:text-[#A054A0] lg:max-[1279px]:px-1.5 lg:max-[1279px]:text-[11px] min-[1280px]:px-2 min-[1280px]:text-[12px] min-[1366px]:px-2.5 min-[1920px]:px-4 min-[1920px]:py-2 min-[1920px]:text-[16px]"
                  >
                    <span>{item.label}</span>
                    <span className="absolute bottom-0 left-2.5 right-2.5 h-[2.5px] rounded-lg bg-[#A054A0] scale-x-0 transition-transform duration-200 group-hover:scale-x-100 min-[1280px]:left-2 min-[1280px]:right-2" />
                  </Link>
                );
              })}
            </nav>

            <div>
              <div className="ml-1 hidden shrink-0 items-center gap-1.5 lg:flex lg:max-[1279px]:ml-0 lg:max-[1279px]:gap-1 min-[1280px]:gap-1.5 min-[1920px]:ml-3 min-[1920px]:gap-3">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCurrencyOpen((prev) => !prev)}
                    className="flex h-9 items-center text-nowrap rounded-lg border border-[#A054A0]/20 bg-white/90 px-3 text-[12px] font-semibold text-black shadow-sm backdrop-blur-md transition-all duration-200 hover:border-[#A054A0] hover:bg-white hover:text-[#A054A0] active:scale-95 lg:max-[1279px]:h-8 lg:max-[1279px]:px-2 lg:max-[1279px]:text-[11px] min-[1280px]:px-2.5 min-[1920px]:h-10 min-[1920px]:px-4 min-[1920px]:text-[13px]"
                  >
                    {currencyLabel}

                    <ChevronDown
                      size={12}
                      strokeWidth={2}
                      className={`transition-transform duration-300 ${currencyOpen
                        ? "rotate-180 text-[#A054A0]"
                        : "text-black"
                        }`}
                    />
                  </button>

                  {currencyOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-[200] w-[150px] origin-top-right rounded-lg border border-white/90 bg-white/95 p-1.5 shadow-lg backdrop-blur-xl animate-[countryDrop_180ms_cubic-bezier(0.16,1,0.3,1)] min-[1920px]:w-[170px]">
                      {currencies.map(([code, label]) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => handleCurrencySelect(code)}
                          className={`w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all duration-150 min-[1920px]:py-2.5 min-[1920px]:text-[14px] ${currencyCode === code
                            ? "bg-[#A054A0] font-bold text-white shadow-sm"
                            : "text-black hover:bg-[#A054A0]/10 hover:text-[#A054A0]"
                            }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center rounded-lg border border-[#A054A0]/20 bg-white/90 p-0.5 shadow-sm backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => handleUnitSelect("sq.ft")}
                    className={`relative z-10 rounded-lg px-2.5 py-1 text-[14px] font-bold transition-all duration-200 active:scale-95 lg:max-[1279px]:px-1.5 lg:max-[1279px]:text-[11px] min-[1280px]:px-2 min-[1280px]:text-[12px] min-[1920px]:px-4 min-[1920px]:py-1.5 min-[1920px]:text-[16px] ${unit === "sqft"
                      ? "bg-[#A054A0] text-white shadow-sm"
                      : "text-black hover:bg-white/80 hover:text-[#A054A0]"
                      }`}
                  >
                    sq.ft
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUnitSelect("sq.m")}
                    className={`relative z-10 rounded-lg px-2.5 py-1 text-[14px] font-bold transition-all duration-200 active:scale-95 lg:max-[1279px]:px-1.5 lg:max-[1279px]:text-[11px] min-[1280px]:px-2 min-[1280px]:text-[12px] min-[1920px]:px-4 min-[1920px]:py-1.5 min-[1920px]:text-[16px] ${unit === "sqm"
                      ? "bg-[#A054A0] text-white shadow-sm"
                      : "text-black hover:bg-white/80 hover:text-[#A054A0]"
                      }`}
                  >
                    sq.m
                  </button>
                </div>

                <button
                  type="button"
                  onClick={openEnquiry}
                  className="group inline-flex h-9 items-center justify-between gap-2 whitespace-nowrap rounded-lg bg-[#A054A0] px-4 text-[14px] font-semibold text-white shadow-md transition-all duration-200 ease-out hover:bg-[#8d478d] hover:shadow-lg active:scale-95 lg:max-[1279px]:h-8 lg:max-[1279px]:gap-1 lg:max-[1279px]:px-2.5 lg:max-[1279px]:text-[11px] min-[1280px]:gap-1 min-[1280px]:px-3 min-[1280px]:text-[12px] min-[1920px]:h-10 min-[1920px]:px-5 min-[1920px]:text-[16px]"
                >
                  <span className="relative z-10">Request Callback</span>

                  <ArrowUpRight
                    size={16}
                    strokeWidth={2}
                    className="relative z-10 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 min-[1920px]:h-5 min-[1920px]:w-5"
                  />
                </button>

                <Link
                  href="/shortlist"
                  aria-label={`Shortlist${wishlistCount > 0
                    ? `, ${wishlistCount} saved properties`
                    : ""
                    }`}
                  className="group relative hidden h-9 shrink-0 items-center gap-1 rounded-lg border border-[#A054A0]/20 bg-white/90 px-3 text-[14px] font-semibold text-black shadow-sm backdrop-blur-md transition-all duration-200 hover:border-[#A054A0] hover:bg-white hover:text-[#A054A0] active:scale-95 lg:inline-flex lg:max-[1279px]:h-8 lg:max-[1279px]:px-2 lg:max-[1279px]:text-[11px] min-[1280px]:px-2.5 min-[1280px]:text-[12px] min-[1920px]:h-10 min-[1920px]:px-4 min-[1920px]:text-[16px]"
                >
                  <Heart
                    size={16}
                    strokeWidth={1.8}
                    className={`transition-all duration-200 min-[1920px]:h-5 min-[1920px]:w-5 ${wishlistCount > 0
                      ? "fill-[#A054A0] text-[#A054A0]"
                      : "text-black group-hover:text-[#A054A0]"
                      }`}
                  />

                  <span className="lg:max-[1279px]:hidden">Shortlisted</span>

                  {wishlistCount > 0 && (
                    <span>({wishlistCount > 99 ? "99+" : wishlistCount})</span>
                  )}
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen((prev) => !prev)}
                aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileOpen}
                className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#A054A0]/20 bg-white/70 text-black shadow-sm backdrop-blur-md transition-all duration-200 hover:border-[#A054A0] hover:bg-white hover:text-[#A054A0] active:scale-90 sm:h-10 sm:w-10 lg:hidden"
              >
                {mobileOpen ? (
                  <X size={18} strokeWidth={2} className="text-[#A054A0]" />
                ) : (
                  <Menu size={18} strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          <div
            className={`overflow-hidden border-t border-[#A054A0]/15 bg-white/95 backdrop-blur-2xl transition-all duration-300 ease-in-out lg:hidden ${mobileOpen
              ? "pointer-events-auto max-h-[calc(100dvh-100px)] rounded-b-xl opacity-100 shadow-xl"
              : "pointer-events-none max-h-0 opacity-0"
              }`}
          >
            <div className="flex max-h-[calc(100dvh-100px)] flex-col justify-between overflow-y-auto px-3 pb-5 pt-3 sm:px-5 sm:pb-7 sm:pt-4">
              <nav className="flex flex-col space-y-1.5">
                {navigation.map((item, index) => {
                  if (item.label === "Services") {
                    return (
                      <div
                        key={item.label}
                        className="flex flex-col rounded-lg border border-[#A054A0]/15 bg-white/80"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setMobileServicesExpanded((prev) => !prev)
                          }
                          className="flex w-full items-center justify-between px-3.5 py-3 text-left text-[14px] font-semibold text-black"
                        >
                          <span>{item.label}</span>
                          <ChevronDown
                            size={18}
                            className={`transition-transform duration-200 ${mobileServicesExpanded
                              ? "rotate-180 text-[#A054A0]"
                              : "text-black"
                              }`}
                          />
                        </button>

                        {mobileServicesExpanded && (
                          <div className="flex flex-col border-t border-black/10 bg-black/[0.02] p-2 space-y-1">
                            {mainServices.map((service) => (
                              <button
                                key={service.slug}
                                type="button"
                                onClick={() =>
                                  handleServiceNavigation(service)
                                }
                                className="w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-black hover:bg-[#A054A0]/10 hover:text-[#A054A0]"
                              >
                                {service.title}
                              </button>
                            ))}
                            <Link
                              href={ALL_SERVICES_URL}
                              onClick={closeMenu}
                              className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#A054A0] py-2 text-[13px] font-bold text-white shadow-md"
                            >
                              <span>View All Services</span>
                              <ArrowUpRight size={14} />
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (item.type === "scroll") {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleScrollNavigation(item.href)}
                        style={{
                          transitionDelay: mobileOpen
                            ? `${index * 30}ms`
                            : "0ms",
                        }}
                        className={`group flex w-full items-center justify-between rounded-lg border border-[#A054A0]/15 bg-white/90 px-3.5 py-3 text-left text-[14px] font-semibold text-black shadow-sm backdrop-blur-md transition-all duration-200 hover:text-[#A054A0] active:scale-[0.99] sm:px-4 sm:py-3.5 sm:text-[15px] ${mobileOpen
                          ? "translate-x-0 opacity-100"
                          : "-translate-x-4 opacity-0"
                          }`}
                      >
                        <span>{item.label}</span>
                        <ArrowUpRight
                          size={18}
                          strokeWidth={2}
                          className="opacity-40 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-[#A054A0]"
                        />
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      style={{
                        transitionDelay: mobileOpen ? `${index * 30}ms` : "0ms",
                      }}
                      className={`group flex w-full items-center justify-between rounded-lg border border-[#A054A0]/15 bg-white/60 px-3.5 py-3 text-left text-[14px] font-semibold text-black shadow-sm backdrop-blur-md transition-all duration-200 hover:text-[#A054A0] active:scale-[0.99] sm:px-4 sm:py-3.5 sm:text-[15px] ${mobileOpen
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-4 opacity-0"
                        }`}
                    >
                      <span>{item.label}</span>
                      <ArrowUpRight
                        size={18}
                        strokeWidth={2}
                        className="opacity-40 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-[#A054A0]"
                      />
                    </Link>
                  );
                })}
              </nav>

              <Link
                href="/shortlist"
                onClick={closeMenu}
                className="mt-2 flex w-full items-center justify-between rounded-lg border border-[#A054A0]/20 bg-white/80 px-3.5 py-3 text-black shadow-sm backdrop-blur-md transition-all duration-200 hover:border-[#A054A0] hover:bg-white hover:text-[#A054A0] active:scale-[0.99] sm:px-4 sm:py-3.5"
              >
                <div className="flex items-center gap-3">
                  <Heart
                    size={20}
                    strokeWidth={1.8}
                    className={
                      wishlistCount > 0
                        ? "fill-[#A054A0] text-[#A054A0]"
                        : "text-black"
                    }
                  />
                  <span className="font-semibold">Shortlisted</span>
                </div>

                {wishlistCount > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-lg bg-[#A054A0] text-white text-xs font-bold shadow-sm">
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                )}
              </Link>

              <div className="mt-4 flex flex-col gap-3 border-t border-[#A054A0]/15 pt-4 sm:mt-5 sm:gap-3.5 sm:pt-5">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[#A054A0]/15 bg-white/50 p-2 shadow-sm backdrop-blur-md">
                  <div className="flex min-w-0 overflow-hidden rounded-lg border border-[#A054A0]/20 bg-white/60 p-0.5">
                    <button
                      type="button"
                      onClick={() => handleUnitSelect("sq.ft")}
                      className={`h-8 rounded-lg px-3.5 text-[12px] font-bold transition-all duration-200 active:scale-95 sm:px-4 sm:text-[13px] ${unit === "sqft"
                        ? "bg-[#A054A0] text-white shadow-sm"
                        : "text-black hover:bg-white/80 hover:text-[#A054A0]"
                        }`}
                    >
                      sq.ft
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUnitSelect("sq.m")}
                      className={`h-8 rounded-lg px-3.5 text-[12px] font-bold transition-all duration-200 active:scale-95 sm:px-4 sm:text-[13px] ${unit === "sqm"
                        ? "bg-[#A054A0] text-white shadow-sm"
                        : "text-black hover:bg-white/80 hover:text-[#A054A0]"
                        }`}
                    >
                      sq.m
                    </button>
                  </div>

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setCurrencyOpen((prev) => !prev)}
                      className="flex h-8 items-center gap-1.5 rounded-lg border border-[#A054A0]/20 bg-white px-2.5 text-[12px] font-semibold text-black shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95 sm:px-3"
                    >
                      {currencyLabel}
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${currencyOpen ? "rotate-180 text-[#A054A0]" : "text-black"
                          }`}
                      />
                    </button>

                    {currencyOpen && (
                      <div className="absolute bottom-[calc(100%+8px)] right-0 z-[200] w-[150px] rounded-lg border border-white/90 bg-white/95 p-1.5 shadow-lg backdrop-blur-xl">
                        {currencies.map(([code, label]) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => handleCurrencySelect(code)}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all duration-150 ${currencyCode === code
                              ? "bg-[#A054A0] font-bold text-white shadow-sm"
                              : "text-black hover:bg-[#A054A0]/10 hover:text-[#A054A0]"
                              }`}
                          >
                            <span>{label}</span>
                            {currencyCode === code && (
                              <Check size={14} className="text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    setTimeout(() => openEnquiry(), 200);
                  }}
                  className="group relative flex h-[48px] w-full items-center justify-between overflow-hidden rounded-lg bg-[#A054A0] px-5 text-[15px] font-bold text-white shadow-md transition-all duration-200 hover:bg-[#8d478d] hover:shadow-lg active:scale-98 sm:text-[15px]"
                >
                  <span className="relative z-10">Request a Callback</span>
                  <ArrowUpRight
                    size={20}
                    strokeWidth={2}
                    className="relative z-10 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ENQUIRY MODAL */}
      {enquiryOpen && (
        <EnquiryDialog
          onClose={() => setEnquiryOpen(false)}
          currencyCode={currencyCode}
          unit={unit}
        />
      )}

      <style jsx global>{`
        .no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        @keyframes navbarFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes navbarPopup {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes countryDrop {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes successPop {
          0% {
            opacity: 0;
            transform: scale(0.65);
          }
          70% {
            transform: scale(1.08);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes errorShake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-4px);
          }
          75% {
            transform: translateX(4px);
          }
        }
      `}</style>
    </>
  );
}