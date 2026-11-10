# Anarock

AI-powered commercial real estate search platform for India, built on **Zoho Catalyst**. The project is a Next.js storefront deployed as a Catalyst Slate app. It reads property listings and page content from the **Catalyst Data Store**, images from **Catalyst Stratus**, and sends leads to **Zoho CRM**.

> Marketing copy from the app: _"Anarock — Premium Commercial Real Estate in India"_, _"India's leading commercial real estate advisory."_

## Repository Layout

```
.
├── anarock/                   # Next.js 14 frontend (deployed as a Catalyst Slate app)
│   ├── src/app/               # App Router pages + API routes
│   ├── src/components/        # Feature components (layout, home, properties, common)
│   ├── src/lib/               # Catalyst/Zoho wiring, caching, formatting, preferences, request guards
│   ├── src/pages/HomePage.js  # Main landing page composition
│   └── .env.example           # List of required environment variables (names only)
├── catalyst.json              # Catalyst project manifest (registers the Slate app)
├── .catalystrc                # Local Catalyst CLI project/environment configuration
└── package.json               # Root-level package manifest
```

## Tech Stack

- **Frontend:** Next.js 14.2.35 (App Router), React 18, Tailwind CSS, Framer Motion, `lucide-react` icons
- **Backend / Hosting:** [Zoho Catalyst](https://catalyst.zoho.com/): Slate (hosting), Data Store, Stratus (object storage)
- **Integrations:**
  - Zoho CRM v8 REST API: Leads, City and Micromarket modules
  - Google Gemini: understands AI search queries
  - Frankfurter API: currency exchange rates (INR, AED, USD, EUR, SGD), fetched once a day
  - OpenStreetMap Nominatim: reverse geocoding for location detection
- **SDK:** `zcatalyst-sdk-node`

## Key Features

- **Property search & listings:** filter by city, micro-market, office type, rent and area; sort; paginate. Listings come from the Catalyst Data Store and are cached for 10 minutes.
- **AI search:** describe a requirement in plain words (for example "office in Bengaluru under 80 per sq ft"). The page shows the understood filters as chips. If a micro-market name has listings in more than one city and no city was named, the page asks which one is meant, below the search bar.
- **Property detail page:** gallery, specifications, rent and seat price in the selected currency and area unit.
- **Compare:** up to 3 properties side by side (stored in the browser).
- **Shortlist:** saved properties and one enquiry for all of them (stored in the browser).
- **City pages (`/kyc/city/<city>`):** advisor card, market stats, micro-market cards with rent bands, 9 properties and a requirement form. Content comes from Catalyst tables (see below).
- **Home page FAQs:** loaded from the Catalyst `FAQ` table.
- **Lead capture:** callback, post-a-requirement and shortlist enquiry forms create leads in Zoho CRM.
- **Currency and unit switching:** INR / AED / USD / EUR / SGD and sq ft / sq m, applied to prices, rents and areas on every page.
- **Legal pages:** Privacy Policy, Terms of Use and RERA.
- **Location detection, cookie consent, dynamic sitemap and robots.txt.**

## Catalyst Data Store Tables

| Table              | Used for                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `Properties`       | All property listings                                                                        |
| `FAQ`              | Home page FAQs (`Question`, `Answer`)                                                        |
| `CityAdvisors`     | City page advisor card (`CityName`, `AdvisorName`, `Designation`, `ExperienceYears`, `PhotoUrl`) |
| `CityMarketStats`  | City page market stats                                                                       |
| `CityMicromarkets` | City page micro-market names and rent bands (`CityName`, `MicromarketName`, `RentMin`, `RentMax`, `SortOrder`, `PropertyMicromarket`) |

The site reads the **Production** environment. Create tables in Development, deploy them to Production, and add rows in Production. Changes show on the site within the cache time (5 to 10 minutes).

Property images are stored in the Stratus bucket `property-images`, in a folder named by the property's `ImageFolderPath` (for example `Project_Picture_1.jpg`, `Floor_Plan_1.jpg`, `Property_Photo_1.jpg` to `Property_Photo_5.jpg`).

## Prerequisites

- Node.js 18 or later
- A [Zoho Catalyst](https://catalyst.zoho.com/) account and project
- [Catalyst CLI](https://catalyst.zoho.com/help/cli.html) (`npm install -g zcatalyst-cli`)
- Zoho CRM OAuth credentials (self-client or server-based application)
- A Google Gemini API key for AI search

## Environment Variables

Copy `anarock/.env.example` to `anarock/.env.local` and fill in the values. The example file lists every variable the code reads, grouped by purpose, with defaults for the optional ones. Never commit `.env.local`.

Main groups:

| Variables                                                                                 | Used for                                         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `PROJECT_ID`, `PROJECT_KEY`, `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`                | Catalyst Data Store access (`src/lib/catalyst.js`) |
| `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`                              | Zoho CRM leads, cities and micro-markets         |
| `ZOHO_CRM_CLIENT_ID`, `ZOHO_CRM_CLIENT_SECRET`, `ZOHO_CRM_REFRESH_TOKEN` (or `ZOHO_CRM_ACCESS_TOKEN`) | "List your Property" city/micro-market lookups |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_SEARCH_DAILY_LIMIT`                                 | AI search                                        |
| `NEXT_PUBLIC_BASE_URL`                                                                    | Sitemap, robots.txt and canonical links          |
| `TRUSTED_PROXY_COUNT`                                                                     | Finding the real visitor IP for rate limits      |

## Getting Started

### 1. Install dependencies

```bash
cd anarock
npm install
```

### 2. Configure Catalyst

```bash
catalyst login
catalyst init      # or catalyst config, if the project is already registered (see .catalystrc)
```

### 3. Run the frontend locally

```bash
cd anarock
npm run dev            # http://localhost:3000
```

### 4. Deploy

```bash
catalyst deploy
```

This deploys the `anarock` Slate (Next.js) app declared in `catalyst.json`. Note: `catalyst.json` points at a Windows source path (`D:\\Catalyst\\anarock`); adjust it for other machines.

## Scripts (`anarock/`)

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the Next.js dev server |
| `npm run build` | Production build             |
| `npm run start` | Start the production server  |
| `npm run lint`  | Run ESLint                   |

## API Routes (`anarock/src/app/api/`)

| Route                                                     | Purpose                                                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `properties`, `properties/[id]`, `properties/suggestions` | Listing search/filter/sort, property detail, suggested properties (Data Store, cached)        |
| `ai-search`                                               | AI search: Gemini reads the query, the server filters listings (rate limited, daily Gemini cap) |
| `leads`                                                   | "Request a callback" lead into Zoho CRM (validation, rate limit)                              |
| `lead2`                                                   | "Post a requirement" lead from the home and city pages (validation, rate limit, fixed lead source) |
| `lead3`                                                   | Shortlist enquiry: lead plus `Interested_Properties` subform rows                             |
| `cities`, `micromarkets`                                  | City and micro-market lookups from Zoho CRM (cached)                                          |
| `city-page`                                               | City page advisor, market stats and micro-market rent bands (Data Store, cached 5 minutes)   |
| `faqs`                                                    | Home page FAQs (Data Store, cached 5 minutes)                                                 |
| `market-stats`                                            | Home page market statistics                                                                   |
| `list-your-property`                                      | City/micro-market options for the owner form (cached 30 minutes)                              |
| `location`                                                | Reverse geocoding (OpenStreetMap Nominatim)                                                   |
| `exchange-rates`                                          | Currency rates (Frankfurter), cached for 24 hours                                             |
| `wishlist`                                                | Stub (returns an empty set)                                                                   |

## Security

- Lead and AI search routes are rate limited per visitor IP. The IP is read from the end of `X-Forwarded-For` (see `TRUSTED_PROXY_COUNT`), so a value sent by the visitor is ignored. Limits are kept in server memory; the API Gateway throttle remains the main protection when several instances run.
- Request bodies are size-limited, invalid JSON returns 400, and visitors see fixed error messages instead of internal or Zoho error details.
- Personal data (names, phone numbers, emails, locations) is not written to server logs.
- Security headers and a Content Security Policy are set in `next.config.mjs`. Scripts are allowed only from the site and the Zoho CDN. HSTS and X-Frame-Options are added by Catalyst Slate.