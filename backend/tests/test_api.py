"""API tests. External calls (OSRM, Open-Meteo, Gemini) are stubbed so tests are offline and deterministic."""

from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from app import main
from app.config import settings


@pytest.fixture
def client(monkeypatch):
    async def fake_routes(origin, dest):
        mid = ((origin[0] + dest[0]) / 2 + 0.002, (origin[1] + dest[1]) / 2)
        return [
            {"geometry": [origin, dest], "distance_m": 3000, "duration_s": 600},
            {"geometry": [origin, mid, dest], "distance_m": 3600, "duration_s": 720},
        ], "osrm"

    async def fake_weather(center):
        return {"available": True, "source": "Open-Meteo", "temperature_c": 28, "recent_rain_mm": 0.0, "next_6h_rain_mm": 0.0}

    monkeypatch.setattr(main, "fetch_routes", fake_routes)
    monkeypatch.setattr(main, "fetch_weather", fake_weather)
    monkeypatch.setattr(settings.__class__, "ai_enabled", property(lambda self: False))
    main._hits.clear()
    return TestClient(main.app)


def test_health_reports_ai_state(client):
    body = client.get("/api/health").json()
    assert body == {"status": "ok", "ai_enabled": False, "model": None}


def test_security_headers_present(client):
    res = client.get("/api/health")
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-Frame-Options"] == "DENY"
    assert "default-src 'self'" in res.headers["Content-Security-Policy"]


def test_places_filters(client):
    food = client.get("/api/places", params={"category": "food", "max_price": 1}).json()
    assert food and all(p["category"] == "food" and p["price_level"] == 1 for p in food)
    assert client.get("/api/places", params={"q": "peshwa"}).json()
    assert client.get("/api/places", params={"max_price": 9}).status_code == 422


def test_reports_have_trust_and_age(client):
    reps = client.get("/api/reports").json()
    assert reps
    assert all({"trust_score", "trust_label", "trust_reasons", "age"} <= r.keys() for r in reps)


def test_create_report_validates_and_scores(client):
    res = client.post("/api/reports", data={"category": "pothole", "description": "Deep pothole near signal", "lat": 18.52, "lng": 73.85})
    assert res.status_code == 201
    body = res.json()
    assert body["trust_label"] in {"Unverified", "Partially verified", "Corroborated"}
    assert body["ai_used"] is False
    assert any(r["id"] == body["id"] for r in client.get("/api/reports").json())


def test_create_report_rejects_location_outside_city(client):
    res = client.post("/api/reports", data={"category": "pothole", "description": "Somewhere else", "lat": 19.07, "lng": 72.87})
    assert res.status_code == 422


def test_create_report_rejects_bad_upload_type(client):
    res = client.post(
        "/api/reports",
        data={"category": "pothole", "description": "With a bad file", "lat": 18.52, "lng": 73.85},
        files={"photo": ("x.exe", b"MZ...", "application/octet-stream")},
    )
    assert res.status_code == 415


def test_create_report_rejects_short_description(client):
    res = client.post("/api/reports", data={"category": "pothole", "description": "x", "lat": 18.52, "lng": 73.85})
    assert res.status_code == 422


def test_routes_are_scored_and_labelled(client):
    res = client.post("/api/routes", json={
        "origin": {"lat": 18.5208, "lng": 73.8411}, "destination": {"lat": 18.5193, "lng": 73.8583}, "hour": 22,
    })
    assert res.status_code == 200
    body = res.json()
    assert body["is_night"] is True
    assert body["explanation_source"] == "rules"
    assert sum(r["is_fastest"] for r in body["routes"]) == 1
    assert sum(r["is_safest"] for r in body["routes"]) <= 1


def test_routes_reject_identical_endpoints(client):
    p = {"lat": 18.52, "lng": 73.85}
    assert client.post("/api/routes", json={"origin": p, "destination": p, "hour": 10}).status_code == 422


def test_compare_ranks_and_validates(client):
    ok = client.post("/api/compare", json={"place_ids": ["vaishali", "roopali"]})
    assert ok.status_code == 200 and [r["rank"] for r in ok.json()] == [1, 2]
    assert client.post("/api/compare", json={"place_ids": ["vaishali"]}).status_code == 422
    assert client.post("/api/compare", json={"place_ids": ["vaishali", "nope"]}).status_code == 404
    assert client.post("/api/compare", json={"place_ids": ["vaishali", "vaishali"]}).status_code == 422


def test_assistant_rule_fallback_is_labelled(client):
    body = client.post("/api/assistant", json={"query": "street food under 200"}).json()
    assert body["engine"] == "rules"
    assert body["place_ids"]


def test_assistant_hazard_query_never_claims_safety(client):
    body = client.post("/api/assistant", json={"query": "any road hazards?"}).json()
    assert "safe" not in body["answer"].lower() or "does not mean" in body["answer"].lower()


def test_assistant_rejects_empty_query(client):
    assert client.post("/api/assistant", json={"query": "  "}).status_code == 422


def test_pulse_summarises_state(client):
    body = client.get("/api/pulse").json()
    assert 0 <= body["chaos_index"] <= 100
    assert body["weather"]["available"] is True


def test_rate_limit_returns_429(client, monkeypatch):
    monkeypatch.setattr(main, "settings", replace(settings, rate_limit_per_minute=2))
    codes = [client.post("/api/assistant", json={"query": "heritage"}).status_code for _ in range(3)]
    assert codes == [200, 200, 429]
