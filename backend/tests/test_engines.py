"""Unit tests for the pure scoring engines."""

from datetime import UTC, datetime, timedelta

import pytest

from app.data.pune import ACCIDENT_ZONES, PLACES_BY_ID, SUPPORT_POINTS
from app.models import CompareWeights, Report, ReportCategory, SourceType
from app.services import geo
from app.services.ranking import bayesian_rating, compare, dimension_scores
from app.services.safety import decay, is_night, score_route
from app.services.trust import TrustContext, label_for, score_report

NOW = datetime(2026, 10, 9, 12, 0, tzinfo=UTC)


def make_report(id="r1", cat=ReportCategory.waterlogging, lat=18.5010, lng=73.8640, hours_ago=0.5, **kw) -> Report:
    return Report(
        id=id, category=cat, description="test report", lat=lat, lng=lng, created_at=NOW - timedelta(hours=hours_ago), **kw
    )


# ---------- geo ----------


def test_haversine_known_distance():
    # Shaniwar Wada -> Aga Khan Palace is roughly 6 km.
    d = geo.haversine_m((18.5195, 73.8553), (18.5524, 73.9015))
    assert 5500 < d < 6500


def test_sample_path_spacing_and_endpoints():
    path = [(18.50, 73.85), (18.51, 73.85)]  # ~1.1 km
    samples = geo.sample_path(path, step_m=150)
    assert samples[0] == path[0] and samples[-1] == path[-1]
    assert 7 <= len(samples) <= 10


def test_sample_path_handles_degenerate_input():
    assert geo.sample_path([]) == []
    assert geo.sample_path([(18.5, 73.8)]) == [(18.5, 73.8)]


# ---------- trust engine ----------


def test_single_text_report_is_unverified():
    r = make_report()
    score, reasons = score_report(r, [r], TrustContext())
    assert score == 20
    assert label_for(score, r.source) == "Unverified"
    assert reasons


def test_evidence_and_corroboration_raise_trust():
    a = make_report("a", has_photo=True)
    b = make_report("b", lat=18.5015, lng=73.8642)
    c = make_report("c", lat=18.5008, lng=73.8645)
    score, reasons = score_report(a, [a, b, c], TrustContext())
    assert score == 20 + 15 + 24
    assert any("independent" in r for r in reasons)


def test_corroboration_ignores_far_old_or_different_reports():
    a = make_report("a")
    far = make_report("far", lat=18.55, lng=73.90)
    old = make_report("old", hours_ago=20)
    other = make_report("other", cat=ReportCategory.pothole)
    score, _ = score_report(a, [a, far, old, other], TrustContext())
    assert score == 20


def test_weather_cross_check_confirms_waterlogging():
    a = make_report("a")
    score, reasons = score_report(a, [a], TrustContext(recent_rain_mm=8.0))
    assert score == 40
    assert any("Weather" in r for r in reasons)


def test_rain_does_not_boost_unrelated_category():
    a = make_report("a", cat=ReportCategory.streetlight)
    score, _ = score_report(a, [a], TrustContext(recent_rain_mm=8.0))
    assert score == 20


def test_accident_zone_cross_check():
    name, lat, lng = ACCIDENT_ZONES[0]
    a = make_report("a", cat=ReportCategory.accident, lat=lat, lng=lng)
    score, reasons = score_report(a, [a], TrustContext(accident_zones=tuple(ACCIDENT_ZONES)))
    assert score == 30
    assert any(name in r for r in reasons)


def test_official_reports_are_labelled_official():
    a = make_report("a", source=SourceType.official)
    score, _ = score_report(a, [a], TrustContext())
    assert label_for(score, a.source) == "Official"


def test_trust_is_capped_at_100():
    reps = [make_report(f"r{i}", has_photo=True, has_audio=True, ai_consistency=1.0) for i in range(6)]
    score, _ = score_report(reps[0], reps, TrustContext(recent_rain_mm=20))
    assert score == 100


# ---------- safety engine ----------


@pytest.mark.parametrize("hour,night", [(22, True), (3, True), (6, False), (14, False), (19, False)])
def test_is_night(hour, night):
    assert is_night(hour) is night


def test_decay_halves_after_half_life():
    assert decay(NOW, NOW) == pytest.approx(1.0)
    assert decay(NOW - timedelta(hours=12), NOW) == pytest.approx(0.5)


def test_route_through_accident_zone_scores_lower_at_night():
    _, lat, lng = ACCIDENT_ZONES[1]
    path = [(lat - 0.005, lng), (lat + 0.005, lng)]
    day, _, _ = score_route(path, 14, [], ACCIDENT_ZONES, SUPPORT_POINTS, NOW)
    night, _, factors = score_route(path, 23, [], ACCIDENT_ZONES, SUPPORT_POINTS, NOW)
    assert day is not None and night is not None
    assert night < day
    assert any("accident-prone" in f.label for f in factors)


def test_trusted_report_on_route_lowers_score():
    path = [(18.4990, 73.8640), (18.5030, 73.8640)]
    clean, _, _ = score_route(path, 12, [], ACCIDENT_ZONES, SUPPORT_POINTS, NOW)
    rep = make_report("x", lat=18.5010, lng=73.8640, severity=3)
    rep.trust_score = 90
    risky, _, _ = score_route(path, 12, [rep], ACCIDENT_ZONES, SUPPORT_POINTS, NOW)
    assert risky < clean


def test_route_without_any_data_is_not_scored():
    path = [(18.70, 74.05), (18.71, 74.06)]  # far outside our data coverage
    score, confidence, factors = score_route(path, 12, [], ACCIDENT_ZONES, SUPPORT_POINTS, NOW)
    assert score is None
    assert confidence == "low"
    assert any(f.kind == "missing" for f in factors)


def test_missing_lighting_data_is_disclosed():
    path = [(18.5195, 73.8553), (18.5164, 73.8561)]
    _, _, factors = score_route(path, 21, [], ACCIDENT_ZONES, SUPPORT_POINTS, NOW)
    assert any("lighting" in f.label.lower() and f.kind == "missing" for f in factors)


# ---------- ranking ----------


def test_bayesian_rating_pulls_thin_reviews_toward_prior():
    thin = bayesian_rating(4.9, 12)
    thick = bayesian_rating(4.4, 3000)
    assert thin < thick
    assert bayesian_rating(None, 10) is None
    assert bayesian_rating(4.5, 0) is None


def test_missing_dimensions_are_none_not_guessed():
    dims = dimension_scores(PLACES_BY_ID["demo-stay-deccan"], [])
    assert dims["accessibility"] is None
    assert dims["cleanliness"] is None


def test_weights_change_ranking():
    places = [PLACES_BY_ID["roopali"], PLACES_BY_ID["george-restaurant"]]
    cheap_first = compare(places, CompareWeights(affordability=5, rating=0, accessibility=0, cleanliness=0, safety=0), [])
    assert cheap_first[0]["place"]["id"] == "roopali"
    assert [r["rank"] for r in cheap_first] == [1, 2]


def test_thin_review_flag():
    res = compare([PLACES_BY_ID["demo-stay-camp"], PLACES_BY_ID["vaishali"]], CompareWeights(), [])
    camp = next(r for r in res if r["place"]["id"] == "demo-stay-camp")
    assert camp["flags"]
