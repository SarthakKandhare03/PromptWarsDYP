"""Tests for the self-learning layer: reputation, hotspot model, votes."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app import main
from app.config import settings
from app.data.pune import ACCIDENT_ZONES, SUPPORT_POINTS
from app.models import Report, ReportCategory
from app.services.learning import HotspotModel, band_for, reporter_reputation
from app.services.safety import score_route

NOW = datetime(2026, 10, 9, 12, 0, tzinfo=timezone.utc)
IST = timezone(timedelta(hours=5, minutes=30))


def rep(id, reporter=None, conf=0, disp=0, lat=18.5012, lng=73.8638, ist_hour=18, days_ago=3, trust=60, sev=2):
    when = (NOW.astimezone(IST) - timedelta(days=days_ago)).replace(hour=ist_hour).astimezone(timezone.utc)
    return Report(id=id, category=ReportCategory.waterlogging, description="x" * 6, lat=lat, lng=lng,
                  created_at=when, reporter_id=reporter, confirmations=conf, disputes=disp,
                  trust_score=trust, severity=sev)


@pytest.mark.parametrize("hour,band", [(3, "late night"), (9, "morning"), (14, "afternoon"), (19, "evening"), (23, "night")])
def test_band_for(hour, band):
    assert band_for(hour) == band


def test_reputation_beta_prior_and_updates():
    reps = [rep("a", "alice", conf=3), rep("b", "alice", conf=2), rep("c", "bob", disp=2), rep("d", "carol")]
    r = reporter_reputation(reps)
    assert r["alice"] == (3 / 4, 2)          # (2 good + 1) / (2 + 2)
    assert r["bob"] == (1 / 3, 1)            # (0 + 1) / (1 + 2)
    assert "carol" not in r                  # no judged reports -> nothing learned


def test_hotspot_model_learns_time_of_day_pattern():
    history = [rep(f"h{i}", ist_hour=18, days_ago=2 + i) for i in range(6)]
    model = HotspotModel().fit(history, NOW)
    w_evening, n, top = model.risk(18.5012, 73.8638, 18)
    w_morning, _, _ = model.risk(18.5012, 73.8638, 9)
    assert w_evening > 0.6 and n == 6 and top == "waterlogging"
    assert w_morning == 0
    assert model.hotspots(18) and not model.hotspots(9)


def test_hotspot_model_forgets_old_and_ignores_disputed():
    fresh = HotspotModel().fit([rep("a", days_ago=1)], NOW).risk(18.5012, 73.8638, 18)[0]
    stale = HotspotModel().fit([rep("a", days_ago=60)], NOW).risk(18.5012, 73.8638, 18)[0]
    disputed = HotspotModel().fit([rep("a", days_ago=1, disp=3)], NOW).risk(18.5012, 73.8638, 18)[0]
    assert fresh > stale * 10
    assert disputed == 0


def test_route_through_learned_hotspot_scores_lower_at_that_hour():
    model = HotspotModel().fit([rep(f"h{i}", ist_hour=18, days_ago=2) for i in range(6)], NOW)
    path = [(18.4990, 73.8638), (18.5035, 73.8638)]
    evening, _, factors = score_route(path, 18, [], ACCIDENT_ZONES, SUPPORT_POINTS, NOW, hotspots=model)
    morning, _, _ = score_route(path, 9, [], ACCIDENT_ZONES, SUPPORT_POINTS, NOW, hotspots=model)
    assert evening < morning
    assert any("Learned pattern" in f.label for f in factors)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings.__class__, "ai_enabled", property(lambda self: False))
    main._hits.clear()
    return TestClient(main.app)


def _new_report(client, reporter="reporter-0001"):
    res = client.post("/api/reports", data={"category": "pothole", "description": "Crater near the signal",
                                            "lat": 18.53, "lng": 73.86, "reporter_id": reporter})
    assert res.status_code == 201
    assert "reporter_id" not in res.json()  # anonymous id never leaks
    return res.json()


def test_confirm_votes_raise_trust_and_dispute_lowers(client):
    r = _new_report(client)
    up = client.post(f"/api/reports/{r['id']}/vote", json={"vote": "confirm", "voter_id": "voter-aaaa1"}).json()
    assert up["confirmations"] == 1 and up["trust_score"] > r["trust_score"]
    down = client.post(f"/api/reports/{r['id']}/vote", json={"vote": "dispute", "voter_id": "voter-aaaa1"}).json()
    assert down["confirmations"] == 0 and down["disputes"] == 1   # one vote per voter (changed mind)
    assert down["trust_score"] < r["trust_score"]


def test_cannot_vote_on_own_report(client):
    r = _new_report(client, reporter="selfvoter-01")
    res = client.post(f"/api/reports/{r['id']}/vote", json={"vote": "confirm", "voter_id": "selfvoter-01"})
    assert res.status_code == 403


def test_two_resolved_votes_close_report(client):
    r = _new_report(client)
    for v in ("resolver-001", "resolver-002"):
        client.post(f"/api/reports/{r['id']}/vote", json={"vote": "resolved", "voter_id": v})
    assert all(x["id"] != r["id"] for x in client.get("/api/reports").json())


def test_vote_validation(client):
    assert client.post("/api/reports/nope/vote", json={"vote": "confirm", "voter_id": "voter-aaaa1"}).status_code == 404
    r = _new_report(client)
    assert client.post(f"/api/reports/{r['id']}/vote", json={"vote": "like", "voter_id": "voter-aaaa1"}).status_code == 422
    assert client.post(f"/api/reports/{r['id']}/vote", json={"vote": "confirm", "voter_id": "x"}).status_code == 422


def test_hotspots_endpoint_exposes_trained_model(client):
    body = client.get("/api/insights/hotspots").json()
    assert body["model"]["samples"] > 30 and body["model"]["trained_at"]
    assert body["hotspots"]
    assert client.get("/api/insights/hotspots", params={"hour": 30}).status_code == 422


def test_reputation_feeds_back_into_trust(client):
    reporter = "trusted-rep-01"
    for i in range(2):
        r = _new_report(client, reporter=reporter)
        for v in ("fan-0001", "fan-0002"):
            client.post(f"/api/reports/{r['id']}/vote", json={"vote": "confirm", "voter_id": f"{v}-{i}"})
    fresh = _new_report(client, reporter=reporter)
    assert any("track record" in t for t in fresh["trust_reasons"])


def test_single_report_is_not_a_pattern():
    model = HotspotModel().fit([rep("solo", ist_hour=18, trust=100, sev=3)], NOW)
    assert model.risk(18.5012, 73.8638, 18)[0] > 0.6   # weight is high...
    assert model.hotspots(18) == []                     # ...but one report is not "recurring"
