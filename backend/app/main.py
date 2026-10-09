"""CityPulse AI API: FastAPI app serving the JSON API and the built React frontend."""

from __future__ import annotations

import logging
import time
import uuid
from collections import defaultdict, deque

from fastapi import FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.data.pune import ACCIDENT_ZONES, CITY, MANACHE_GANPATI, PLACES, PLACES_BY_ID, SUPPORT_POINTS
from app.models import (
    VOTER_ID_PATTERN,
    AssistantRequest,
    CompareRequest,
    Coord,
    PlaceCategory,
    Report,
    ReportCategory,
    RouteRequest,
    RouteResponse,
    ScoredRoute,
    VoteRequest,
)
from app.services import gemini
from app.services.assistant import match_place_ids, rule_based_answer
from app.services.external import fetch_routes, fetch_weather
from app.services.ranking import compare
from app.services.safety import is_night, score_route
from app.services.trust import freshness
from app.store import store, utcnow

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
AUDIO_TYPES = {"audio/webm", "audio/ogg", "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-wav"}

app = FastAPI(title="CityPulse AI", version="1.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware, allow_origins=list(settings.allowed_origins), allow_methods=["GET", "POST"], allow_headers=["Content-Type"],
)

_hits: dict[str, deque[float]] = defaultdict(deque)
_last_prune = time.monotonic()
MAX_BODY_BYTES = 6 * 1024 * 1024  # one 5 MB upload + form fields
log = logging.getLogger("punyat-kay")


def _prune_rate_limits(now: float) -> None:
    """Drop idle IP buckets so the limiter cannot be used to grow memory without bound."""
    global _last_prune
    if now - _last_prune < 60:
        return
    _last_prune = now
    for ip in [ip for ip, w in _hits.items() if not w or now - w[-1] > 60]:
        del _hits[ip]

GOOGLE_MAPS_SRC = "https://maps.googleapis.com https://maps.gstatic.com"
CSP = (
    "default-src 'self'; "
    "img-src 'self' data: blob: https://tile.openstreetmap.org https://thumb.wikimedia.org https://upload.wikimedia.org "
    f"{GOOGLE_MAPS_SRC} https://*.googleapis.com https://*.gstatic.com https://*.ggpht.com; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; "
    f"script-src 'self' {GOOGLE_MAPS_SRC}; connect-src 'self' {GOOGLE_MAPS_SRC} https://*.googleapis.com; "
    "media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'"
)


@app.middleware("http")
async def security_and_rate_limit(request: Request, call_next):
    """Request id, body-size guard, per-IP sliding-window rate limit, security + cache headers."""
    started = time.monotonic()
    request_id = request.headers.get("x-request-id", "")[:64] or uuid.uuid4().hex[:16]
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > MAX_BODY_BYTES:
        return JSONResponse({"detail": "Request body too large."}, status_code=413, headers={"X-Request-ID": request_id})
    if request.url.path.startswith("/api/") and request.method == "POST":
        ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        _prune_rate_limits(now)
        window = _hits[ip]
        while window and now - window[0] > 60:
            window.popleft()
        if len(window) >= settings.rate_limit_per_minute:
            return JSONResponse({"detail": "Too many requests, slow down."}, status_code=429,
                                headers={"Retry-After": "60", "X-Request-ID": request_id})
        window.append(now)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    path = request.url.path
    if path.startswith("/assets/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"  # hashed filenames
    elif path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "no-store")
    if path.startswith("/api/"):
        log.info("%s %s %s %.0fms id=%s", request.method, path, response.status_code, (time.monotonic() - started) * 1000, request_id)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(self), microphone=(self)"
    response.headers["Content-Security-Policy"] = CSP
    return response


# ---------- read endpoints ----------

@app.get("/api/health")
async def health():
    return {"status": "ok", "ai_enabled": settings.ai_enabled, "model": settings.gemini_model if settings.ai_enabled else None}


@app.get("/api/config")
async def client_config():
    """Browser-safe config. A Maps JS key is public by design and must be HTTP-referrer restricted."""
    return {"google_maps_key": settings.google_maps_key}


@app.get("/api/city")
async def city():
    return {
        **CITY,
        "accident_zones": [{"name": n, "lat": la, "lng": lo} for n, la, lo in ACCIDENT_ZONES],
        "support_points": [{"name": n, "kind": k, "lat": la, "lng": lo} for n, k, la, lo in SUPPORT_POINTS],
        "manache_ganpati": MANACHE_GANPATI,
        "data_notice": "Places are real; ratings, prices and accessibility values are illustrative demo data. "
        "Accident corridors are approximate points on publicly reported corridors, not an official list.",
    }


