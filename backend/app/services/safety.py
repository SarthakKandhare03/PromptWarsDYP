"""Time-aware route safety scoring.

A route is sampled every ~150 m. Each sample picks up risk from nearby
accident-prone corridors and trusted, fresh incident reports, and support from
nearby police stations / hospitals. Night travel amplifies risk (SafetiPin's
audits show lighting and "eyes on the street" drop sharply after dark).

If a route has no data near it, the score is `None`: "Insufficient data" is
shown instead of pretending the route is safe.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from datetime import datetime

from app.models import Report, RouteFactor
from app.services.geo import LatLng, haversine_m, sample_path

ZONE_RADIUS_M = 400.0
REPORT_RADIUS_M = 250.0
SUPPORT_RADIUS_M = 800.0
DATA_COVERAGE_RADIUS_M = 2500.0
REPORT_HALF_LIFE_H = 12.0
NIGHT_MULTIPLIER = 1.4


def is_night(hour: int) -> bool:
    return hour >= 20 or hour < 6


def decay(created_at: datetime, now: datetime) -> float:
    """Exponential freshness weight: 1.0 now, 0.5 after one half-life."""
    age_h = max(0.0, (now - created_at).total_seconds() / 3600)
    return math.pow(0.5, age_h / REPORT_HALF_LIFE_H)


def score_route(
    path: Sequence[LatLng],
    hour: int,
    reports: Sequence[Report],
    zones: Sequence[tuple[str, float, float]],
    support: Sequence[tuple[str, str, float, float]],
    now: datetime,
) -> tuple[int | None, str, list[RouteFactor]]:
    """Return (score 0-100 or None, confidence, factors)."""
    samples = sample_path(path)
    if not samples:
        return None, "low", [RouteFactor(label="Empty route", impact=0, kind="missing")]

    night = is_night(hour)
    mult = NIGHT_MULTIPLIER if night else 1.0
    factors: list[RouteFactor] = []
    risk = 0.0

    # Accident-prone corridors: count each zone once, at its closest approach.
    for name, lat, lng in zones:
        closest = min(haversine_m(s, (lat, lng)) for s in samples)
        if closest <= ZONE_RADIUS_M:
            impact = 14 * (1 - closest / ZONE_RADIUS_M / 2) * mult
            risk += impact
            factors.append(RouteFactor(label=f"Passes accident-prone corridor: {name}", impact=-round(impact, 1), kind="risk"))

    # Live reports, weighted by trust and freshness.
    for rep in reports:
        closest = min(haversine_m(s, (rep.lat, rep.lng)) for s in samples)
        if closest > REPORT_RADIUS_M:
            continue
        weight = (rep.trust_score / 100) * decay(rep.created_at, now)
        if weight < 0.05:
            continue
        impact = rep.severity * 6 * weight * mult
        risk += impact
        factors.append(RouteFactor(
            label=f"{rep.category.value.title()} reported nearby ({rep.trust_label.lower()})",
            impact=-round(impact, 1), kind="risk",
        ))

    # Support: share of the route within reach of police or hospital.
    covered = sum(
        1 for s in samples if any(haversine_m(s, (lat, lng)) <= SUPPORT_RADIUS_M for _, _, lat, lng in support)
    )
    coverage = covered / len(samples)
    support_bonus = round(10 * coverage, 1)
    if support_bonus > 0:
        factors.append(RouteFactor(
            label=f"{round(coverage * 100)}% of route within 800 m of police/hospital", impact=support_bonus, kind="support",
        ))

    if night:
        factors.append(RouteFactor(label="Night travel: risks weighted x1.4", impact=0, kind="risk"))
    factors.append(RouteFactor(label="Street-lighting data not available for scoring", impact=0, kind="missing"))

    # Data coverage: if nothing we know about is near the route, refuse to score.
    known_points = [(lat, lng) for _, lat, lng in zones] + [(r.lat, r.lng) for r in reports] + [
        (lat, lng) for _, _, lat, lng in support
    ]
    near = sum(1 for p in known_points if min(haversine_m(s, p) for s in samples[:: max(1, len(samples) // 20)]) <= DATA_COVERAGE_RADIUS_M)
    if near == 0:
        return None, "low", factors + [RouteFactor(label="No data near this route", impact=0, kind="missing")]

    confidence = "high" if near >= 6 else "medium" if near >= 3 else "low"
    score = max(0, min(100, round(100 - risk + support_bonus - 10)))
    return score, confidence, factors
