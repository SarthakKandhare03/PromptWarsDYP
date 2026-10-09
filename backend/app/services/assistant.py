"""Rule-based assistant used when Gemini is not configured or fails.

It is labelled as such in the response. It never claims a model answered.
"""

from __future__ import annotations

import re
from collections.abc import Sequence

from app.models import Place, PlaceCategory, Report

CATEGORY_WORDS = {
    PlaceCategory.food: ("food", "eat", "street food", "misal", "breakfast", "lunch", "dinner", "biryani", "sweet"),
    PlaceCategory.cafe: ("cafe", "coffee", "chai", "bakery", "bun maska"),
    PlaceCategory.heritage: ("heritage", "history", "historic", "fort", "temple", "wada", "peshwa", "culture"),
    PlaceCategory.attraction: ("attraction", "museum", "view", "sunrise", "trek", "visit"),
    PlaceCategory.hotel: ("hotel", "stay", "room", "lodge"),
}
HAZARD_WORDS = ("hazard", "report", "flood", "waterlog", "pothole", "accident", "traffic", "unsafe", "safety")
BUDGET_RE = re.compile(r"(?:under|below|less than|<)\s*(?:rs\.?|₹|inr)?\s*(\d+)", re.I)


def _price_cap(query: str) -> int | None:
    m = BUDGET_RE.search(query)
    if not m:
        return 1 if any(w in query for w in ("cheap", "budget", "affordable")) else None
    amount = int(m.group(1))
    return 1 if amount <= 250 else 2 if amount <= 600 else 3


def rule_based_answer(query: str, places: Sequence[Place], reports: Sequence[Report]) -> dict:
    q = query.lower()
    if any(w in q for w in HAZARD_WORDS):
        trusted = [r for r in reports if r.trust_score >= 40][:5]
        if not trusted:
            return {"answer": "No sufficiently verified reports right now. That does not mean an area is safe; data may be missing.", "place_ids": [], "report_ids": []}
        lines = [f"- {r.category.value.title()}: {r.description} ({r.trust_label})" for r in trusted]
        return {
            "answer": "Most trusted recent reports:\n" + "\n".join(lines),
            "place_ids": [],
            "report_ids": [r.id for r in trusted],
        }

    cats = {c for c, words in CATEGORY_WORDS.items() if any(w in q for w in words)}
    cap = _price_cap(q)
    wants_access = "wheelchair" in q or "accessible" in q
    tokens = {t for t in re.findall(r"[a-z]{3,}", q)}

    def score(p: Place) -> float:
        s = 0.0
        if cats and p.category in cats:
            s += 3
        hay = f"{p.name} {p.area} {' '.join(p.tags)} {p.summary}".lower()
        s += sum(1 for t in tokens if t in hay)
        return s

    pool = [p for p in places if (cap is None or p.price_level <= cap) and (not wants_access or p.wheelchair)]
    ranked = sorted((p for p in pool if score(p) > 0), key=lambda p: (-score(p), -(p.rating or 0)))[:5]
    if not ranked:
        return {"answer": "I couldn't match that to places in the Pune demo dataset. Try 'heritage', 'street food under ₹200' or 'cafes in Camp'.", "place_ids": [], "report_ids": []}
    lines = [f"- {p.name} ({p.area}): {p.summary}" for p in ranked]
    return {"answer": "Here's what matches:\n" + "\n".join(lines), "place_ids": [p.id for p in ranked], "report_ids": []}


def match_place_ids(text: str, places: Sequence[Place]) -> list[str]:
    """Find demo places mentioned in a free-text AI answer so the map can highlight them."""
    low = text.lower()
    return [p.id for p in places if p.name.lower().split(" (")[0] in low][:6]