@app.get("/api/places")
async def places(
    category: PlaceCategory | None = None,
    q: str | None = Query(default=None, max_length=100),
    max_price: int | None = Query(default=None, ge=1, le=4),
    min_rating: float | None = Query(default=None, ge=0, le=5),
    wheelchair: bool | None = None,
):
    result = PLACES
    if category:
        result = [p for p in result if p.category == category]
    if q:
        ql = q.lower()
        result = [p for p in result if ql in f"{p.name} {p.area} {' '.join(p.tags)} {p.summary}".lower()]
    if max_price:
        result = [p for p in result if p.price_level <= max_price]
    if min_rating is not None:
        result = [p for p in result if (p.rating or 0) >= min_rating]
    if wheelchair:
        result = [p for p in result if p.wheelchair]
    return result


def _report_view(r: Report) -> dict:
    return {**r.model_dump(mode="json", exclude={"reporter_id"}), "age": freshness(r.created_at, utcnow())}


@app.get("/api/reports")
async def reports():
    """Active (unresolved, last 72 h) reports. History is used for learning, not shown as live."""
    return [_report_view(r) for r in store.active()]


@app.post("/api/reports/{report_id}/vote")
async def vote(report_id: str, req: VoteRequest):
    try:
        report = store.vote(report_id, req.voter_id, req.vote)
    except KeyError:
        raise HTTPException(404, "Report not found.") from None
    except PermissionError as exc:
        raise HTTPException(403, str(exc)) from None
    return _report_view(report)


@app.get("/api/insights/hotspots")
async def hotspots(hour: int | None = Query(default=None, ge=0, le=23)):
    """Learned recurring-issue cells, optionally for one time-of-day band."""
    return {
        "model": store.model.summary(),
        "hotspots": [h.__dict__ for h in store.model.hotspots(hour)],
        "notice": "Learned from community reports (including labelled demo history). Patterns, not predictions.",
    }


@app.get("/api/pulse")
async def pulse():
    weather = await fetch_weather(CITY["center"])
    store.set_recent_rain(weather.get("recent_rain_mm"))
    reps = store.active()
    now = utcnow()
    last_24h = [r for r in reps if (now - r.created_at).total_seconds() < 86400]
    by_cat: dict[str, int] = defaultdict(int)
    for r in last_24h:
        by_cat[r.category.value] += 1
    trusted = [r for r in last_24h if r.trust_score >= 70]
    # Chaos index: trusted, severe, fresh signals. Explained, bounded, never "safe".
    chaos = min(100, round(sum(r.severity * r.trust_score / 100 * 12 for r in last_24h)
                           + (15 if (weather.get("next_6h_rain_mm") or 0) >= 2 else 0)))
    return {
        "weather": weather,
        "reports_24h": len(last_24h),
        "trusted_24h": len(trusted),
        "by_category": by_cat,
        "chaos_index": chaos,
        "latest_report_at": reps[0].created_at.isoformat() if reps else None,
        "demo_reports": sum(1 for r in last_24h if r.demo),
        "generated_at": now.isoformat(),
    }


# ---------- write / compute endpoints ----------

@app.post("/api/reports", status_code=201)
async def create_report(
    category: ReportCategory = Form(...),
    description: str = Form(..., min_length=5, max_length=1000),
    lat: float = Form(...),
    lng: float = Form(...),
    photo: UploadFile | None = File(default=None),
    audio: UploadFile | None = File(default=None),
    reporter_id: str | None = Form(default=None, pattern=VOTER_ID_PATTERN),
):
    if not Coord(lat=lat, lng=lng).in_city():
        raise HTTPException(422, "Location must be within Pune.")
    image_blob = await _read_upload(photo, IMAGE_TYPES, "photo")
    audio_blob = await _read_upload(audio, AUDIO_TYPES, "audio")

    analysis = None
    if settings.ai_enabled:
        analysis = await gemini.analyze_report(category.value, description, image_blob, audio_blob)

    final_cat = category
    severity = 2
    if analysis:
        try:
            final_cat = ReportCategory(analysis.category)
        except ValueError:
            pass
        severity = analysis.severity

    report = Report(
        id=f"r-{uuid.uuid4().hex[:10]}",
        category=final_cat,
        description=description.strip(),
        lat=lat,
        lng=lng,
        created_at=utcnow(),
        severity=severity,
        has_photo=image_blob is not None,
        has_audio=audio_blob is not None,
        ai_summary=analysis.summary if analysis else None,
        ai_consistency=analysis.media_consistency if analysis and (image_blob or audio_blob) else None,
        reporter_id=reporter_id,
    )
    store.add(report)
    return {**_report_view(report), "ai_used": analysis is not None, "language": analysis.language if analysis else None}


async def _read_upload(upload: UploadFile | None, allowed: set[str], label: str) -> tuple[bytes, str] | None:
    if upload is None or not upload.filename:
        return None
    mime = (upload.content_type or "").split(";")[0].strip()
    if mime not in allowed:
        raise HTTPException(415, f"Unsupported {label} type: {mime or 'unknown'}")
    data = await upload.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(413, f"{label.title()} exceeds {settings.max_upload_bytes // (1024 * 1024)} MB")
    return (data, mime) if data else None


