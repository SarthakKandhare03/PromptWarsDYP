<div align="center">

<img src="design/logo-512.png" alt="पुण्यात काय? logo" width="132" />

# पुण्यात काय?

### *"What's happening in Pune?"*

**Hidden places · verified city signals · smarter routes**: one living map of Pune that **learns from its people**.

[![Live demo](https://img.shields.io/badge/▶_Live_demo-Cloud_Run-111111?style=for-the-badge&labelColor=FFE14D)](https://punyat-kay-knd5p2vgxa-el.a.run.app)
[![CI](https://github.com/SarthakKandhare03/PromptWarsDYP/actions/workflows/ci.yml/badge.svg)](https://github.com/SarthakKandhare03/PromptWarsDYP/actions/workflows/ci.yml)

![Gemini](https://img.shields.io/badge/Gemini-3.5_Flash_·_TTS_·_Maps_grounding-4285F4?logo=googlegemini&logoColor=white)
![Cloud Run](https://img.shields.io/badge/Google_Cloud-Run_·_Build_·_Secret_Manager-4285F4?logo=googlecloud&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.13-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React_19-TypeScript_·_Vite-61DAFB?logo=react&logoColor=111)
![Tests](https://img.shields.io/badge/tests-62_pytest_·_11_vitest_·_46_e2e-2c8a3c)
![Languages](https://img.shields.io/badge/UI-English_·_हिंदी_·_मराठी-FF7A00)

**PromptWars × BRAIN DYPCOEI · Problem statement: *City Life: Exploring, Experiencing & Navigating the Chaos We Call Home***

</div>

---

<p align="center">
  <img src="docs/screenshots/landing.jpg" alt="Landing page with live 'Right now in Pune' panel" width="49%" />
  <img src="docs/screenshots/landing-marathi-dark.jpg" alt="Landing page in Marathi, dark mode" width="49%" />
</p>

> Most city apps show you places. **पुण्यात काय?** tells you **which information to trust** and **how risky a route is at the hour you travel**. When it doesn't know, it says **"Insufficient data"**.

## ✨ Why it's different

| | |
|---|---|
| 🛡️ **Trust Engine** | Every citizen report gets a **0–100 trust score with written reasons**: evidence, Gemini media↔text check, independent nearby reports, **live-weather cross-check**, accident corridors, **community votes** and **learned reporter reputation**. |
| 🛣️ **Fastest isn't always smartest** | Real road alternatives scored **for the hour you travel** (corridors, trusted reports, **learned hotspots**, distance to help). Gemini explains it, then **Navigate in Google Maps** follows *our* safer path. |
| 🧠 **A city that learns** | Spatio-temporal **hotspot model** (≈550 m cells × 5 time bands, 14-day memory) retrains on every report and vote. |
| 🗣️ **Your language, your voice** | Text / photo / voice reports in **मराठी · हिंदी · English**; the assistant **listens** and **talks back**; Gemini answers in your language. |
| 🌼 **Puneri soul** | **पुणेरी पाट्या**, the **दुपारी १ ते ४** advisory, **Ganeshotsav** *Manache Ganpati* darshan route, Gemini-TTS greeting *"नमस्कार पुणे! पुण्यामध्ये आपले स्वागत आहे."* |
| 🔍 **Honest by design** | No score means "safe"; demo data labelled; missing data shown as missing. |

<p align="center">
  <img src="docs/screenshots/safety.jpg" alt="Safe route with Gemini explanation" width="49%" />
  <img src="docs/screenshots/city-hindi-festival.jpg" alt="City page in Hindi with Ganeshotsav layer" width="49%" />
</p>
<p align="center">
  <img src="docs/screenshots/mobile-landing.jpg" alt="Mobile landing" width="24%" />
  <img src="docs/screenshots/mobile-city.jpg" alt="Mobile city in Marathi" width="24%" />
  <img src="docs/screenshots/mobile-safety.jpg" alt="Mobile safe route, dark" width="24%" />
</p>

## 📊 Evaluation at a glance

| Criterion | Evidence |
|---|---|
| **Problem statement alignment** | [`docs/PROBLEM_ALIGNMENT.md`](docs/PROBLEM_ALIGNMENT.md) maps every line of the brief to code |
| **Code quality** | Typed end to end (Pydantic + TypeScript); pure engines in `backend/app/services/*`; **ruff** (incl. bandit `S`) + **oxlint** clean; [CI](.github/workflows/ci.yml) |
| **Security** | [`SECURITY.md`](SECURITY.md): Secret Manager, CSP/HSTS, validation, upload allow-lists, rate limiting, body-size guard, prompt-injection fencing, non-root container |
| **Efficiency** | One Gemini call/request with fallback chain, LRU cache, timeouts; weather cache; GZip; lazy routes (≈148 KB gzipped entry); immutable assets; warm instance |
| **Testing** | **62 pytest** · **11 Vitest** · **46-check e2e** (390 px phone + desktop, [`e2e/smoke.mjs`](e2e/smoke.mjs), 46/46 live). Unit suites, lint and Docker build run in CI |
| **Accessibility** | Landmarks, skip link, labelled controls (e2e-audited), `aria-live`, keyboard, focus rings, AA contrast light/dark, reduced motion, captions, voice I/O, 3 languages |
| **Google services** | Gemini (multimodal, structured output, Maps grounding, TTS), Maps URLs + optional Maps JS, **Cloud Run**, **Cloud Build**, **Secret Manager**, Google Fonts |

## 🔁 From rumour to verified signal

```mermaid
flowchart LR
  A["📸 Report<br/>text · photo · voice"] --> B["✨ Gemini<br/>structured JSON"]
  B --> C{"🛡️ Trust Engine"}
  W["🌧️ Weather"] --> C
  Z["⚠️ Corridors"] --> C
  N["👥 Nearby reports"] --> C
  V["🗳️ Votes"] --> C
  R["🏅 Reputation"] --> C
  C --> T["0–100 trust + reasons"]
  T --> H["🧠 Hotspot model"]
  T --> S["🛣️ Safe-route scoring"]
  H --> S
  S --> G["📍 Google Maps"]
```

## 🏗️ Architecture

```mermaid
flowchart TB
  U["📱 React 19 PWA · EN/हिं/मरा · light/dark · voice"] -->|/api| F
  subgraph CR["☁️ Cloud Run · asia-south1"]
    F["⚡ FastAPI · validation · rate limit · CSP/HSTS"] --> E["Engines: trust · safety · ranking · learning"]
    F --> DB[("SQLite · reports · votes")]
  end
  SM["🔐 Secret Manager"] -.-> F
  F --> GM["✨ Gemini"]
  F --> OM["🌦️ Open-Meteo"]
  F --> OS["🛣️ OSRM"]
```

## 🚀 Run it

```bash
cd backend && python -m venv .venv && .venv/Scripts/activate && pip install -r requirements-dev.txt
cp ../.env.example ../.env   # add GEMINI_API_KEY (otherwise labelled rules mode)
uvicorn app.main:app --reload --port 8000
cd frontend && npm install && npm run dev        # http://localhost:5173
# quality gates
cd backend && ruff check . && python -m pytest
cd frontend && npm run lint && npm test && npm run build
cd e2e && npm install && node smoke.mjs
```

**Deploy:** `PROJECT=<gcp-project> GEMINI_API_KEY=<key> bash deploy/gcp/deploy.sh` (Cloud Build → Cloud Run, key in Secret Manager).

## 🙏 Data & honesty
Places are real; **ratings, prices, cleanliness and accessibility are demo values**. Accident corridors are approximate points on publicly reported corridors, **not an official list**. Seed incidents and learning history are synthetic and labelled *demo*. Weather: Open-Meteo · Routing: OSRM · Map © OpenStreetMap contributors · Photos: Wikimedia Commons · Voice: Gemini TTS.

<div align="center">

**चला, पुणे शोधूया.**

</div>
