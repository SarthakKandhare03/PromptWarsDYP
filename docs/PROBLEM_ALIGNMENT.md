# Problem statement alignment

> **City Life: Exploring, Experiencing & Navigating the Chaos We Call Home**
> Build a smart, interactive city exploration platform that transforms real-world city data into useful insights and recommendations … convert scattered information into **verified, actionable insights** … a functional web or mobile app that makes city exploration smarter, safer, and more enjoyable.

**पुण्यात काय?** ("What's happening in Pune?") covers every requirement below. Each row links to the code that implements it.

## The five required pillars

| Requirement (from the problem statement) | How पुण्यात काय? delivers it | Code |
|---|---|---|
| **Exploration & Hospitality**: tourist attractions, local food, hotels, budget-friendly places | Explore page with category / price / rating / distance / wheelchair filters, saved places, list-map-split views, real Pune places with photos; Gemini assistant (grounded in Google Maps) for "street food under ₹200 near FC Road" style questions | `frontend/src/pages/ExplorePage.tsx`, `backend/app/data/pune.py`, `backend/app/services/gemini.py` |
| **History & Culture**: landmarks, heritage sites, local traditions | Heritage places (Shaniwar Wada, Lal Mahal, Pataleshwar, Tambat Ali…), **Ganeshotsav mode** with the five *Manache Ganpati* darshan route, Puneri signboard culture (*पुणेरी पाट्या*), the 1-4 PM afternoon-break advisory | `frontend/src/pages/HomePage.tsx`, `frontend/src/components/PuneriPati.tsx`, `MANACHE_GANPATI` in `backend/app/data/pune.py` |
| **Safety & Security**: unsafe areas, accident-prone zones, safer routes | Time-aware **Safe Route**: real road alternatives scored for the travel hour using accident-prone corridors, trusted live reports, **learned hotspots** and distance to police/hospitals; "Insufficient data" instead of fake scores; handoff to Google Maps along the safer path | `backend/app/services/safety.py`, `frontend/src/pages/SafetyPage.tsx`, `frontend/src/gmaps.ts` |
| **Best vs Worst Places**: compare on safety, cleanliness, affordability, ratings, accessibility | Compare 2–4 places with user-set weights across exactly those five dimensions; Bayesian ratings expose thin/gamed reviews; missing data shown as missing | `backend/app/services/ranking.py`, `frontend/src/pages/ComparePage.tsx` |
| **Smart City Insights**: traffic updates, weather alerts, citizen reports, photos, voice notes, social media data | Citizen reports by **text, photo or voice** (Gemini multimodal → structured JSON, Marathi/Hindi/English); live **weather** (Open-Meteo) used to *verify* waterlogging; **City Pulse** chaos index; incident timeline; community votes | `backend/app/main.py` (`/api/reports`, `/api/pulse`), `frontend/src/pages/ReportPage.tsx`, `frontend/src/components/CityPulse.tsx` |

## "Verified, actionable insights": the core of the brief

| Brief | Implementation |
|---|---|
| *verified* | **Trust Engine**: 0–100 score with written reasons from evidence, AI media↔text consistency, independent nearby reports, weather and accident-corridor cross-checks, **community votes**, and a **learned reporter reputation** (Beta prior). Labels: Official / Corroborated / Partially verified / Unverified. (`backend/app/services/trust.py`, `learning.py`) |
| *actionable* | Safer route + "Navigate in Google Maps", Street View before you go, Explore → Show on map, Report → see it on the safety map, assistant answers that highlight places on the map. |
| *scattered information* | One fused view: places, reports, weather, accident corridors, learned hotspots and Gemini answers on a single map and in the City Pulse. |

## Required technologies

| Technology named in the brief | Used for |
|---|---|
| **AI/ML** | Gemini (multimodal report analysis, structured output, route explanations, multi-turn assistant, TTS greeting); self-learning **hotspot model** (spatio-temporal, time-decayed) and reporter reputation |
| **NLP** | Marathi / Hindi / English report understanding, translation to neutral summaries, language-aware answers, voice input (speech recognition) and read-aloud |
| **Geolocation & interactive maps** | Leaflet/OpenStreetMap + optional Google Maps JS, OSRM routing, haversine/path sampling, map pinning for reports |
| **APIs** | Gemini API, Google Maps grounding + Maps URLs, Open-Meteo, OSRM, Wikimedia images |
| **Data analytics** | Trust scoring, Bayesian ranking, chaos index, hotspot learning, route risk factors |

## Built for Pune, honestly
- Places are real; ratings, prices and accessibility values are labelled **demo**. Seed incidents are labelled **demo records**.
- A score never means "safe". No data shows **"Insufficient data"**.
- English · हिंदी · मराठी across the UI and AI answers; light/dark themes; installable PWA; tested on a 390 px phone and on desktop.