@app.post("/api/routes", response_model=RouteResponse)
async def routes(req: RouteRequest):
    origin, dest = (req.origin.lat, req.origin.lng), (req.destination.lat, req.destination.lng)
    raw, source = await fetch_routes(origin, dest)
    now = utcnow()
    reps = store.active()
    scored: list[ScoredRoute] = []
    for i, r in enumerate(raw):
        score, confidence, factors = score_route(
            r["geometry"], req.hour, reps, ACCIDENT_ZONES, SUPPORT_POINTS, now, hotspots=store.model,
        )
        scored.append(ScoredRoute(
            id=f"route-{i}", geometry=r["geometry"], distance_m=round(r["distance_m"]), duration_s=round(r["duration_s"]),
            safety_score=score, confidence=confidence, factors=factors,
        ))
    min(scored, key=lambda s: s.duration_s).is_fastest = True
    rated = [s for s in scored if s.safety_score is not None]
    if rated:
        max(rated, key=lambda s: (s.safety_score, -s.duration_s)).is_safest = True

    summary = [
        {
            "name": f"Route {chr(65 + i)}", "minutes": round(s.duration_s / 60), "km": round(s.distance_m / 1000, 1),
            "safety_score": s.safety_score, "risks": [f.label for f in s.factors if f.kind == "risk" and f.impact < 0],
        }
        for i, s in enumerate(scored)
    ]
    explanation = await gemini.explain_routes(req.hour, summary, req.lang) if settings.ai_enabled else None
    return RouteResponse(
        routes=scored,
        explanation=explanation or _rules_explanation(summary),
        explanation_source="gemini" if explanation else "rules",
        routing_source=source,
        is_night=is_night(req.hour),
    )


def _rules_explanation(summary: list[dict]) -> str:
    if len(summary) == 1:
        s = summary[0]
        risks = len(s["risks"])
        return f"One route found ({s['minutes']} min). It passes {risks} known risk point(s). No alternative was available to compare."
    fastest = min(summary, key=lambda s: s["minutes"])
    rated = [s for s in summary if s["safety_score"] is not None]
    if not rated:
        return "Insufficient data to compare route safety."
    safest = max(rated, key=lambda s: s["safety_score"])
    if safest is fastest:
        return f"{fastest['name']} is both the fastest ({fastest['minutes']} min) and has the fewest known risks."
    extra = safest["minutes"] - fastest["minutes"]
    gap = safest["safety_score"] - (fastest["safety_score"] or 0)
    return (f"{safest['name']} takes about {extra} min longer than {fastest['name']} and scores {gap} point(s) "
            f"higher on known risks ({safest['safety_score']} vs {fastest['safety_score']}). "
            "Scores reflect only the data we have. Street lighting is not yet included.")


@app.post("/api/compare")
async def compare_places(req: CompareRequest):
    missing = [pid for pid in req.place_ids if pid not in PLACES_BY_ID]
    if missing:
        raise HTTPException(404, f"Unknown place id(s): {', '.join(missing)}")
    if len(set(req.place_ids)) != len(req.place_ids):
        raise HTTPException(422, "Place ids must be unique.")
    return compare([PLACES_BY_ID[pid] for pid in req.place_ids], req.weights, store.active())


@app.post("/api/assistant")
async def assistant(req: AssistantRequest):
    loc = (req.location.lat, req.location.lng) if req.location and req.location.in_city() else CITY["center"]
    reps = store.active()
    if settings.ai_enabled:
        brief = "; ".join(f"{r.category.value} near ({r.lat:.3f},{r.lng:.3f}) {r.trust_label}" for r in reps[:8])
        places_brief = "; ".join(
            f"{p.name} [{p.category.value}, {p.area}, {'₹' * p.price_level}, {', '.join(p.tags[:3])}]" for p in PLACES
        )
        history = " | ".join(f"{t.role}: {t.text[:300]}" for t in req.history[-6:])
        ai = await gemini.ask_assistant(req.query, loc, brief, places_brief, history, req.lang)
        if ai:
            if ai["engine"] == "gemini":
                ai["sources"] = [{"title": "Pune dataset (demo values)", "uri": ""}]
            return {**ai, "place_ids": match_place_ids(ai["answer"], PLACES), "report_ids": [],
                    "answered_at": utcnow().isoformat()}
    fallback = rule_based_answer(req.query, PLACES, reps)
    return {**fallback, "sources": [{"title": "Pune demo dataset", "uri": ""}],
            "engine": "rules", "answered_at": utcnow().isoformat()}


# ---------- frontend (built SPA) ----------

if settings.static_dir.is_dir():
    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(404)
        target = (settings.static_dir / path).resolve()
        if path and target.is_file() and settings.static_dir.resolve() in target.parents:
            return FileResponse(target)
        return FileResponse(settings.static_dir / "index.html")
