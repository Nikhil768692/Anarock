# Anarock

AI-powered commercial real estate search platform for India. The project is a Next.js app hosted on **Vercel**. It reads property listings and page content from the **Zoho Catalyst Data Store**, images from **Catalyst Stratus**, sends leads to **Zoho CRM** and saves "List your Property" submissions to a **Zoho Sheet**.

> Marketing copy from the app: _"Anarock — Premium Commercial Real Estate in India"_, _"India's leading commercial real estate advisory."_

## Repository Layout

```
.
├── .github/workflows/ci.yml   # Lint, tests, dependency scan and build on every push
├── anarock/                   # Next.js app (hosted on Vercel)
│   ├── src/app/               # App Router pages + API routes
│   ├── src/components/        # Feature components (layout, home, properties, common)
│   ├── src/lib/               # Catalyst/Zoho wiring, caching, formatting, request and form protection
│   ├── src/proxy.js           # Content-Security-Policy with a nonce per page view
│   ├── tests/                 # Unit and route tests (node:test)
│   └── .env.example           # Every environment variable the code reads (names only)
├── catalyst.json              # Catalyst project manifest (Data Store / Stratus project)
├── .catalystrc                # Local Catalyst CLI project/environment configuration
└── package.json               # Root-level package manifest
```

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 3, Framer Motion, `lucide-react` icons
- **Hosting:** Vercel. **Data:** [Zoho Catalyst](https://catalyst.zoho.com/) Data Store and Stratus (object storage)
- **Integrations:**
  - Zoho CRM v8 REST API: Leads, Notes, City and Micromarket modules
  - Zoho Sheet: "List your Property" submissions
  - Google Gemini: understands AI search queries
  - Frankfurter API: currency exchange rates (INR, AED, USD, EUR, SGD), fetched once a day
  - OpenStreetMap Nominatim: reverse geocoding, only when the visitor presses "Use my location"
  - Optional: Cloudflare Turnstile (bot check on forms) and Upstash Redis (rate limits shared by all server instances)
- **SDK:** `zcatalyst-sdk-node`

## Key Features

- **Property search & listings:** filter by city, micro-market, office type, rent and area; sort; paginate. Listings come from the Catalyst Data Store and are cached for 10 minutes.
- **AI search:** describe a requirement in plain words (for example "office in Bengaluru under 80 per sq ft"). The page shows the understood filters as chips. If a micro-market name has listings in more than one city and no city was named, the page asks which one is meant, below the search bar.
- **Property detail page:** rendered on the server with gallery, specifications, AI-generated summary (`AIAttributes`), rent and seat price in the selected currency and area unit, an enquiry form for that property and 8 similar properties.
- **Compare:** up to 3 properties side by side (stored in the browser).
- **Shortlist:** saved properties and one enquiry for all of them (stored in the browser).
- **City pages (`/kyc/city/<city>`):** advisor card, market stats, micro-market cards with rent bands, 9 properties and a requirement form. Content comes from Catalyst tables (see below).
- **Home page FAQs:** loaded from the Catalyst `FAQ` table.
- **Lead capture:** callback, post-a-requirement, contact, property and shortlist enquiry forms create leads in Zoho CRM. A form sent with a phone number or e-mail that is already in the CRM never changes that Lead: the enquiry is added to it as a Note marked "not verified".
- **Currency and unit switching:** INR / AED / USD / EUR / SGD and sq ft / sq m, applied to prices, rents and areas on every page.
- **Pages:** Contact, Privacy Policy, Terms of Use and RERA; `/.well-known/security.txt`.
- **Location on request, cookie consent, dynamic sitemap and robots.txt.**

## Catalyst Data Store Tables

| Table              | Used for                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `Properties`       | All property listings. Only the fields listed in `PUBLIC_PROPERTY_FIELDS` (`src/lib/propertyMapper.js`) are sent to browsers. The CRM record ID of a property is read from the `crmID` column (or the column named in `CATALYST_CRM_ID_COLUMN`) and used only on the server. |
| `FAQ`              | Home page FAQs (`Question`, `Answer`)                                                        |
| `CityAdvisors`     | City page advisor card (`CityName`, `AdvisorName`, `Designation`, `ExperienceYears`, `PhotoUrl`) |
| `CityMarketStats`  | City page market stats                                                                       |
| `CityMicromarkets` | City page micro-market names and rent bands (`CityName`, `MicromarketName`, `RentMin`, `RentMax`, `SortOrder`, `PropertyMicromarket`) |

The site reads the **Production** environment. Create tables in Development, deploy them to Production, and add rows in Production. Changes show on the site within the cache time (5 to 10 minutes).

Property images are stored in the Stratus bucket `property-images`, in a folder named by the property's `ImageFolderPath` (for example `Project_Picture_1.jpg`, `Floor_Plan_1.jpg`, `Property_Photo_1.jpg` to `Property_Photo_5.jpg`).

## Prerequisites

- Node.js 20.9 or later (CI uses Node 22)
- A [Zoho Catalyst](https://catalyst.zoho.com/) project (Data Store and Stratus)
- Zoho CRM OAuth credentials (self-client or server-based application) with the Leads, Notes and Settings scopes
- A Google Gemini API key for AI search

## Environment Variables

Copy `anarock/.env.example` to `anarock/.env.local` for local work, and set the same variables in the Vercel project settings. The example file lists every variable the code reads, with defaults for the optional ones. Never commit `.env.local`.

| Variables                                                                                 | Used for                                         |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `PROJECT_ID`, `PROJECT_KEY`, `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`                | Catalyst Data Store and Stratus (`src/lib/catalyst.js`) |
| `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`                              | Zoho CRM (`src/lib/zoho.js`): leads, notes, cities, micro-markets |
| `ZOHO_SHEET_REFRESH_TOKEN`, `ZOHO_SHEET_RESOURCE_ID`, `ZOHO_SHEET_WORKSHEET`, `ZOHO_SHEET_API_DOMAIN`, `ZOHO_ACCOUNTS_DOMAIN` | "List your Property" submissions                 |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_SEARCH_DAILY_LIMIT`                                 | AI search                                        |
| `NEXT_PUBLIC_BASE_URL`                                                                    | Sitemap, robots.txt and canonical links          |
| `TRUSTED_PROXY_COUNT`                                                                     | Finding the real visitor IP for rate limits      |
| `CATALYST_CRM_ID_COLUMN`                                                                  | Optional: Properties column that holds the CRM record ID |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                                  | Optional: Cloudflare Turnstile check on every form |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                                      | Optional: rate limits shared by all server instances |
| `PROPERTIES_CACHE_TTL`, `CITIES_CACHE_TTL`, `MICROMARKETS_CACHE_TTL`, `LOG_LEVEL`         | Optional: cache times and log detail             |

## Getting Started

### 1. Install dependencies

```bash
cd anarock
npm install
```

### 2. Add the environment variables

Copy `.env.example` to `.env.local` and fill in the values.

### 3. Run the app locally

```bash
cd anarock
npm run dev            # http://localhost:3000
```

### 4. Deploy

Push to the GitHub repository. Vercel builds and deploys the `anarock` folder; the GitHub Actions workflow runs lint, tests, a dependency scan and a build on every push.

## Scripts (`anarock/`)

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the Next.js dev server |
| `npm run build` | Production build             |
| `npm run start` | Start the production server  |
| `npm run lint`  | Run ESLint                   |
| `npm test`      | Run the tests in `tests/`    |

## API Routes (`anarock/src/app/api/`)

| Route                                                     | Purpose                                                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `properties`, `properties/[id]`, `properties/suggestions` | Listing search/filter/sort, property detail, suggested properties (Data Store, cached)        |
| `ai-search`                                               | AI search: Gemini reads the query, the server filters listings (rate limited, daily Gemini cap) |
| `leads`                                                   | "Request a callback" lead into Zoho CRM (validation, rate limit)                              |
| `lead2`                                                   | "Post a requirement" lead from the home and city pages (validation, rate limit, fixed lead source) |
| `lead3`                                                   | Property and shortlist enquiries: lead plus `Interested_Properties` subform rows (the browser sends website property IDs; the server looks up the CRM IDs) |
| `cities`, `micromarkets`                                  | City and micro-market lookups from Zoho CRM (cached)                                          |
| `city-page`                                               | City page advisor, market stats and micro-market rent bands (Data Store, cached 5 minutes)   |
| `faqs`                                                    | Home page FAQs (Data Store, cached 5 minutes)                                                 |
| `market-stats`                                            | Home page market statistics                                                                   |
| `list-your-property`                                      | Saves an owner's submission as a row in the Zoho Sheet                                        |
| `location`                                                | Reverse geocoding (OpenStreetMap Nominatim)                                                   |
| `exchange-rates`                                          | Currency rates (Frankfurter), cached for 24 hours                                             |
| `wishlist`                                                | Stub (returns an empty set)                                                                   |

## Security

- Every form sends a hidden "honeypot" field and how long the form was open; bots that fill the hidden field or send in under 2.5 seconds get a normal reply but nothing is saved. With `TURNSTILE_SECRET_KEY` set, a Cloudflare Turnstile check is also required. Requests from other websites are refused.
- Lead, location, AI search and listing routes are rate limited per visitor IP. The IP is read from the end of `X-Forwarded-For` (see `TRUSTED_PROXY_COUNT`). With Upstash configured the counts are shared by every server instance; otherwise each instance counts in memory.
- A public form never changes an existing CRM Lead and the reply never reveals whether the visitor is already in the CRM.
- Property data sent to browsers is limited to the fields the site shows.
- Pages get a Content-Security-Policy with a fresh nonce on every view (`src/proxy.js`); API responses get a policy that allows nothing. COOP and CORP headers are set.
- Request bodies are size-limited, invalid JSON returns 400, and visitors see fixed error messages instead of internal or Zoho error details.
- Personal data (names, phone numbers, emails, locations) is not written to server logs. Server logs go through `src/lib/logger.js`.
- The visitor's location is requested only after they press "Use my location", and only the area, city, state, country and PIN code are kept (in the browser tab).
