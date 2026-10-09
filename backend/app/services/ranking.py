"""Place comparison with user-chosen priorities.

Ratings use a Bayesian average so a 4.9 from 12 reviews does not beat a 4.4
from 3,000 reviews, a simple, explainable guard against thin or gamed reviews.
Dimensions with no data are reported as missing and excluded from the
weighted total instead of being guessed.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.models import CompareWeights, Place, Report
from app.services.geo import haversine_m

PRIOR_MEAN = 4.0
PRIOR_WEIGHT = 200
NEARBY_REPORT_M = 400.0
THIN_REVIEWS = 50


def bayesian_rating(rating: float | None, count: int | None, prior: float = PRIOR_MEAN, m: int = PRIOR_WEIGHT) -> float | None:
    if rating is None or not count:
        return None
    return (count * rating + m * prior) / (count + m)


def dimension_scores(place: Place, reports: Sequence[Report]) -> dict[str, float | None]:
    """Each dimension normalised to 0-100, or None when data is missing."""
    bayes = bayesian_rating(place.rating, place.review_count)
    nearby = [
        r for r in reports if haversine_m((r.lat, r.lng), (place.lat, place.lng)) <= NEARBY_REPORT_M and r.trust_score >= 40
    ]
    return {
        "affordability": round((4 - place.price_level) / 3 * 100, 1),
        "rating": round((bayes - 1) / 4 * 100, 1) if bayes is not None else None,
        "accessibility": None if place.wheelchair is None else (100.0 if place.wheelchair else 20.0),
        "cleanliness": round(place.cleanliness / 5 * 100, 1) if place.cleanliness is not None else None,
        "safety": round(max(0.0, 100 - 15 * sum(r.severity for r in nearby)), 1),
    }


def compare(places: Sequence[Place], weights: CompareWeights, reports: Sequence[Report]) -> list[dict]:
    w = weights.model_dump()
    results = []
    for p in places:
        dims = dimension_scores(p, reports)
        used = {k: v for k, v in dims.items() if v is not None and w[k] > 0}
        total_w = sum(w[k] for k in used)
        overall = round(sum(v * w[k] for k, v in used.items()) / total_w, 1) if total_w else None
        flags = []
        if p.review_count is not None and p.review_count < THIN_REVIEWS:
            flags.append(f"Only {p.review_count} reviews: rating adjusted toward city average")
        results.append(
            {
                "place": p.model_dump(),
                "dimensions": dims,
                "missing": [k for k, v in dims.items() if v is None],
                "weighted_score": overall,
                "bayesian_rating": round(bayesian_rating(p.rating, p.review_count) or 0, 2) or None,
                "flags": flags,
            }
        )
    results.sort(key=lambda r: (r["weighted_score"] is None, -(r["weighted_score"] or 0)))
    for i, r in enumerate(results):
        r["rank"] = i + 1
    return results
