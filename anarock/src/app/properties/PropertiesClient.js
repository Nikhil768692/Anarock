"use client";

import {
  Suspense,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Breadcrumbs from "@/components/common/Breadcrumbs";
import PropertyCard from "@/components/properties/PropertyCard";
import EnquiryModal from "./EnquiryModal";
import ExclusiveLeadModal from "./ExclusiveLeadModal";
import { usePreferences } from "@/lib/preferences";
import { useWishlist } from "@/lib/wishlist";
import { useCompareSelection } from "@/lib/compareSelection";
import { useMediaQuery } from "@/lib/browserStore";
import {
  SECURITY_CHECK_MESSAGE,
  useFormGuard,
} from "@/components/common/FormGuard";
import { convertCurrency, convertArea, convertRentPerArea } from "@/lib/format";
import {
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Search,
  ChevronDown,
  GitCompare,
  Check,
  Users,
  Maximize2,
  IndianRupee,
  DollarSign,
  Euro,
  MessageSquare,
  ArrowRight,
  Heart,

} from "lucide-react";
import { PHONE_COUNTRIES as EXCLUSIVE_PHONE_COUNTRIES } from "@/lib/phoneCountries";
import {
  MAX_COMPARE_PROPERTIES,
  MIN_COMPARE_PROPERTIES,
  OFFICE_TYPES,
  SORT_CATEGORIES,
  PropertyCardSkeleton,
  toUrlValue,
  normalizeValue,
  getOfficeTypeFromUrl,
  getPropertyId,
  getLastSearchedCityFromStorage,
  getRequirementTypeFromStorage,
  getEnquiryPropertyCity,
  getEnquiryPropertyType,
  getStoredUserLocation,
  FilterNumberInput,
} from "./propertiesShared";


function PropertiesClientContent({ initialResults = null }) {
  const { currency, unit, exchangeRates } = usePreferences();
  const [suggestionsHasMore, setSuggestionsHasMore] = useState(false);
  const [suggestionsPage, setSuggestionsPage] = useState(1);
  const suggestionsSentinelRef = useRef(null);
  const suggestionsRequestRef = useRef(false);
  const { ids: wishlistIds, toggle: toggleWishlist } = useWishlist();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isExclusiveLeadOpen, setIsExclusiveLeadOpen] = useState(false);
  const enquiryGuard = useFormGuard();
  const exclusiveGuard = useFormGuard();
  const [isSubmittingExclusiveLead, setIsSubmittingExclusiveLead] = useState(false);
  const [exclusiveLeadSuccess, setExclusiveLeadSuccess] = useState(false);
  const [exclusiveLeadError, setExclusiveLeadError] = useState("");
  const [exclusiveLeadForm, setExclusiveLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
  });
  const [exclusiveFieldErrors, setExclusiveFieldErrors] = useState({});
  const [exclusiveCountry, setExclusiveCountry] = useState(
    EXCLUSIVE_PHONE_COUNTRIES[0],
  );
  const [exclusiveCountryOpen, setExclusiveCountryOpen] = useState(false);
  const [exclusiveCountrySearch, setExclusiveCountrySearch] = useState("");
  const exclusiveCountryRef = useRef(null);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [enquirySelection, setEnquirySelection] = useState([]);
  const [compareSelection, setCompareSelection] = useCompareSelection();
  // Shown for a few seconds when a 4th property is ticked for comparison.
  const [compareLimitNotice, setCompareLimitNotice] = useState(false);
  const compareSelectionRef = useRef([]);
  const [suggestedProperties, setSuggestedProperties] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  // The server page may pass the first list (see properties/page.js), so the
  // listings are in the HTML. It is used while the address stays the same.
  const hasInitialResults = Array.isArray(initialResults?.data);
  const initialQueryRef = useRef(hasInitialResults ? initialResults.query : null);
  const [properties, setProperties] = useState(() =>
    hasInitialResults ? initialResults.data : [],
  );
  const [loading, setLoading] = useState(!hasInitialResults);
  const [searchCompleted, setSearchCompleted] = useState(hasInitialResults);
  const [totalProperties, setTotalProperties] = useState(() =>
    hasInitialResults ? Number(initialResults.total || 0) : 0,
  );
  const [totalPagesFromApi, setTotalPagesFromApi] = useState(() =>
    hasInitialResults ? Math.max(1, Number(initialResults.totalPages || 1)) : 1,
  );
  const [error, setError] = useState("");
  const [cities, setCities] = useState([]);
  const [micromarkets, setMicromarkets] = useState([]);
  const [micromarketsLoading, setMicromarketsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMicromarkets, setShowMicromarkets] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("filters");
  const [isSubmittingEnquiry, setIsSubmittingEnquiry] = useState(false);
  const [enquiryError, setEnquiryError] = useState("");
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [aiPromptDraft, setAiPromptDraft] = useState("");
  const [appliedAiPrompt, setAppliedAiPrompt] = useState("");
  const [aiClarification, setAiClarification] = useState(null);
  const [aiConfirmedCity, setAiConfirmedCity] = useState("");
  const [aiConfirmedMicromarket, setAiConfirmedMicromarket] = useState("");
  const hasShortlistedProperties = wishlistIds.length > 0;
  const hasComparedProperties = compareSelection.length > 0;
  const showSelectionBar = hasShortlistedProperties || hasComparedProperties;
  // Floating "Looking for something exclusive?" card. Starts open on tablets
  // and larger screens, and as a small button on phones.
  // On phones the "exclusive properties" card starts minimised.
  const isPhone = useMediaQuery("(max-width: 639px)");
  const [exclusiveCardChoice, setExclusiveCardOpen] = useState(null);
  const exclusiveCardOpen = exclusiveCardChoice ?? !isPhone;
  // Cards shown (faded) while the AI search asks which micro-market is meant.
  const aiResultsRef = useRef(new Map());
  const shownPropertiesRef = useRef(
    hasInitialResults ? initialResults.data : [],
  );
  const canCompare = compareSelection.length >= MIN_COMPARE_PROPERTIES &&
    compareSelection.length <= MAX_COMPARE_PROPERTIES;
  const remainingToCompare = Math.max(0, MIN_COMPARE_PROPERTIES - compareSelection.length,);
  const [enquiryForm, setEnquiryForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  useEffect(() => {
    if (!showFilters) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showFilters]);
  const ITEMS_PER_PAGE = 30;
  const currentPage = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const filters = useMemo(() => {
    const rawType = searchParams.get("type") || "";
    const prompt = searchParams.get("prompt") || "";
    const mode = searchParams.get("mode") || "";
    const isAi = mode === "ai" && Boolean(prompt.trim());
    return {
      city: searchParams.get("city") || "",
      micromarket: searchParams.get("micromarket") || "",
      type: rawType === "ai" ? "" : getOfficeTypeFromUrl(rawType),
      minBudget: searchParams.get("minBudget") || "",
      maxBudget: searchParams.get("maxBudget") || "",
      area: searchParams.get("area") || "",
      maxArea: searchParams.get("maxArea") || "",
      seats: searchParams.get("seats") || "",
      maxSeats: searchParams.get("maxSeats") || "",
      sort: searchParams.get("sort") || "",
      currency: searchParams.get("currency") || currency,
      areaUnit: searchParams.get("areaUnit") || unit,
      prompt,
      isAi,
    };
  }, [searchParams, currency, unit]);

  // The AI prompt boxes follow the prompt in the address.
  const urlPrompt = searchParams.get("prompt") || "";
  const [promptFromUrl, setPromptFromUrl] = useState("");
  if (promptFromUrl !== urlPrompt) {
    setPromptFromUrl(urlPrompt);
    setAiPromptDraft(urlPrompt);
    setAppliedAiPrompt(urlPrompt);
  }

  const handleApplyAiSearch = () => {
    const prompt = aiPromptDraft.trim();
    if (!prompt) {
      setError("Please describe the office space you are looking for.");
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    [
      "city",
      "micromarket",
      "type",
      "minBudget",
      "maxBudget",
      "area",
      "maxArea",
      "seats",
      "maxSeats",
      "page",
      "aiResolved",
    ].forEach((key) => params.delete(key));

    params.set("mode", "ai");
    params.set("prompt", prompt);

    setAiConfirmedCity("");
    setAiConfirmedMicromarket("");
    setAiClarification(null);
    setError("");
    setAppliedAiPrompt(prompt);

    try {
      const searchedCity = searchParams.get("city") || resolvedCity || "";

      if (searchedCity) {
        localStorage.setItem(
          "anarock_last_searched_city",
          JSON.stringify(searchedCity),
        );
      }
    } catch (error) {
      console.warn("Unable to save last searched city:", error);
    }
    router.push(`/properties?${params.toString()}`, { scroll: false });
  };

  const handleConfirmAiCity = (city, micromarket = "") => {
    const selectedCity = String(city || "").trim();
    if (!selectedCity) return;
    setAiConfirmedCity(selectedCity);
    setAiConfirmedMicromarket(String(micromarket || "").trim());
    setAiClarification(null);
    setError("");
    setProperties([]);
    setSuggestedProperties([]);
  };

  const openEnquiryForm = () => {
    const shortlistedIds = new Set(wishlistIds.map(String));
    const availableProperties = [
      ...properties,
      ...suggestedProperties,
      ...compareSelection,
    ];

    const uniqueProperties = new Map();

    availableProperties.forEach((property) => {
      const id = getPropertyId(property);

      if (id && shortlistedIds.has(String(id))) {
        uniqueProperties.set(String(id), property);
      }
    });

    const selectionToUse = Array.from(uniqueProperties.values());

    if (!selectionToUse.length) {
      setEnquiryError(
        "Please shortlist at least one property to raise an enquiry.",
      );
      return;
    }

    setEnquirySelection(selectionToUse);
    setEnquiryError("");
    setEnquirySuccess(false);
    enquiryGuard.restart();
    setIsEnquiryOpen(true);
  };

  const closeEnquiryForm = () => {
    if (isSubmittingEnquiry) return;
    setIsEnquiryOpen(false);
    setEnquiryError("");
    setEnquirySuccess(false);
  };

  const handleRemoveFromEnquiry = (propertyId) => {
    setEnquirySelection((prev) => {
      const updated = prev.filter((p) => getPropertyId(p) !== propertyId);
      if (updated.length === 0) {
        closeEnquiryForm();
      }
      return updated;
    });
  };

  const handleEnquiryChange = (e) => {
    const { name, value } = e.target;
    setEnquiryForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();

    const shortlistedIds = new Set(wishlistIds.map(String));

    const shortlistedEnquirySelection = enquirySelection.filter((property) =>
      shortlistedIds.has(String(getPropertyId(property))),
    );

    if (!shortlistedEnquirySelection.length) {
      setEnquiryError(
        "Please shortlist at least one property before submitting your enquiry.",
      );
      return;
    }
    if (!enquiryGuard.ready) {
      setEnquiryError(SECURITY_CHECK_MESSAGE);
      return;
    }
    setIsSubmittingEnquiry(true);
    setEnquiryError("");

    try {
      const resolvedSelection = shortlistedEnquirySelection;

      // The website property IDs are sent; the server finds the CRM record
      // of each property, so CRM IDs never reach the browser.
      const selectedProperties = resolvedSelection
        .map((prop) => String(getPropertyId(prop) || "").trim())
        .filter(Boolean)
        .map((id) => ({ id }));

      const requirementCity =
        getLastSearchedCityFromStorage() ||
        resolvedSelection.map(getEnquiryPropertyCity).find(Boolean) ||
        filters.city ||
        "";

      const requirementType =
        getRequirementTypeFromStorage() ||
        resolvedSelection.map(getEnquiryPropertyType).find(Boolean) ||
        filters.type ||
        "";

      const savedLocation = getStoredUserLocation() || {};

      const trimmedFullName = enquiryForm.fullName.trim();
      const spaceIndex = trimmedFullName.indexOf(" ");
      let firstName = trimmedFullName;
      let lastName = "";

      if (spaceIndex !== -1) {
        firstName = trimmedFullName.substring(0, spaceIndex);
        lastName = trimmedFullName.substring(spaceIndex + 1).trim();
      }

      const payload = {
        firstName,
        lastName,
        email: enquiryForm.email.trim(),
        phone: enquiryForm.phone.trim(),
        company: enquiryForm.company.trim(),
        message: enquiryForm.message.trim(),
        source: "Properties",
        selectedProperties,
        requirementCity,
        requirementType,
        ...enquiryGuard.values(),
        location: {
          street: savedLocation.street || "",
          city: savedLocation.city || "",
          state: savedLocation.state || "",
          country: savedLocation.country || "",
          postalCode: savedLocation.postalCode || "",
          latitude: savedLocation.latitude ?? null,
          longitude: savedLocation.longitude ?? null,
        },
      };

      const response = await fetch("/api/lead3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success !== true) {
        throw new Error(
          data?.message ||
          data?.error ||
          `CRM did not confirm lead creation. HTTP ${response.status}.`,
        );
      }

      setEnquirySuccess(true);
      setEnquiryForm({
        fullName: "",
        email: "",
        phone: "",
        company: "",
        message: "",
      });
    } catch (err) {
      console.error("[ENQUIRY] Lead creation failed:", err);
      setEnquiryError(
        err?.message || "Unable to submit your enquiry. Please try again.",
      );
    } finally {
      enquiryGuard.afterSubmit();
      setIsSubmittingEnquiry(false);
    }
  };

  const handleExclusiveLeadChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "phone") {
      value = value.replace(/\D/g, "").slice(0, exclusiveCountry.max);
    }

    setExclusiveLeadForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setExclusiveFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const filteredExclusiveCountries = useMemo(() => {
    const query = exclusiveCountrySearch.trim().toLowerCase();
    if (!query) return EXCLUSIVE_PHONE_COUNTRIES;
    return EXCLUSIVE_PHONE_COUNTRIES.filter((country) =>
      `${country.name} ${country.code} ${country.dial}`
        .toLowerCase()
        .includes(query),
    );
  }, [exclusiveCountrySearch]);

  // Close the country list on an outside click or the Escape key.
  useEffect(() => {
    if (!exclusiveCountryOpen) return undefined;
    const handlePointer = (event) => {
      if (!exclusiveCountryRef.current?.contains(event.target)) {
        setExclusiveCountryOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setExclusiveCountryOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey, true);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey, true);
    };
  }, [exclusiveCountryOpen]);

  const closeExclusiveLeadForm = () => {
    if (isSubmittingExclusiveLead) return;

    setIsExclusiveLeadOpen(false);
    setExclusiveLeadError("");
    setExclusiveLeadSuccess(false);
    setExclusiveFieldErrors({});
    setExclusiveCountryOpen(false);
  };

  const handleExclusiveLeadSubmit = async (e) => {
    e.preventDefault();

    if (isSubmittingExclusiveLead) return;

    const name = exclusiveLeadForm.name.trim();
    const phoneDigits = exclusiveLeadForm.phone.replace(/\D/g, "");
    const email = exclusiveLeadForm.email.trim();
    const company = exclusiveLeadForm.company.trim();

    const fieldErrors = {};
    if (!name) {
      fieldErrors.name = "Please enter your name.";
    }
    if (!phoneDigits) {
      fieldErrors.phone = "Please enter your phone number.";
    } else if (exclusiveCountry.code === "IN") {
      if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
        fieldErrors.phone = "Enter a valid 10-digit mobile number.";
      }
    } else if (
      phoneDigits.length < exclusiveCountry.min ||
      phoneDigits.length > exclusiveCountry.max
    ) {
      fieldErrors.phone = `Enter a valid ${exclusiveCountry.name} phone number.`;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      fieldErrors.email = "Enter a valid email address.";
    }

    setExclusiveFieldErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setExclusiveLeadError("");
      return;
    }

    const phone = `${exclusiveCountry.dial}${phoneDigits}`;

    if (!exclusiveGuard.ready) {
      setExclusiveLeadError(SECURITY_CHECK_MESSAGE);
      return;
    }

    setIsSubmittingExclusiveLead(true);
    setExclusiveLeadError("");

    try {
      const savedLocation = getStoredUserLocation() || {};

      const payload = {
        name,
        phone,
        email,
        company,
        source: "Exclusive Properties Enquiry",
        ...exclusiveGuard.values(),
        requirementCity:
          getLastSearchedCityFromStorage() ||
          resolvedCity ||
          filters.city ||
          "",
        requirementType: filters.type || "",
        location: {
          street: savedLocation.street || "",
          city: savedLocation.city || "",
          state: savedLocation.state || "",
          country: savedLocation.country || "",
          postalCode: savedLocation.postalCode || "",
        },
      };

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.success !== true) {
        throw new Error(
          data?.message ||
          data?.error ||
          `Unable to submit your request. HTTP ${response.status}.`,
        );
      }

      setExclusiveLeadSuccess(true);
      setExclusiveLeadForm({
        name: "",
        phone: "",
        email: "",
        company: "",
      });
    } catch (err) {
      console.error("[EXCLUSIVE PROPERTIES] Lead submission failed:", err);

      setExclusiveLeadError(
        err?.message || "Unable to submit your request. Please try again.",
      );
    } finally {
      exclusiveGuard.afterSubmit();
      setIsSubmittingExclusiveLead(false);
    }
  };

  const normalizedOfficeType = normalizeValue(filters.type);
  const sortValue = filters.sort || "";
  const isCoworking = normalizedOfficeType === "managed office/co-working";

  const handleShortlistToggle = useCallback(
    (property) => {
      const id = getPropertyId(property);
      if (id) toggleWishlist(property);
    },
    [toggleWishlist],
  );

  useEffect(() => {
    compareSelectionRef.current = compareSelection;
  }, [compareSelection]);

  useEffect(() => {
    if (!compareLimitNotice) return undefined;
    const timer = setTimeout(() => setCompareLimitNotice(false), 4000);
    return () => clearTimeout(timer);
  }, [compareLimitNotice]);

  const handleCompareToggle = useCallback((property) => {
    const id = getPropertyId(property);
    if (!id) return;

    const current = compareSelectionRef.current;
    const isSelected = current.some((item) => getPropertyId(item) === id);
    if (!isSelected && current.length >= MAX_COMPARE_PROPERTIES) {
      setCompareLimitNotice(true);
      return;
    }
    setCompareLimitNotice(false);

    setCompareSelection((prev) => {
      const alreadySelected = prev.some((item) => getPropertyId(item) === id);
      let updated;
      if (alreadySelected) {
        updated = prev.filter((item) => getPropertyId(item) !== id);
      } else {
        if (prev.length >= MAX_COMPARE_PROPERTIES) return prev;
        updated = [...prev, property];
      }
      return updated;
    });
  }, [setCompareSelection]);

  const clearCompareSelection = () => {
    setCompareSelection([]);
  };

  const openComparePage = () => {
    if (
      compareSelection.length < MIN_COMPARE_PROPERTIES ||
      compareSelection.length > MAX_COMPARE_PROPERTIES
    ) {
      return;
    }
    router.push("/compare");
  };

  useEffect(() => {
    fetch("/api/cities")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCities(data.cities);
      })
      .catch(() => setCities([]));
  }, []);


  const filterCity = filters.city;
  const resolvedCity = filterCity
    ? cities.find((c) => toUrlValue(c) === filterCity.toLowerCase()) ||
      filterCity
    : "";

  // A new city clears the old micro-market list and loads the new one.
  const [micromarketsCity, setMicromarketsCity] = useState(resolvedCity);
  if (micromarketsCity !== resolvedCity) {
    setMicromarketsCity(resolvedCity);
    if (!resolvedCity) {
      setMicromarkets([]);
      setShowMicromarkets(false);
    } else {
      setMicromarketsLoading(true);
    }
  }

  useEffect(() => {
    if (!resolvedCity) return undefined;
    const controller = new AbortController();
    fetch(`/api/micromarkets?city=${encodeURIComponent(resolvedCity)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.micromarkets)) {
          setMicromarkets(data.micromarkets);
        } else {
          setMicromarkets([]);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") setMicromarkets([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setMicromarketsLoading(false);
      });

    return () => controller.abort();
  }, [resolvedCity]);

  const selectedMicromarkets = useMemo(() => {
    if (!filters.micromarket || micromarkets.length === 0) return [];
    const selectedNames = filters.micromarket
      .split(",")
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean);

    return micromarkets
      .filter((market) => {
        const marketSlug = toUrlValue(market.name);
        return selectedNames.some(
          (selected) =>
            selected === String(market.name).trim().toLowerCase() ||
            selected === marketSlug,
        );
      })
      .map((market) => String(market.id));
  }, [filters.micromarket, micromarkets]);

  const selectedMicromarketNames = useMemo(() => {
    if (selectedMicromarkets.length === 0) return [];
    return selectedMicromarkets
      .map(
        (id) =>
          micromarkets.find((item) => String(item.id) === String(id))?.name ||
          "",
      )
      .filter(Boolean);
  }, [selectedMicromarkets, micromarkets]);

  useEffect(() => {
    // Keep the server-rendered list while the address is unchanged.
    if (initialQueryRef.current !== null) {
      if (searchParams.toString() === initialQueryRef.current) {
        return undefined;
      }
      initialQueryRef.current = null;
    }

    const controller = new AbortController();

    async function fetchPropertiesWithRetry(retries = 1) {
      setLoading(true);
      setSearchCompleted(false);
      setSuggestedProperties([]);
      setSuggestionsLoading(false);
      setError("");

      try {
        const params = new URLSearchParams();

        params.set("page", String(currentPage));
        params.set("pageSize", String(ITEMS_PER_PAGE));

        if (resolvedCity) {
          params.set("city", resolvedCity);
        }

        if (filters.type && filters.type !== "ai") {
          params.set("type", filters.type);
        }

        const addConvertedBudget = (key, value) => {
          if (value === "" || value == null) return;

          const amount = Number(value);
          if (!Number.isFinite(amount)) return;

          // Rent is typed per the selected area unit; the API expects per sq ft.
          const perSqft = isCoworking
            ? amount
            : convertRentPerArea(amount, filters.areaUnit, "sqft");

          const converted = convertCurrency(
            perSqft,
            filters.currency,
            "INR",
            exchangeRates,
          );

          params.set(key, String(Math.round(converted)));
        };

        const addConvertedArea = (key, value) => {
          if (value === "" || value == null) return;

          const amount = Number(value);
          if (!Number.isFinite(amount)) return;

          const converted = convertArea(amount, filters.areaUnit, "sqft");

          params.set(key, String(Math.round(converted)));
        };

        addConvertedBudget("minBudget", filters.minBudget);
        addConvertedBudget("maxBudget", filters.maxBudget);

        if (!isCoworking) {
          addConvertedArea("area", filters.area);
          addConvertedArea("maxArea", filters.maxArea);
        }

        if (isCoworking) {
          if (filters.seats !== "") {
            const seats = Number(filters.seats);

            if (Number.isFinite(seats)) {
              params.set("seats", String(Math.round(seats)));
            }
          }

          if (filters.maxSeats !== "") {
            const seats = Number(filters.maxSeats);

            if (Number.isFinite(seats)) {
              params.set("maxSeats", String(Math.round(seats)));
            }
          }
        }

        if (selectedMicromarketNames.length) {
          params.set("micromarket", selectedMicromarketNames.join(","));
        }

        if (sortValue) {
          params.set("sort", sortValue);
        } else if (filters.maxBudget !== "") {
          // With a max price, show the most expensive matches first
          // (closest to the max), unless the visitor picked a sort.
          params.set("sort", "budget_desc");
        }

        const prompt = appliedAiPrompt.trim();
        const shouldUseAi = Boolean(filters.isAi && prompt);

        if (shouldUseAi) {
          params.set("mode", "ai");
          params.set("prompt", prompt);
        }

        // One AI search is one request: the answer is kept for the address
        // the page moves to next and reused when the page re-renders.
        const aiKeyFor = (query) =>
          `${query}|${aiConfirmedCity}|${aiConfirmedMicromarket}`;
        const cachedAi = shouldUseAi
          ? aiResultsRef.current.get(aiKeyFor(searchParams.toString()))
          : null;

        const response = cachedAi
          ? null
          : shouldUseAi
          ? await fetch("/api/ai-search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              ...Object.fromEntries(params.entries()),
              mode: "ai",
              prompt,
              ...(searchParams.has("aiResolved") ? { aiResolved: "1" } : {}),
              ...(aiConfirmedCity ? { confirmedCity: aiConfirmedCity } : {}),
              ...(aiConfirmedMicromarket
                ? { confirmedMicromarket: aiConfirmedMicromarket }
                : {}),
            }),
            cache: "no-store",
            signal: controller.signal,
          })
          : await fetch(`/api/properties?${params.toString()}`, {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: controller.signal,
          });

        const data = cachedAi || (await response.json().catch(() => ({})));

        if (controller.signal.aborted) return;

        if (shouldUseAi && data.needsClarification && data.clarification) {
          setAiClarification(data.clarification);
          setTotalProperties(0);
          setTotalPagesFromApi(1);
          setSuggestedProperties([]);
          setError("");

          // Keep the cards that were on screen before the search; they are
          // shown faded under the question. If there were none (the page was
          // opened straight from an AI search link), load the normal list.
          if (shownPropertiesRef.current.length > 0) {
            setProperties(shownPropertiesRef.current);
          } else {
            try {
              const fallbackResponse = await fetch(
                `/api/properties?page=1&pageSize=${ITEMS_PER_PAGE}`,
                { signal: controller.signal },
              );
              const fallbackData = await fallbackResponse.json().catch(() => ({}));
              if (controller.signal.aborted) return;
              setProperties(
                Array.isArray(fallbackData?.data) ? fallbackData.data : [],
              );
            } catch {
              if (controller.signal.aborted) return;
              setProperties([]);
            }
          }

          setLoading(false);
          return;
        }

        if ((response && !response.ok) || !data.success) {
          throw new Error(data.error || "Failed to fetch properties");
        }

        if (
          shouldUseAi &&
          data.interpretedQuery &&
          !searchParams.has("aiResolved")
        ) {
          const interpreted = data.interpretedQuery;
          const nextParams = new URLSearchParams(searchParams.toString());

          nextParams.set("mode", "ai");
          nextParams.set("prompt", prompt);

          const setIfMissing = (key, value) => {
            const current = nextParams.get(key);

            if (current && current.trim()) return;

            if (
              value !== null &&
              value !== undefined &&
              String(value).trim() !== ""
            ) {
              nextParams.set(key, String(value).trim());
            }
          };

          if (interpreted.city) {
            setIfMissing("city", toUrlValue(interpreted.city));
          }

          setIfMissing("micromarket", interpreted.micromarket);

          setIfMissing(
            "type",
            interpreted.type ? toUrlValue(interpreted.type) : "",
          );

          setIfMissing("area", interpreted.minArea);
          setIfMissing("maxArea", interpreted.maxArea);
          setIfMissing("seats", interpreted.minSeats);
          setIfMissing("maxSeats", interpreted.maxSeats);
          setIfMissing("minBudget", interpreted.minPrice);
          setIfMissing("maxBudget", interpreted.maxPrice);

          nextParams.set("aiResolved", "1");
          nextParams.delete("page");

          if (currentPage === 1) {
            if (aiResultsRef.current.size > 20) aiResultsRef.current.clear();
            aiResultsRef.current.set(aiKeyFor(nextParams.toString()), data);
          }

          setLoading(false);

          if (nextParams.toString() !== searchParams.toString()) {
            router.replace(`/properties?${nextParams.toString()}`, {
              scroll: false,
            });
            return;
          }
        }

        setAiClarification(null);

        if (shouldUseAi && !cachedAi) {
          if (aiResultsRef.current.size > 20) aiResultsRef.current.clear();
          aiResultsRef.current.set(aiKeyFor(searchParams.toString()), data);
        }

        const nextProperties = Array.isArray(data.data) ? data.data : [];
        setProperties(nextProperties);
        if (nextProperties.length > 0) {
          shownPropertiesRef.current = nextProperties;
        }

        setTotalProperties(Number(data.total || 0));

        setTotalPagesFromApi(Math.max(1, Number(data.totalPages || 1)));

        setSearchCompleted(true);
        setLoading(false);
      } catch (err) {
        if (err?.name === "AbortError") return;

        if (retries > 0) {
          setTimeout(() => {
            if (!controller.signal.aborted) {
              fetchPropertiesWithRetry(retries - 1);
            }
          }, 1000);

          return;
        }

        console.error("[PropertiesClient] Fetch failed:", err);

        setError(err?.message || "Failed to fetch properties");

        setProperties([]);
        setTotalProperties(0);
        setTotalPagesFromApi(1);
        setLoading(false);
      }
    }

    fetchPropertiesWithRetry(1);

    return () => controller.abort();
  }, [
    currentPage,
    resolvedCity,
    selectedMicromarketNames,
    filters.type,
    filters.minBudget,
    filters.maxBudget,
    filters.area,
    filters.maxArea,
    filters.seats,
    filters.maxSeats,
    filters.currency,
    filters.areaUnit,
    filters.prompt,
    filters.isAi,
    filters.sort,
    sortValue,
    appliedAiPrompt,
    exchangeRates,
    isCoworking,
    router,
    searchParams,
    aiConfirmedCity,
    aiConfirmedMicromarket,
  ]);

  // useEffect(() => {
  //   const isLastResultsPage = currentPage >= Math.max(1, totalPagesFromApi);

  //   const hasPrimaryResults = totalProperties > 0;

  //   if (
  //     loading ||
  //     !searchCompleted ||
  //     aiClarification ||
  //     (hasPrimaryResults && !isLastResultsPage)
  //   ) {
  //     setSuggestedProperties([]);
  //     setSuggestionsLoading(false);
  //     return;
  //   }

  //   const controller = new AbortController();

  //   async function fetchSuggestions() {
  //     setSuggestionsLoading(true);

  //     try {
  //       const params = new URLSearchParams();

  //       if (resolvedCity) {
  //         params.set("city", resolvedCity);
  //       }

  //       if (filters.type && filters.type !== "ai") {
  //         params.set("type", filters.type);
  //       }

  //       if (selectedMicromarketNames.length) {
  //         params.set("micromarket", selectedMicromarketNames.join(","));
  //       }

  //       const addConvertedBudget = (key, value) => {
  //         if (value === "" || value == null) return;

  //         const amount = Number(value);
  //         if (!Number.isFinite(amount)) return;

  //         const converted = convertCurrency(
  //           amount,
  //           filters.currency,
  //           "INR",
  //           exchangeRates,
  //         );

  //         params.set(key, String(Math.round(converted)));
  //       };

  //       const addConvertedArea = (key, value) => {
  //         if (value === "" || value == null) return;

  //         const amount = Number(value);
  //         if (!Number.isFinite(amount)) return;

  //         const converted = convertArea(amount, filters.areaUnit, "sqft");

  //         params.set(key, String(Math.round(converted)));
  //       };

  //       addConvertedBudget("minBudget", filters.minBudget);
  //       addConvertedBudget("maxBudget", filters.maxBudget);

  //       if (!isCoworking) {
  //         addConvertedArea("area", filters.area);
  //         addConvertedArea("maxArea", filters.maxArea);
  //       }

  //       if (isCoworking) {
  //         if (filters.seats !== "") {
  //           const seats = Number(filters.seats);

  //           if (Number.isFinite(seats)) {
  //             params.set("seats", String(Math.round(seats)));
  //           }
  //         }

  //         if (filters.maxSeats !== "") {
  //           const seats = Number(filters.maxSeats);

  //           if (Number.isFinite(seats)) {
  //             params.set("maxSeats", String(Math.round(seats)));
  //           }
  //         }
  //       }
  //       const excludeIds = properties
  //         .map((property) => getPropertyId(property))
  //         .filter(Boolean);

  //       if (excludeIds.length) {
  //         params.set("exclude", excludeIds.join(","));
  //       }

  //       const response = await fetch(
  //         `/api/properties/suggestions?${params.toString()}`,
  //         {
  //           method: "GET",
  //           headers: { Accept: "application/json" },
  //           cache: "no-store",
  //           signal: controller.signal,
  //         },
  //       );

  //       const responseText = await response.text();

  //       let data = {};

  //       try {
  //         data = responseText ? JSON.parse(responseText) : {};
  //       } catch {
  //         data = {};
  //       }

  //       if (!response.ok || data.success !== true) {
  //         const details =
  //           data.error ||
  //           data.details ||
  //           (responseText
  //             ? responseText.slice(0, 500)
  //             : "The API returned an empty response.");

  //         throw new Error(
  //           `Suggestions API failed (HTTP ${response.status}): ${details}`,
  //         );
  //       }

  //       if (controller.signal.aborted) return;

  //       const primaryIds = new Set(
  //         properties.map((property) => getPropertyId(property)).filter(Boolean),
  //       );

  //       const uniqueSuggestions = [];
  //       const seenIds = new Set(primaryIds);

  //       for (const property of Array.isArray(data.data) ? data.data : []) {
  //         const id = getPropertyId(property);

  //         if (!id || seenIds.has(id)) continue;

  //         seenIds.add(id);
  //         uniqueSuggestions.push(property);
  //       }

  //       setSuggestedProperties(uniqueSuggestions);
  //     } catch (err) {
  //       if (err?.name !== "AbortError") {
  //         console.error("[PropertiesClient] Suggestions failed:", err);
  //         setSuggestedProperties([]);
  //       }
  //     } finally {
  //       if (!controller.signal.aborted) {
  //         setSuggestionsLoading(false);
  //       }
  //     }
  //   }

  //   fetchSuggestions();

  //   return () => controller.abort();
  // }, [
  //   loading,
  //   aiClarification,
  //   properties,
  //   resolvedCity,
  //   filters.type,
  //   filters.minBudget,
  //   filters.maxBudget,
  //   filters.area,
  //   filters.maxArea,
  //   filters.seats,
  //   filters.maxSeats,
  //   filters.currency,
  //   filters.areaUnit,
  //   selectedMicromarketNames,
  //   exchangeRates,
  //   isCoworking,
  //   searchCompleted,
  // ]);

  const loadMoreSuggestions = useCallback(async () => {
    if (
      suggestionsRequestRef.current ||
      suggestionsLoading ||
      !suggestionsHasMore
    ) {
      return;
    }

    suggestionsRequestRef.current = true;
    setSuggestionsLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(suggestionsPage + 1),
        pageSize: String(ITEMS_PER_PAGE),
      });

      if (resolvedCity) params.set("city", resolvedCity);

      if (filters.type && filters.type !== "ai") {
        params.set("type", filters.type);
      }

      if (selectedMicromarketNames.length) {
        params.set(
          "micromarket",
          selectedMicromarketNames.join(",")
        );
      }

      const toINR = (value) => {
        const amount = Number(value);
        // Rent is typed per the selected area unit; the API expects per sq ft.
        const perSqft = isCoworking
          ? amount
          : convertRentPerArea(amount, filters.areaUnit, "sqft");

        return Number.isFinite(amount)
          ? String(
            Math.round(
              convertCurrency(
                perSqft,
                filters.currency,
                "INR",
                exchangeRates
              )
            )
          )
          : "";
      };

      if (filters.minBudget !== "") {
        params.set("minBudget", toINR(filters.minBudget));
      }

      if (filters.maxBudget !== "") {
        params.set("maxBudget", toINR(filters.maxBudget));
      }

      if (!isCoworking) {
        if (filters.area !== "") {
          params.set(
            "area",
            String(
              Math.round(
                convertArea(
                  Number(filters.area),
                  filters.areaUnit,
                  "sqft"
                )
              )
            )
          );
        }

        if (filters.maxArea !== "") {
          params.set(
            "maxArea",
            String(
              Math.round(
                convertArea(
                  Number(filters.maxArea),
                  filters.areaUnit,
                  "sqft"
                )
              )
            )
          );
        }
      } else {
        if (filters.seats !== "") {
          params.set("seats", filters.seats);
        }

        if (filters.maxSeats !== "") {
          params.set("maxSeats", filters.maxSeats);
        }
      }

      const exclude = [
        ...properties,
        ...suggestedProperties,
      ]
        .map(getPropertyId)
        .filter(Boolean);

      if (exclude.length) {
        params.set("exclude", exclude.join(","));
      }

      const response = await fetch(
        `/api/properties/suggestions?${params.toString()}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to load more properties"
        );
      }

      const existing = new Set(exclude);

      const next = (data.data || []).filter((property) => {
        const id = getPropertyId(property);

        if (!id || existing.has(id)) return false;

        existing.add(id);
        return true;
      });

      setSuggestedProperties((previous) => [
        ...previous,
        ...next,
      ]);

      setSuggestionsPage(
        Number(data.page || suggestionsPage + 1)
      );

      setSuggestionsHasMore(Boolean(data.hasMore));
    } catch (error) {
      console.error(
        "[PropertiesClient] Load more suggestions failed:",
        error
      );
    } finally {
      suggestionsRequestRef.current = false;
      setSuggestionsLoading(false);
    }
  }, [
    suggestionsLoading,
    suggestionsHasMore,
    suggestionsPage,
    properties,
    suggestedProperties,
    resolvedCity,
    filters,
    selectedMicromarketNames,
    exchangeRates,
    isCoworking,
  ]);

  // Suggestions are shown under the last page of results (or when there are
  // none). Whenever they are not wanted, the old ones are cleared.
  const suggestionsWanted = !(
    loading ||
    !searchCompleted ||
    aiClarification ||
    (totalProperties > 0 && currentPage < Math.max(1, totalPagesFromApi))
  );
  const [suggestionsWereWanted, setSuggestionsWereWanted] =
    useState(suggestionsWanted);
  if (suggestionsWereWanted !== suggestionsWanted) {
    setSuggestionsWereWanted(suggestionsWanted);
    if (!suggestionsWanted) {
      setSuggestedProperties([]);
      setSuggestionsPage(1);
      setSuggestionsHasMore(false);
      setSuggestionsLoading(false);
    }
  }

  useEffect(() => {
    if (!suggestionsWanted) return undefined;

    const controller = new AbortController();
    let active = true;

    async function fetchSuggestions() {
      setSuggestionsLoading(true);
      setSuggestedProperties([]);
      setSuggestionsPage(1);

      try {
        const params = new URLSearchParams();

        params.set("page", "1");
        params.set("pageSize", String(ITEMS_PER_PAGE));

        if (resolvedCity) params.set("city", resolvedCity);

        if (filters.type && filters.type !== "ai") {
          params.set("type", filters.type);
        }

        if (selectedMicromarketNames.length) {
          params.set(
            "micromarket",
            selectedMicromarketNames.join(",")
          );
        }

        const addConverted = (key, value, converter) => {
          if (value === "" || value == null) return;

          const amount = Number(value);

          if (Number.isFinite(amount)) {
            params.set(
              key,
              String(
                Math.round(
                  converter ? converter(amount) : amount
                )
              )
            );
          }
        };

        // Rent is typed per the selected area unit; the API expects per sq ft.
        const budgetToINR = (v) =>
          convertCurrency(
            isCoworking ? v : convertRentPerArea(v, filters.areaUnit, "sqft"),
            filters.currency,
            "INR",
            exchangeRates
          );

        addConverted("minBudget", filters.minBudget, budgetToINR);

        addConverted("maxBudget", filters.maxBudget, budgetToINR);

        if (!isCoworking) {
          addConverted("area", filters.area, (v) =>
            convertArea(v, filters.areaUnit, "sqft")
          );

          addConverted("maxArea", filters.maxArea, (v) =>
            convertArea(v, filters.areaUnit, "sqft")
          );
        } else {
          addConverted("seats", filters.seats);
          addConverted("maxSeats", filters.maxSeats);
        }

        const excludeIds = properties
          .map(getPropertyId)
          .filter(Boolean);

        if (excludeIds.length) {
          params.set("exclude", excludeIds.join(","));
        }

        const response = await fetch(
          `/api/properties/suggestions?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.success !== true) {
          throw new Error(
            data.error ||
            `Suggestions API failed (${response.status})`
          );
        }

        if (!active) return;

        const seen = new Set(excludeIds);

        const unique = (Array.isArray(data.data) ? data.data : [])
          .filter((property) => {
            const id = getPropertyId(property);

            if (!id || seen.has(id)) return false;

            seen.add(id);
            return true;
          });

        setSuggestedProperties(unique);
        setSuggestionsPage(Number(data.page || 1));
        setSuggestionsHasMore(Boolean(data.hasMore));
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error(
            "[PropertiesClient] Suggestions failed:",
            error
          );
        }
      } finally {
        if (active) setSuggestionsLoading(false);
      }
    }

    fetchSuggestions();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    suggestionsWanted,
    loading,
    searchCompleted,
    aiClarification,
    currentPage,
    totalPagesFromApi,
    totalProperties,
    properties,
    resolvedCity,
    filters.type,
    filters.minBudget,
    filters.maxBudget,
    filters.area,
    filters.maxArea,
    filters.seats,
    filters.maxSeats,
    filters.currency,
    filters.areaUnit,
    selectedMicromarketNames,
    exchangeRates,
    isCoworking,
  ]);

  useEffect(() => {
    const node = suggestionsSentinelRef.current;

    if (!node || !suggestionsHasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreSuggestions();
        }
      },
      {
        rootMargin: "700px 0px",
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [loadMoreSuggestions, suggestionsHasMore]);

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());

    if (key === "type") {
      if (!value) {
        params.delete("type");
        params.delete("area");
        params.delete("maxArea");
        params.delete("seats");
        params.delete("maxSeats");
      } else {
        params.set("type", toUrlValue(value));

        const nextIsCoworking =
          normalizeValue(value) === "managed office/co-working";

        if (nextIsCoworking) {
          params.delete("area");
          params.delete("maxArea");
        } else {
          params.delete("seats");
          params.delete("maxSeats");
        }
      }

      params.delete("page");

      router.push(
        `/properties${params.toString() ? `?${params.toString()}` : ""}`,
        { scroll: false },
      );

      return;
    }

    if (value !== "" && value !== null && value !== undefined) {
      params.set(key, String(value));
    } else {
      params.delete(key);
    }

    if (key === "area" && isCoworking) {
      params.delete("area");
    }

    if (key === "maxArea" && isCoworking) {
      params.delete("maxArea");
    }

    if (key === "seats" && !isCoworking) {
      params.delete("seats");
    }

    if (key === "maxSeats" && !isCoworking) {
      params.delete("maxSeats");
    }

    params.delete("page");

    router.push(
      `/properties${params.toString() ? `?${params.toString()}` : ""}`,
      { scroll: false },
    );
  };

  const handleSortChange = (value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("sort", value);
    else params.delete("sort");

    params.delete("page");
    router.push(
      `/properties${params.toString() ? `?${params.toString()}` : ""}`,
    );
    setShowFilters(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCategoryClick = (category) => {
    if (category.id === "recommended") {
      handleSortChange("");
      return;
    }
    const isActive = sortValue.startsWith(category.id);
    let nextVal = category.ascVal;
    if (isActive) {
      nextVal =
        sortValue === category.ascVal ? category.descVal : category.ascVal;
    }
    handleSortChange(nextVal);
  };

  const handleCityChange = (selectedCity) => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedCity) params.set("city", toUrlValue(selectedCity));
    else params.delete("city");

    params.delete("micromarket");
    params.delete("page");
    router.push(
      `/properties${params.toString() ? `?${params.toString()}` : ""}`,
    );
    setShowMicromarkets(false);
  };

  const toggleMicromarket = (micromarketId) => {
    const id = String(micromarketId);
    const nextSelected = selectedMicromarkets.includes(id)
      ? selectedMicromarkets.filter((selectedId) => selectedId !== id)
      : [...selectedMicromarkets, id];

    const selectedNames = nextSelected
      .map(
        (selectedId) =>
          micromarkets.find((item) => String(item.id) === String(selectedId))
            ?.name || "",
      )
      .filter(Boolean);

    const params = new URLSearchParams(searchParams.toString());
    if (selectedNames.length)
      params.set("micromarket", selectedNames.join(","));
    else params.delete("micromarket");

    router.push(
      `/properties${params.toString() ? `?${params.toString()}` : ""}`,
    );
  };

  const selectAllMicromarkets = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("micromarket");
    router.push(
      `/properties${params.toString() ? `?${params.toString()}` : ""}`,
    );
    setShowMicromarkets(false);
  };

  const clearFilter = (key) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete("page");
    router.push(
      `/properties${params.toString() ? `?${params.toString()}` : ""}`,
    );
  };

  const clearAll = () => {
    router.push("/properties");
    setShowMicromarkets(false);
    setShowFilters(false);
  };

  const renderCurrencyIcon = () => {
    switch (String(filters.currency || currency).toUpperCase()) {
      case "USD":
      case "SGD":
        return <DollarSign className="h-4 w-4 text-[#A054A0]" />;
      case "EUR":
        return <Euro className="h-4 w-4 text-[#A054A0]" />;
      case "AED":
        return <span className="text-xs font-bold text-[#A054A0]">د.إ</span>;
      default:
        return <IndianRupee className="h-4 w-4 text-[#A054A0]" />;
    }
  };

  const getCurrencySymbol = (value) => {
    switch (
    String(value || "")
      .trim()
      .toUpperCase()
    ) {
      case "USD":
        return "$";
      case "EUR":
        return "€";
      case "GBP":
        return "£";
      case "AED":
        return "د.إ";
      case "SGD":
        return "S$";
      case "AUD":
        return "A$";
      case "CAD":
        return "C$";
      case "INR":
      default:
        return "₹";
    }
  };

  const formatRawNumber = (value) => {
    if (value === "" || value === null || value === undefined) return "";
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    return number.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  const currencySymbol = getCurrencySymbol(filters.currency);
  const areaUnitLabel = filters.areaUnit === "sqm" ? "sq.m" : "sq.ft";

  const activeChips = [
    filters.city && {
      label: `City: ${resolvedCity || filters.city}`,
      key: "city",
    },
    filters.micromarket && {
      label: `Micromarkets: ${selectedMicromarketNames.length
        ? selectedMicromarketNames.join(", ")
        : filters.micromarket
        }`,
      key: "micromarket",
    },
    filters.type &&
    filters.type !== "ai" && {
      label: `Type: ${filters.type}`,
      key: "type",
    },
    filters.minBudget !== "" && {
      label: `Min ${isCoworking ? "Seat Price" : "Rent"}: ${currencySymbol}${formatRawNumber(
        filters.minBudget,
      )}${isCoworking ? "" : ` / ${areaUnitLabel}`}`,
      key: "minBudget",
    },
    filters.maxBudget !== "" && {
      label: `Max ${isCoworking ? "Seat Price" : "Rent"}: ${currencySymbol}${formatRawNumber(
        filters.maxBudget,
      )}${isCoworking ? "" : ` / ${areaUnitLabel}`}`,
      key: "maxBudget",
    },
    !isCoworking &&
    filters.area !== "" && {
      label: `Min Area: ${formatRawNumber(filters.area)} ${areaUnitLabel}`,
      key: "area",
    },
    !isCoworking &&
    filters.maxArea !== "" && {
      label: `Max Area: ${formatRawNumber(filters.maxArea)} ${areaUnitLabel}`,
      key: "maxArea",
    },
    isCoworking &&
    filters.seats !== "" && {
      label: `Seats: ${formatRawNumber(filters.seats)}`,
      key: "seats",
    },
    isCoworking &&
    filters.maxSeats !== "" && {
      label: `Max Seats: ${formatRawNumber(filters.maxSeats)}`,
      key: "maxSeats",
    },
    filters.prompt && {
      label: `AI: ${filters.prompt.slice(0, 30)}${filters.prompt.length > 30 ? "..." : ""
        }`,
      key: "prompt",
    },
  ].filter(Boolean);

  const totalPages = totalPagesFromApi;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const goToPage = (page) => {
    const nextPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    if (nextPage === safeCurrentPage) return;

    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));

    router.push(
      `/properties${params.toString() ? `?${params.toString()}` : ""}`,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getPaginationPages = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (safeCurrentPage > 4) pages.push("ellipsis-start");

    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (safeCurrentPage < totalPages - 3) pages.push("ellipsis-end");
    pages.push(totalPages);
    return pages;
  };

  const breadcrumbs = [
    { label: "Properties", href: "/properties" },
    ...(resolvedCity ? [{ label: resolvedCity }] : []),
  ];

  return (
    <div className="min-h-screen  selection:bg-[#A054A0]/20 selection:text-slate-900 pb-20">
      <style jsx global>{`
        @keyframes shimmerSweep {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .shimmer-effect {
          position: relative;
          overflow: hidden;
        }
        .shimmer-effect::after {
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0,
            rgba(255, 255, 255, 0.5) 20%,
            rgba(255, 255, 255, 0.8) 60%,
            rgba(255, 255, 255, 0)
          );
          animation: shimmerSweep 1.6s infinite ease-in-out;
          content: "";
        }
      `}</style>

      <Breadcrumbs items={breadcrumbs} />

      <div className="mx-auto max-w-[1600px] px-3 py-3 sm:px-3 lg:px-4">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                {filters.isAi ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 shrink-0 text-[#A054A0]" />
                    AI Recommended Properties
                  </span>
                ) : resolvedCity ? (
                  `Commercial Properties in ${resolvedCity}`
                ) : (
                  "All Commercial Properties"
                )}
              </h1>
              <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                {loading
                  ? "Searching properties..."
                  : aiClarification
                    ? "Choose a micro-market to see matching properties"
                    : `${totalProperties.toLocaleString("en-IN")} properties found${totalProperties > ITEMS_PER_PAGE
                    ? ` • Page ${safeCurrentPage} of ${totalPages}`
                    : ""
                  }`}
              </p>
              <h2 className="sr-only">Property results</h2>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleApplyAiSearch();
              }}
              className="flex w-full flex-col gap-2 rounded-xl border border-[#A054A0]/20 bg-white/90 p-2 shadow-[0_10px_30px_-15px_rgba(160,84,160,0.12)] backdrop-blur-xl transition-all focus-within:border-[#A054A0] focus-within:ring-2 focus-within:ring-[#A054A0]/15 sm:flex-row lg:max-w-xl"
            >
              <div className="flex flex-1 items-center gap-2 px-2">
                <Sparkles className="h-5 w-5 shrink-0 text-[#A054A0]" />
                <input
                  type="text"
                  value={aiPromptDraft}
                  onChange={(e) => setAiPromptDraft(e.target.value)}
                  placeholder="Describe your ideal office space..."
                  aria-label="Search properties using AI"
                  className="w-full bg-transparent py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
                {aiPromptDraft && (
                  <button
                    type="button"
                    onClick={() => setAiPromptDraft("")}
                    aria-label="Clear AI search"
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#A054A0] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#864286] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search className="h-4 w-4" />
                Apply
              </button>
            </form>
          </div>

          {/* Shown in the page (not as a pop-up) when the searched
              micro-market name exists in more than one city. */}
          {aiClarification && (
            <section
              aria-live="polite"
              aria-labelledby="ai-micromarket-question"
              className="rounded-xl border border-[#A054A0]/20 bg-white p-4 shadow-[0_10px_30px_-15px_rgba(160,84,160,0.12)] lg:ml-auto lg:max-w-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    id="ai-micromarket-question"
                    className="text-sm font-semibold text-slate-900"
                  >
                    {aiClarification.title || "Which micro-market do you mean?"}
                  </p>
                  {aiClarification.message && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {aiClarification.message}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAiClarification(null)}
                  aria-label="Close micro-market question"
                  className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(Array.isArray(aiClarification.choices) &&
                  aiClarification.choices.length > 0
                  ? aiClarification.choices
                  : (aiClarification.options || []).map((option) => ({
                    city:
                      typeof option === "string"
                        ? option
                        : String(option?.city || "").trim(),
                    micromarket: "",
                  }))
                ).map((choice) => {
                  const city = String(choice?.city || "").trim();
                  const micromarket = String(choice?.micromarket || "").trim();
                  if (!city) return null;

                  return (
                    <button
                      key={`${city}::${micromarket}`}
                      type="button"
                      onClick={() => handleConfirmAiCity(city, micromarket)}
                      className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-[#A054A0] hover:bg-purple-50 hover:text-[#A054A0] focus:outline-none focus:ring-2 focus:ring-[#A054A0]/30"
                    >
                      {micromarket ? `${micromarket} · ${city}` : city}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div className="grid grid-cols-2 gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => {
                setSidebarTab("filters");
                setShowFilters(true);
              }}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              Filters
              {activeChips.length > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-slate-900">
                  {activeChips.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setSidebarTab("sort");
                setShowFilters(true);
              }}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-slate-800/25 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#A054A0]/40 hover:text-[#A054A0] active:scale-[0.98]"
            >
              <ArrowUpDown className="h-4 w-4 shrink-0" />
              Sort
              {sortValue && (
                <span className="rounded-full bg-[#A054A0]/10 px-2 py-0.5 text-[10px] font-semibold text-[#A054A0]">
                  Active
                </span>
              )}
            </button>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <button
                key={`${chip.key}-${chip.label}`}
                onClick={() => clearFilter(chip.key)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#A054A0]/8 px-3.5 py-1 text-xs font-semibold text-[#A054A0] ring-1 ring-inset ring-[#A054A0]/20 transition-all hover:bg-[#A054A0]/15"
              >
                {chip.label}
                <X className="h-3.5 w-3.5" />
              </button>
            ))}
            <button
              onClick={clearAll}
              className="ml-1 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr] lg:gap-5 xl:grid-cols-[280px_1fr] xl:gap-8">
          <aside
            className={
              showFilters
                ? "fixed inset-0 z-[200] bg-slate-950/50 backdrop-blur-sm transition-opacity lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:backdrop-blur-none"
                : "hidden lg:block"
            }
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowFilters(false);
            }}
          >
            <div
              className={`border-slate-800/25 bg-white shadow-[0_12px_40px_-15px_rgba(160,84,160,0.12)] lg:sticky lg:top-24 lg:rounded-xl lg:border lg:p-5 ${showFilters
                ? "fixed inset-y-0 right-0 z-[210] flex w-full max-w-xs flex-col overflow-y-auto p-5 sm:max-w-sm"
                : ""
                }`}
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex w-full items-center rounded-xl border border-slate-800/25 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setSidebarTab("filters")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${sidebarTab === "filters"
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab("sort")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${sidebarTab === "sort"
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                      }`}
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Sort
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {sidebarTab === "sort" ? (
                <div className="space-y-2">
                  {SORT_CATEGORIES.map((cat) => {
                    const isSelected =
                      cat.id === "recommended"
                        ? !sortValue
                        : sortValue.startsWith(cat.id);
                    const isDesc = sortValue.endsWith("_desc");

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryClick(cat)}
                        className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${isSelected
                          ? "border-[#A054A0]/30 bg-[#A054A0]/5 text-[#A054A0] shadow-sm"
                          : "border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                          }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-bold transition-colors ${isSelected
                            ? "border-[#A054A0]/30 bg-[#A054A0]/10 text-[#A054A0]"
                            : "border-slate-200 bg-slate-50 text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600"
                            }`}
                        >
                          {cat.id === "recommended" ? (
                            <ArrowUpDown className="h-4 w-4" />
                          ) : cat.id === "name" ? (
                            "A-Z"
                          ) : isSelected && isDesc ? (
                            <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUp className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold">
                            {cat.label}
                            {cat.id !== "recommended" && isSelected && (
                              <span className="ml-1 text-[10px] opacity-75">
                                {cat.id === "name"
                                  ? isDesc
                                    ? "(Z-A)"
                                    : "(A-Z)"
                                  : isDesc
                                    ? "(High to Low)"
                                    : "(Low to High)"}
                              </span>
                            )}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  {sortValue && (
                    <button
                      type="button"
                      onClick={() => handleSortChange("")}
                      className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Reset to Recommended
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="filter-field-1" className="mb-1.5 block text-xs font-semibold text-slate-700">
                      City
                    </label>
                    {/* Native arrow hidden so it lines up with the Micromarket arrow. */}
                    <div className="relative">
                    <select
                      id="filter-field-1"
                      value={resolvedCity}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-xs font-medium text-slate-800 outline-none transition focus:border-[#A054A0] focus:ring-2 focus:ring-[#A054A0]/15"
                    >
                      <option value="">All Cities</option>
                      {cities.map((cityOption) => (
                        <option key={cityOption} value={cityOption}>
                          {cityOption}
                        </option>
                      ))}
                    </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-800" />
                    </div>




                  </div>

                  <div className="relative">
                    <label id="filter-field-2-label" htmlFor="filter-field-2" className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Micromarket
                    </label>
                    <button
                      id="filter-field-2"
                      aria-labelledby="filter-field-2-label filter-field-2"
                      type="button"
                      disabled={!resolvedCity || micromarketsLoading}
                      onClick={() => setShowMicromarkets(!showMicromarkets)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all ${!resolvedCity
                        ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                        }`}
                    >
                      <span className="truncate">
                        {micromarketsLoading
                          ? "Loading..."
                          : selectedMicromarkets.length === 0
                            ? "All Micromarkets"
                            : `${selectedMicromarkets.length} selected`}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${showMicromarkets ? "rotate-180" : ""
                          }`}
                      />
                    </button>

                    {showMicromarkets &&
                      resolvedCity &&
                      !micromarketsLoading && (
                        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                          <button
                            type="button"
                            onClick={selectAllMicromarkets}
                            className="flex w-full items-center gap-2 border-b border-slate-100 px-3.5 py-2.5 text-xs font-medium hover:bg-slate-50"
                          >
                            <span
                              className={`flex h-3.5 w-3.5 items-center justify-center rounded-lg border ${selectedMicromarkets.length === 0
                                ? "border-[#A054A0] bg-[#A054A0]"
                                : "border-slate-300"
                                }`}
                            >
                              {selectedMicromarkets.length === 0 && (
                                <Check className="h-2.5 w-2.5 text-white" />
                              )}
                            </span>
                            All Micromarkets
                          </button>
                          <div className="max-h-48 overflow-y-auto">
                            {micromarkets.map((market) => {
                              const id = String(market.id);
                              const selected =
                                selectedMicromarkets.includes(id);
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => toggleMicromarket(id)}
                                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-medium hover:bg-slate-50"
                                >
                                  <span
                                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-lg border ${selected
                                      ? "border-[#A054A0] bg-[#A054A0]"
                                      : "border-slate-300"
                                      }`}
                                  >
                                    {selected && (
                                      <Check className="h-2.5 w-2.5 text-white" />
                                    )}
                                  </span>
                                  <span className="truncate">
                                    {market.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="border-t border-slate-100 p-2">
                            <button
                              type="button"
                              onClick={() => setShowMicromarkets(false)}
                              className="w-full rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                  </div>

                  <div>
                    <label htmlFor="filter-field-3" className="mb-1.5 block text-xs font-semibold text-slate-700">
                      Office Type
                    </label>
                    <div className="relative">
                    <select
                      id="filter-field-3"
                      value={filters.type === "ai" ? "" : filters.type}
                      onChange={(e) => updateFilter("type", e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-xs font-medium text-slate-800 outline-none transition focus:border-[#A054A0] focus:ring-2 focus:ring-[#A054A0]/15"
                    >
                      <option value="">All Types</option>
                      {OFFICE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-800" />
                    </div>
                  </div>

                  {isCoworking ? (
                    <>
                      <div>
                        <label htmlFor="filter-field-4" className="mb-1.5 block text-xs font-semibold text-slate-700">
                          Required Seats
                        </label>
                        <div className="relative">
                          <Users className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <FilterNumberInput
                      id="filter-field-4"
                            value={filters.seats}
                            onCommit={(nextValue) =>
                              updateFilter("seats", nextValue)
                            }
                            placeholder="e.g. 50"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-medium text-slate-800 outline-none focus:border-[#A054A0]"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="filter-field-5" className="mb-1.5 block text-xs font-semibold text-slate-700">
                          Max Seat Price / month ({filters.currency})
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center">
                            {renderCurrencyIcon()}
                          </span>
                          <FilterNumberInput
                      id="filter-field-5"
                            value={filters.maxBudget}
                            onCommit={(nextValue) =>
                              updateFilter("maxBudget", nextValue)
                            }
                            placeholder="Max price"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-medium text-slate-800 outline-none focus:border-[#A054A0]"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label htmlFor="filter-field-6" className="mb-1.5 block text-xs font-semibold text-slate-700">
                          Max Rent / {areaUnitLabel} / month ({filters.currency})
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center">
                            {renderCurrencyIcon()}
                          </span>
                          <FilterNumberInput
                      id="filter-field-6"
                            value={filters.maxBudget}
                            onCommit={(nextValue) =>
                              updateFilter("maxBudget", nextValue)
                            }
                            placeholder="Max rent"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-medium text-slate-800 outline-none focus:border-[#A054A0]"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="filter-field-7" className="mb-1.5 block text-xs font-semibold text-slate-700">
                          Min Area ({areaUnitLabel})
                        </label>
                        <div className="relative">
                          <Maximize2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <FilterNumberInput
                      id="filter-field-7"
                            value={filters.area}
                            onCommit={(nextValue) =>
                              updateFilter("area", nextValue)
                            }
                            placeholder="e.g. 2000"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-xs font-medium text-slate-800 outline-none focus:border-[#A054A0]"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    onClick={clearAll}
                    className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 min-[1080px]:grid-cols-3">
                {[...Array(6)].map((_, idx) => (
                  <PropertyCardSkeleton key={idx} />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-100 bg-white p-8 text-center shadow-sm">
                <Search className="mx-auto mb-3 h-10 w-10 text-red-400" />
                <h3 className="text-base font-semibold text-slate-900">
                  Unable to load properties
                </h3>
                <p className="mt-1 text-xs text-slate-500">{error}</p>
              </div>
            ) : aiClarification ? (
              properties.length > 0 ? (
                // Earlier cards, faded, until a micro-market is chosen above.
                <div className="grid grid-cols-1 gap-5 opacity-50 transition-opacity sm:grid-cols-2 min-[1080px]:grid-cols-3">
                  {properties.map((property, idx) => (
                    <PropertyCard
                      key={getPropertyId(property)}
                      priority={idx < 3}
                      property={property}
                      isCompared={compareSelection.some(
                        (item) =>
                          getPropertyId(item) === getPropertyId(property),
                      )}
                      onCompareToggle={handleCompareToggle}
                      isShortlisted={wishlistIds.some(
                        (item) =>
                          getPropertyId(item) === getPropertyId(property),
                      )}
                      onShortlistToggle={handleShortlistToggle}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800/25 bg-white p-6 text-sm text-slate-600 shadow-sm">
                  Choose a micro-market above to see matching properties.
                </div>
              )
            ) : totalProperties === 0 ? (
              <div className="space-y-8">
                <div className="rounded-xl border border-slate-800/25 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">
                    No search results found for your search.
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    We couldn&apos;t find a property matching your selected
                    requirements. Please explore other properties near you.
                  </p>
                </div>

                {searchCompleted && suggestionsLoading ? (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 min-[1080px]:grid-cols-3">
                    {[...Array(3)].map((_, idx) => (
                      <PropertyCardSkeleton key={idx} />
                    ))}
                  </div>
                ) : suggestedProperties.length > 0 ? (
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[#A054A0]" />
                      <h3 className="text-base font-semibold text-slate-900">
                        Other properties you may consider
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 min-[1080px]:grid-cols-3">
                      {suggestedProperties.map((property, idx) => (
                        <PropertyCard
                          key={getPropertyId(property)}
                          priority={idx < 3}
                          property={property}
                          isCompared={compareSelection.some(
                            (item) =>
                              getPropertyId(item) === getPropertyId(property),
                          )}
                          onCompareToggle={handleCompareToggle}
                          isShortlisted={wishlistIds.some(
                            (id) => String(id) === getPropertyId(property),
                          )}
                          onShortlistToggle={handleShortlistToggle}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : (
              <div className="space-y-10">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 min-[1080px]:grid-cols-3">
                  {properties.map((property, idx) => (
                    <PropertyCard
                      key={getPropertyId(property)}
                      priority={idx < 3}
                      property={property}
                      isCompared={compareSelection.some(
                        (item) =>
                          getPropertyId(item) === getPropertyId(property),
                      )}
                      onCompareToggle={handleCompareToggle}
                      isShortlisted={wishlistIds.some(
                        (item) =>
                          getPropertyId(item) === getPropertyId(property),
                      )}
                      onShortlistToggle={handleShortlistToggle}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => goToPage(safeCurrentPage - 1)}
                      disabled={safeCurrentPage === 1}
                      className="rounded-xl border border-slate-800/25 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      Previous
                    </button>

                    {getPaginationPages().map((page, idx) =>
                      typeof page === "string" ? (
                        <span
                          key={`${page}-${idx}`}
                          className="px-1 text-xs text-slate-400"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          type="button"
                          onClick={() => goToPage(page)}
                          className={`min-w-[36px] rounded-xl py-2 text-xs font-semibold transition ${page === safeCurrentPage
                            ? "bg-[#A054A0] text-white shadow-sm shadow-[#A054A0]/25"
                            : "border border-slate-800/25 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                          {page}
                        </button>
                      ),
                    )}

                    <button
                      type="button"
                      onClick={() => goToPage(safeCurrentPage + 1)}
                      disabled={safeCurrentPage === totalPages}
                      className="rounded-xl border border-slate-800/25 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}

                {safeCurrentPage === totalPages &&
                  searchCompleted &&
                  !loading &&
                  !aiClarification &&
                  !suggestionsLoading &&
                  suggestedProperties.length > 0 && (
                    <section className="border-t border-slate-800/25 pt-10">
                      <div className="mb-5 text-center sm:text-left">
                        <div className="flex items-center justify-center gap-2 sm:justify-start">
                          <Sparkles className="h-5 w-5 text-[#A054A0]" />
                          <h2 className="text-lg font-semibold text-slate-900">
                            More properties you may consider
                          </h2>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Explore additional properties that are similar to your
                          search.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 min-[1080px]:grid-cols-3">
                        {suggestedProperties.map((property) => {
                          const propertyId = getPropertyId(property);
                          return (
                            <div key={propertyId} className="relative">
                              <PropertyCard
                                property={property}
                                isCompared={compareSelection.some(
                                  (item) => getPropertyId(item) === propertyId,
                                )}
                                onCompareToggle={handleCompareToggle}
                                isShortlisted={wishlistIds.some(
                                  (id) => String(id) === propertyId,
                                )}
                                onShortlistToggle={handleShortlistToggle}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
              </div>
            )}
          </div>
        </div>
        <div
          ref={suggestionsSentinelRef}
          className="h-8 w-full"
          aria-hidden="true"
        />

        {suggestionsLoading && suggestionsHasMore && (
          <p className="py-5 text-center text-sm text-slate-500">
            Loading more properties…
          </p>
        )}
      </div>

      {/* Floating card: fixed in the corner, so it takes no space on the
          page and scrolling works as usual. Sits above the compare bar. */}
      {!isExclusiveLeadOpen && (
        <div
          className={`fixed right-3 z-[85] sm:right-5 ${showSelectionBar
            ? "bottom-[8.5rem] lg:bottom-[7.5rem]"
            : "bottom-4 sm:bottom-5"
            }`}
        >
          {exclusiveCardOpen ? (
            <div className="relative w-[300px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[#A054A0]/20 bg-white/95 p-4 shadow-xl backdrop-blur sm:w-[320px]">
              <button
                type="button"
                onClick={() => setExclusiveCardOpen(false)}
                aria-label="Minimise"
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-start gap-2.5 pr-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#A054A0]/10">
                  <Sparkles className="h-4 w-4 text-[#A054A0]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    Looking for something exclusive?
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    We haven&apos;t listed all available properties here.
                    Connect with our team to discover exclusive
                    office spaces tailored to your requirements.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setExclusiveLeadError("");
                  setExclusiveLeadSuccess(false);
                  exclusiveGuard.restart();
                  setIsExclusiveLeadOpen(true);
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#A054A0] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#864286] focus:outline-none focus:ring-2 focus:ring-[#A054A0]/40 focus:ring-offset-2"
              >
                Find Exclusive Properties
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setExclusiveCardOpen(true)}
              aria-label="Looking for something exclusive?"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#A054A0]/25 bg-white/95 px-3.5 py-2 text-xs font-semibold text-[#A054A0] shadow-lg backdrop-blur transition hover:bg-purple-50"
            >
              <Sparkles className="h-4 w-4" />
              Exclusive properties
            </button>
          )}
        </div>
      )}

      {showSelectionBar && (
        <div className="fixed bottom-3 left-1/2 z-[90] w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 rounded-xl border border-slate-400/80 bg-white/95 p-3 shadow-2xl backdrop-blur-xl sm:bottom-5 sm:w-[calc(100%-2.5rem)] sm:p-5">
          <div className="flex flex-col gap-2.5 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
            {" "}
            <div className="min-w-0 flex-1">
              {compareSelection.length > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <GitCompare className="h-5 w-5 shrink-0 text-[#A054A0]" />
                    <p className="text-sm font-bold leading-5 text-black sm:text-base">
                      {compareSelection.length} of {MAX_COMPARE_PROPERTIES}{" "}
                      properties selected for comparison
                    </p>
                  </div>

                  {compareLimitNotice ? (
                    <p
                      role="status"
                      className="mt-1 pl-7 text-xs font-semibold leading-5 text-[#A054A0] sm:text-sm"
                    >
                      You can compare up to {MAX_COMPARE_PROPERTIES} properties.
                      Remove one to add another.
                    </p>
                  ) : (
                  <p className="mt-1 hidden pl-7 text-xs leading-5 text-slate-500 sm:block sm:text-sm">
                    {canCompare
                      ? "Ready to compare side-by-side."
                      : `Select ${remainingToCompare === 1
                        ? "one more property"
                        : "at least two properties"
                      } to compare.`}
                  </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 shrink-0 text-[#A054A0]" />
                    <p className="text-sm font-bold leading-5 text-black sm:text-base">
                      {wishlistIds.length} Shortlisted{" "}
                      {wishlistIds.length === 1 ? "Property" : "Properties"}
                    </p>
                  </div>

                  <p className="mt-1 hidden pl-7 text-xs leading-5 text-slate-500 sm:block sm:text-sm">
                    Select properties to compare or raise a unified enquiry.
                  </p>
                </>
              )}
            </div>
            <div
              className={`grid w-full gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-start lg:w-auto lg:shrink-0 lg:justify-end ${compareSelection.length > 0 ? "grid-cols-3" : "grid-cols-2"
                }`}
            >
              <button
                type="button"
                onClick={openComparePage}
                disabled={!canCompare}
                className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#A054A0] px-2 py-2 text-xs sm:min-h-11 sm:gap-2 sm:py-2.5 font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#864286] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm sm:px-4 sm:text-sm"
              >
                <GitCompare className="h-4 w-4 shrink-0" />
                <span>Compare</span>
                {compareSelection.length > 0 && (
                  <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] font-semibold">
                    {compareSelection.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={openEnquiryForm}
                disabled={wishlistIds.length === 0}
                className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-[#A054A0] bg-white px-2 py-2 text-xs sm:min-h-11 sm:gap-2 sm:py-2.5 font-bold text-[#A054A0] shadow-sm transition-all duration-200 hover:bg-[#A054A0]/10 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span>Raise Enquiry</span>
              </button>

              {compareSelection.length > 0 && (
                <button
                  type="button"
                  onClick={clearCompareSelection}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-500 bg-white px-2 py-2 text-xs font-semibold text-black/80 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] sm:min-h-11 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                >
                  <X className="h-4 w-4 shrink-0" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enquiry Modal */}
      {isEnquiryOpen && (
        <EnquiryModal
          closeEnquiryForm={closeEnquiryForm}
          enquiryError={enquiryError}
          enquiryForm={enquiryForm}
          enquiryGuard={enquiryGuard}
          enquirySelection={enquirySelection}
          enquirySuccess={enquirySuccess}
          handleEnquiryChange={handleEnquiryChange}
          handleEnquirySubmit={handleEnquirySubmit}
          handleRemoveFromEnquiry={handleRemoveFromEnquiry}
          isSubmittingEnquiry={isSubmittingEnquiry}
        />
      )}

      {isExclusiveLeadOpen && (
        <ExclusiveLeadModal
          closeExclusiveLeadForm={closeExclusiveLeadForm}
          exclusiveCountry={exclusiveCountry}
          exclusiveCountryOpen={exclusiveCountryOpen}
          exclusiveCountryRef={exclusiveCountryRef}
          exclusiveCountrySearch={exclusiveCountrySearch}
          exclusiveFieldErrors={exclusiveFieldErrors}
          exclusiveGuard={exclusiveGuard}
          exclusiveLeadError={exclusiveLeadError}
          exclusiveLeadForm={exclusiveLeadForm}
          exclusiveLeadSuccess={exclusiveLeadSuccess}
          filteredExclusiveCountries={filteredExclusiveCountries}
          handleExclusiveLeadChange={handleExclusiveLeadChange}
          handleExclusiveLeadSubmit={handleExclusiveLeadSubmit}
          isSubmittingExclusiveLead={isSubmittingExclusiveLead}
          setExclusiveCountry={setExclusiveCountry}
          setExclusiveCountryOpen={setExclusiveCountryOpen}
          setExclusiveCountrySearch={setExclusiveCountrySearch}
          setExclusiveFieldErrors={setExclusiveFieldErrors}
          setExclusiveLeadForm={setExclusiveLeadForm}
        />
      )}
    </div>
  );
}

export default function PropertiesClient({ initialResults = null }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <PropertiesClientContent initialResults={initialResults} />
    </Suspense>
  );
}