# Margdarshak — Implementation Plan

> **Margdarshak** (मार्गदर्शक, "the one who shows the way"): a city companion for Pune that doesn't just show you places. It tells you **which information to trust, and how safe each route is right now.**

## 1. Case study: what the problem statement really asks for

The PS lists five pillars (Exploration, History & Culture, Safety, Best vs Worst, Smart City Insights). The key phrase is:
**"convert scattered information into *verified*, actionable insights."**

Most teams will build "a map + a chatbot + a list of attractions". That's the commodity version. The research points to three real-world gaps that nobody has solved together:

| Gap (real world) | Evidence | What we do differently |
|---|---|---|
| **Trust gap**: crowd data and reviews are unreliable | Google removed 240M+ fake reviews in 2024. Tourist areas are the densest targets. Crowdsourced safety data is called "a tricky business" (SafetiPin coverage) | A **Trust Engine**: every citizen report gets a 0–100 trust score from corroboration, recency decay, official-data cross-checks and photo↔text consistency. Inspired by CommuniSense (Nairobi, 92% verification agreement) and the Jalisco Safety Index |
| **Safety is time-blind**: maps optimise only for speed | Indian navigation apps have led people into rivers and deserted roads. Pune has 20 city / 110+ wider black spots (Pune Police, Jan 2026). Perceived safety depends on lighting, crowd, visibility (SafetiPin's 9-parameter audit) | **Time-aware route safety**: the same road scores differently at 2 PM and 11 PM. Fastest vs Safest routes come with a plain-language "why" |
| **Scattered signals**: weather, traffic, reports and reviews live in separate apps | PS lists traffic, weather, reports, photos, voice notes and social media as inputs | **City Pulse**: one fused, verified view, with Gemini turning messy multimodal input (voice note, photo, text in Marathi/Hindi/English) into structured incidents |

## 2. The product (what judges will see)

1. **Safe Route** *(hero feature)*: pick A → B. Get 2–3 alternatives (OSRM) scored 0–100 for safety *at the chosen time*, using accident black spots, verified live reports, night lighting (OSM `lit`), and proximity to police/hospitals. Gemini explains it: *"Route B is 4 min longer but avoids 2 accident black spots and an unlit 600 m stretch."*
2. **Report & Verify**: upload a photo, record a voice note or type text. **Gemini multimodal + structured JSON** returns {type, severity, summary, location hint}. The **Trust Engine** scores it, and it appears on the map with a trust badge. Example: a "waterlogging" report is auto-corroborated if Open-Meteo shows rain in the last 3 h.
3. **Explore (grounded)**: ask *"hidden veg breakfast spots near Shaniwar Wada under ₹150"* or *"heritage walk in Kasba Peth"*. Uses **Gemini + Grounding with Google Maps**: real places with citations, never hallucinated lists.
4. **Best vs Worst Compare**: put 2–3 places side by side on safety, cleanliness, affordability, rating and accessibility. Ratings use a **Bayesian average** (a 4.9★ with 12 reviews ranks below a 4.4★ with 3,000), which flags suspicious reviews. Gemini gives a verdict.
5. **City Pulse**: live weather alerts, active verified reports, and a "Chaos Index" for the city right now.

## 3. Architecture

```
Browser (vanilla JS ES modules + Leaflet/OSM, semantic HTML, WCAG AA)
   │  fetch /api/*
Express server (Node 25) ── helmet, rate-limit, zod validation, compression
   ├─ /api/route     → OSRM alternatives → safetyEngine.scoreRoute() → Gemini explain
   ├─ /api/report    → Gemini multimodal (image/audio/text → JSON) → trustEngine.score()
   ├─ /api/explore   → Gemini + googleMaps grounding tool → places + citations
   ├─ /api/compare   → bayesianRating + metrics → Gemini verdict
   └─ /api/pulse     → Open-Meteo + reports store → chaos index
Data: seeded Pune dataset (heritage, black-spot corridors, police/hospitals) + in-memory report store (Firestore = stretch)
Deploy: Cloud Run (Dockerfile) · Google Fonts
```

**Pure, unit-testable core:** `safetyEngine`, `trustEngine`, `bayesianRating`, `geo` (haversine, polyline sampling). Gemini calls are behind one small client with a timeout, a cache and graceful fallbacks, so the app still works if the AI is slow.

## 4. Scoring the AI evaluator's seven criteria (checklist)

- **Problem alignment**: all 5 pillars covered, the "verified" keyword is the headline, and it's Pune-specific.
- **Code quality**: small modules, JSDoc, consistent naming, ESLint-clean, no dead code.
- **Security**: helmet CSP, rate limiting, zod on every input, upload size/type limits, key only in env, `.env.example`, no user HTML rendered (textContent only).
- **Efficiency**: one Gemini call per request, LRU cache, request timeouts, no build step, small static assets.
- **Testing**: vitest + supertest. Engine maths, validation edges, API routes with Gemini mocked.
- **Accessibility**: landmarks, labels, keyboard navigation, focus rings, `aria-live` results, AA contrast, non-map text alternatives for every map result.
- **Google services**: Gemini (multimodal, structured output, Maps grounding), Cloud Run, Google Fonts, Firestore (stretch).

## 5. Timeline (submission closes 2:00 PM IST)

| Time | Work |
|---|---|
| 11:00–11:15 | Plan approved · keys in `.env` · gcloud installing in the background |
| 11:15–11:35 | Scaffold: Express, security middleware, Gemini client, test harness, seed data |
| 11:35–12:15 | **Safe Route** + safety engine + trust engine + tests + map UI |
| 12:15–12:45 | **Report & Verify** (multimodal) + **Explore** (Maps grounding) |
| 12:45–13:05 | Compare + City Pulse + accessibility pass |
| 13:05–13:25 | Deploy to Cloud Run · README (criteria → code map, prompt design) |
| 13:25–13:45 | Full test run, final review, push, **submit by 13:45** |

**Cut order if behind:** City Pulse → Compare → voice notes. Safe Route, Trust Engine and Explore are non-negotiable.

## 6. Self-review: risks and mitigations

| Risk | Mitigation |
|---|---|
| gcloud not installed → can't reach Cloud Run | Install now in the background. Fallback: any free host. The repo still scores |
| Public OSRM/Overpass slow or down | Timeouts + cached seed data. Routes fall back to straight-line segments |
| Maps grounding unavailable for the key/model | Fall back to Gemini + seeded Pune places, labelled as such |
| Seed "black spot" data mistaken for official | Clearly labelled as demo data drawn from publicly reported corridors, with sources in the README |
| Scope creep | Strict cut order above. Deploy early, polish after |
