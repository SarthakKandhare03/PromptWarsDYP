# पुण्यात काय? (Punyat Kay? — "What's happening in Pune?")

**Live demo:** https://punyat-kay-knd5p2vgxa-el.a.run.app (Google Cloud Run, asia-south1)

## Evaluation at a glance
| Criterion | Evidence in this repo |
|---|---|
| **Problem statement alignment** | [`docs/PROBLEM_ALIGNMENT.md`](docs/PROBLEM_ALIGNMENT.md) maps every line of the brief (5 pillars, *verified actionable insights*, AI/ML, NLP, maps, APIs, analytics) to code |
| **Code quality** | Typed end to end (Pydantic + strict TypeScript); pure engines separated from I/O (`backend/app/services/*`); **ruff** lint + format (incl. bandit `S` rules) and **oxlint**, both clean; [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| **Security** | [`SECURITY.md`](SECURITY.md): Secret Manager, CSP/HSTS, validation, upload allow-lists, rate limiting, body-size guard, prompt-injection fencing, non-root container |
| **Efficiency** | One Gemini call per request with model fallback + LRU cache + timeouts; 10-min weather cache; GZip; lazy-loaded routes (148 KB gzipped entry); immutable hashed assets; warm Cloud Run instance |
| **Testing** | **62 pytest** (engines, learning, API, security headers, rate limits) · **11 Vitest** (URL builders, geo, translation completeness/placeholder parity) · **46-check e2e** on phone + desktop ([`e2e/smoke.mjs`](e2e/smoke.mjs)). pytest + Vitest + lint + Docker build run in CI; e2e runs locally and against the live site (46/46 passing) |
| **Accessibility** | Semantic landmarks, skip link, labelled controls (verified by the e2e audit), `aria-live`, keyboard support, focus rings, AA contrast in light/dark, reduced motion, captions for audio, voice input/read-aloud, 3 languages, 16 px mobile inputs |
| **Google services** | Gemini (multimodal, structured output, Maps grounding, TTS), Google Maps URLs + optional Maps JS, **Cloud Run**, **Cloud Build**, **Secret Manager**, Google Fonts |


**Feel the city. Read the signals. Move smarter.**

A context-aware city intelligence platform for **Pune**, built for *PromptWars x BRAIN DYPCOEI* on the problem statement **"City Life: Exploring, Experiencing & Navigating the Chaos We Call Home."**

Most city apps show you places. CityPulse tells you **which information to trust** and **how risky a route is at the hour you travel**, and it says "insufficient data" instead of pretending.

---

## What makes it different

| Real-world gap | CityPulse answer |
|---|---|
| Crowd data and reviews are unreliable. Google removed 240M+ fake reviews in 2024, and tourist areas are hit hardest | **Trust Engine**: every citizen report gets a 0–100 trust score with written reasons. The score comes from evidence (photo, voice, AI media↔text consistency), independent nearby reports, **live weather cross-checks** (a waterlogging report plus measured rain counts as corroboration), and accident-corridor checks. Based on CommuniSense (Nairobi) and the Jalisco Safety Index research |
| Maps optimise for speed only, but risk changes after dark (SafetiPin audits). Pune has 20–110+ reported accident black spots | **Time-aware Safe Route**: real road alternatives (OSRM) are scored for the chosen hour. The score uses accident-prone corridors, trusted and fresh reports (exponential decay), and distance to police/hospitals. Night travel weights risk ×1.4. Gemini explains the trade-off in plain language |
| Weather, reports, reviews and maps live in separate apps | **City Pulse**: one orbital view that fuses live weather (Open-Meteo), report activity, verification state and data freshness into a bounded, explained Chaos Index |
| "Best place" lists are black boxes | **Compare**: the user sets priorities and the ranking re-orders live. Ratings are **Bayesian-adjusted** (4.9★ from 12 reviews < 4.4★ from 3,000). Missing dimensions are shown as missing, never guessed |

### Honesty rules built into the product
- A score never means "safe". It means "fewer known risks", and the UI says so.
- No data near a route? It shows **"Insufficient data"**, not a number.
- Missing street-lighting data is listed as a missing factor.
- Official, Corroborated, Partially verified and Unverified are always visually distinct.
- Every demo record and demo value is labelled. The AI/rules mode is always visible (navbar chip and answer badges).

## Features (all five pillars)
1. **Explore & Hospitality / History & Culture**: map + list with working filters (category, price, rating, distance, wheelchair access, saved), plus heritage hidden gems (Tambat Ali, Pataleshwar caves).
2. **Safety & Security**: fastest vs fewest-known-risks routes, accident corridors, incident timeline with verification labels, trust reasons and age.
3. **Best vs Worst**: weighted comparison of 2–4 places across five dimensions.
4. **Smart City Insights**: report by **text, photo or voice note** (English/Marathi/Hindi). Gemini returns structured JSON (category, severity, summary, media consistency, language), and the report appears on the map instantly, re-scoring nearby reports.
5. **AI City Assistant**: natural-language search on the home page. **Gemini grounded with Google Maps** answers with cited sources, and mentioned places get highlighted on the map. There is a clearly labelled rule-based fallback.

## Self-learning layer ("trained by the city")
The app gets smarter with every report and vote. Nothing is a black box.
- **Community verification**: anyone nearby can mark a report *Still there*, *Not there* or *Resolved* (one vote per device; you cannot vote on your own report). Confirmations raise trust (+10 each), disputes lower it (−15 each), and two "resolved" votes close a report.
- **Reporter reputation**: a Beta(1,1) prior updated by how the community judged each anonymous reporter's past reports. Accurate reporters earn up to +10 trust on new reports, unreliable ones lose it. Reputation uses votes, not trust, so there is no feedback loop.
- **Hotspot model**: learns *where and when* problems recur. Reports go into ~550 m cells × 5 time-of-day bands, weighted by trust × severity × a 14-day half-life (old patterns fade). Disputed reports are ignored, and one report is never a "pattern". It retrains on every report and vote, feeds **safe-route scoring** ("Learned pattern: recurring waterlogging here in the evening"), and is exposed at `GET /api/insights/hotspots`.
- **Persistence**: SQLite keeps reports, votes and reputation across restarts.

## Google Maps integration
- **Navigate in Google Maps**: hands the *chosen safer route* to Google Maps with waypoints sampled from our geometry, so turn-by-turn follows our path, not Google's fastest.
- **Open in Google Maps / Street View** on every place, and Street View on every report so people can see a spot before going.
- **Google Maps JavaScript map**: set `GOOGLE_MAPS_API_KEY` (referrer-restricted) and the app switches to Google Maps automatically, with an OSM/Google toggle. Without a key it uses OpenStreetMap.

## Chat assistant
A floating **काय?** assistant (bottom-right) with multi-turn memory: recent turns go to Gemini as context. Places it mentions become chips that highlight them on the map.

## Architecture

```
React 19 + TypeScript + Vite ── Leaflet map · Framer Motion · Lucide
        │ /api/*
FastAPI (Python 3.13) ── Pydantic validation · rate limit · CSP/security headers · GZip
  ├─ services/trust.py      Trust Engine (pure, unit-tested)
  ├─ services/safety.py     Time-aware route scoring (pure, unit-tested)
  ├─ services/ranking.py    Bayesian rating + weighted compare (pure, unit-tested)
  ├─ services/gemini.py     Gemini: multimodal structured output, Maps grounding, route explanations
  ├─ services/external.py   OSRM routing, Open-Meteo weather (timeouts + honest fallbacks)
  └─ data/pune.py           Seed dataset (real landmarks, labelled demo values)
Single container → Google Cloud Run
```

## Google services used
- **Gemini API** (`google-genai`):
  - **multimodal** report analysis (image + audio + text) with **structured JSON output**
  - **Grounding with Google Maps** for the assistant, with `lat_lng` retrieval context and cited Maps sources
  - natural-language route trade-off explanations
- **Google Cloud Run** (asia-south1): live deployment, built from the root `Dockerfile` by **Cloud Build**
- **Secret Manager**: the Gemini key is injected at runtime and never baked into the image
- **Google Fonts**: Space Grotesk + Inter

## Evaluation checklist
- **Code quality**: small single-purpose modules, typed end to end (Pydantic + TypeScript), pure scoring engines separated from I/O.
- **Security**:
  - API key only on the server, from env (`.env` is git-ignored, `.env.example` provided)
  - Pydantic validation on every input; Pune bounding-box check
  - upload MIME and size allow-lists (5 MB)
  - per-IP rate limiting (HTTP 429)
  - CSP, `X-Frame-Options`, `nosniff`, Referrer and Permissions policies
  - untrusted user text is fenced in prompts
  - React text rendering only (no `dangerouslySetInnerHTML`)
  - non-root container user
- **Efficiency**:
  - one Gemini call per request, with an LRU cache and a hard timeout
  - weather cached for 10 min
  - GZip, lazy-loaded routes, cached marker icons, no image assets
- **Testing**: **62 pytest tests**, **11 Vitest unit tests** and a **46-check end-to-end suite** (`e2e/smoke.mjs`, real Chrome on a 390 px phone and 1440 px desktop; unit suites run in CI) covering:
  - geo maths
  - trust scoring (corroboration, weather and corridor cross-checks, caps)
  - night weighting and "insufficient data" in route safety
  - Bayesian ranking
  - every API endpoint, including validation failures, upload rejection, rate limiting and security headers

  External services are stubbed.
- **Accessibility**:
  - skip link, semantic landmarks, labelled form controls, `aria-live` results, `aria-pressed` toggles
  - keyboard-operable City Pulse signals, visible focus rings, AA contrast on dark surfaces
  - `prefers-reduced-motion` respected (CSS + `MotionConfig`)
  - text alternatives for every map result
  - mobile bottom navigation with ≥44 px targets

## Run locally

```bash
# 1. Backend
cd backend
python -m venv .venv && .venv/Scripts/activate   # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp ../.env.example ../.env                        # add GEMINI_API_KEY (optional: rules mode without it)
uvicorn app.main:app --reload --port 8000

# 2. Frontend (dev, proxies /api to :8000)
cd frontend && npm install && npm run dev        # http://localhost:5173

# Tests
cd backend && python -m pytest && ruff check .
cd frontend && npm test
```

## End-to-end tests (mobile + desktop)
`e2e/smoke.mjs` drives the system Chrome with puppeteer-core and checks:
- every page on a **390 px phone** and a **1440 px desktop**: no runtime errors, no horizontal overflow, every control has an accessible name, and the bottom navigation on mobile
- the flows: light/dark toggle, Marathi switch, safe-route scoring with the Google Maps handoff, report → review → submit (trust-scored), the Gemini chat answer, compare re-ranking, explore search, and the Ganeshotsav darshan route
- the PWA manifest, favicon and welcome audio

```bash
cd e2e && npm install && node smoke.mjs                 # local (http://127.0.0.1:8000)
node smoke.mjs https://punyat-kay-knd5p2vgxa-el.a.run.app  # live
```

## Brand
The app icon (`design/logo.html` → `design/build_icons.py`) is a sunshine-yellow tile with Devanagari **पु** (for पुणे), a map pin with a marigold centre, and a marigold toran. It ships as the favicon, apple-touch icon and installable PWA icons (`manifest.json`).

## Deploy (Google Cloud Run)

```bash
export PROJECT=prompt-wars-511106 GEMINI_API_KEY=...   # your key; stored in Secret Manager, not the image
bash deploy/gcp/deploy.sh
```

The script enables Cloud Run, Cloud Build, Artifact Registry and Secret Manager, stores the key as the `gemini-api-key` secret,
and runs `gcloud run deploy --source .` (Cloud Build builds the multi-stage `Dockerfile`: React build, then FastAPI runtime as a non-root user).
`.gcloudignore` keeps `.env`, `node_modules` and local data out of the upload.

An AWS Elastic Beanstalk bundle is also available: `python deploy/aws/package.py`.

## Data sources and honesty notes
- **Places**: real, well-known Pune landmarks and eateries. Coordinates are approximate. **Ratings, prices, cleanliness and accessibility values are illustrative demo data.**
- **Accident-prone corridors**: approximate points on corridors publicly reported by Pune City Police and the district administration (Pune–Solapur Rd, Pune–Satara Rd, Mumbai–Bengaluru bypass, etc.). This is **not an official list**.
- **Seed incident reports**: synthetic and labelled "demo record". User-submitted reports are real app state, held in memory.
- **Live**: Open-Meteo weather, OSRM public routing demo server (driving profile), OpenStreetMap tiles (© OpenStreetMap contributors).
- **Research**: SafetiPin Women's Safety Audit parameters; CommuniSense (arXiv:1506.07327); privacy-preserving crowd safe routing (arXiv:2112.13760); Google Maps fake-review enforcement reports.
