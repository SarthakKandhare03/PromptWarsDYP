"""The self-learning layer: it learns from the community and from report history.

1. Reporter reputation: a Beta(1, 1) prior updated by how the community
   voted on each reporter's past reports. New reporters start at 0.5.
2. HotspotModel: learns where and *when* issues recur. Reports are binned
   into ~550 m grid cells and five time-of-day bands. Each report is weighted
   by trust, severity and a 14-day half-life, so the model forgets stale
   patterns. It is re-fitted whenever reports or votes change.
"""

from __future__ import annotations

import math
from collections import Counter, defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from app.models import Report

CELL_DEG = 0.005  # ~550 m at Pune's latitude
HISTORY_HALF_LIFE_DAYS = 14.0
HOTSPOT_MIN_WEIGHT = 0.6
HOTSPOT_MIN_REPORTS = 2  # one report is an incident, not a pattern
BANDS: tuple[tuple[int, int, str], ...] = (
    (0, 6, "late night"), (6, 12, "morning"), (12, 17, "afternoon"), (17, 21, "evening"), (21, 24, "night"),
)

Cell = tuple[int, int]
IST = timezone(timedelta(hours=5, minutes=30))


def band_for(hour: int) -> str:
    for start, end, name in BANDS:
        if start <= hour % 24 < end:
            return name
    return "night"


def cell_for(lat: float, lng: float) -> Cell:
    return (round(lat / CELL_DEG), round(lng / CELL_DEG))


def cell_center(cell: Cell) -> tuple[float, float]:
    return (cell[0] * CELL_DEG, cell[1] * CELL_DEG)


# ---------- reporter reputation ----------

def reporter_reputation(reports: Iterable[Report]) -> dict[str, tuple[float, int]]:
    """reporter_id -> (reputation 0-1, number of judged reports).

    A report counts as accurate if confirmations outnumber disputes, inaccurate if the
    reverse; ties and unvoted reports teach nothing. Trust is NOT used here, which
    avoids a feedback loop (reputation -> trust -> reputation).
    """
    good: Counter[str] = Counter()
    bad: Counter[str] = Counter()
    for r in reports:
        if not r.reporter_id:
            continue
        if r.confirmations > r.disputes:
            good[r.reporter_id] += 1
        elif r.disputes > r.confirmations:
            bad[r.reporter_id] += 1
    ids = set(good) | set(bad)
    return {i: ((good[i] + 1) / (good[i] + bad[i] + 2), good[i] + bad[i]) for i in ids}


# ---------- hotspot model ----------

@dataclass
class Hotspot:
    lat: float
    lng: float
    band: str
    weight: float
    reports: int
    top_category: str


@dataclass
class HotspotModel:
    weights: dict[tuple[Cell, str], float] = field(default_factory=dict)
    counts: dict[tuple[Cell, str], int] = field(default_factory=dict)
    categories: dict[tuple[Cell, str], Counter] = field(default_factory=dict)
    samples: int = 0
    trained_at: datetime | None = None

    def fit(self, reports: Sequence[Report], now: datetime) -> HotspotModel:
        weights: dict[tuple[Cell, str], float] = defaultdict(float)
        counts: dict[tuple[Cell, str], int] = defaultdict(int)
        cats: dict[tuple[Cell, str], Counter] = defaultdict(Counter)
        used = 0
        for r in reports:
            if r.disputes > r.confirmations:
                continue  # the community rejected it, so don't learn from it
            age_days = max(0.0, (now - r.created_at).total_seconds() / 86400)
            w = (r.trust_score / 100) * r.severity * math.pow(0.5, age_days / HISTORY_HALF_LIFE_DAYS)
            if w <= 0:
                continue
            local_hour = r.created_at.astimezone(IST).hour
            key = (cell_for(r.lat, r.lng), band_for(local_hour))
            weights[key] += w
            counts[key] += 1
            cats[key][r.category.value] += 1
            used += 1
        self.weights, self.counts, self.categories = dict(weights), dict(counts), dict(cats)
        self.samples, self.trained_at = used, now
        return self

    def risk(self, lat: float, lng: float, hour: int) -> tuple[float, int, str | None]:
        key = (cell_for(lat, lng), band_for(hour))
        w = self.weights.get(key, 0.0)
        top = self.categories[key].most_common(1)[0][0] if key in self.categories else None
        return w, self.counts.get(key, 0), top

    def hotspots(self, hour: int | None = None, limit: int = 20) -> list[Hotspot]:
        band = band_for(hour) if hour is not None else None
        items = [
            Hotspot(*cell_center(cell), band=b, weight=round(w, 2), reports=self.counts[(cell, b)],
                    top_category=self.categories[(cell, b)].most_common(1)[0][0])
            for (cell, b), w in self.weights.items()
            if w >= HOTSPOT_MIN_WEIGHT and self.counts[(cell, b)] >= HOTSPOT_MIN_REPORTS and (band is None or b == band)
        ]
        return sorted(items, key=lambda h: -h.weight)[:limit]

    def summary(self) -> dict:
        return {
            "samples": self.samples,
            "cells": len({c for c, _ in self.weights}),
            "hotspots": sum(1 for k, w in self.weights.items() if w >= HOTSPOT_MIN_WEIGHT and self.counts[k] >= HOTSPOT_MIN_REPORTS),
            "trained_at": self.trained_at.isoformat() if self.trained_at else None,
            "half_life_days": HISTORY_HALF_LIFE_DAYS,
        }
