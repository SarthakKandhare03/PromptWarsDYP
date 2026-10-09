"""Trust Engine: scores how much a citizen report can be believed.

Design follows crowdsourced-verification research (CommuniSense, Nairobi; the
Jalisco Safety Index): evidence quality, independent corroboration, official
or sensor cross-checks, and recency. Every point added is explained in
`reasons` so the score is never a black box.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime, timedelta

from app.models import Report, ReportCategory, SourceType
from app.services.geo import haversine_m

CORROBORATION_RADIUS_M = 300.0
CORROBORATION_WINDOW = timedelta(hours=6)
RAIN_THRESHOLD_MM = 2.0
ACCIDENT_ZONE_RADIUS_M = 400.0

LABEL_CORROBORATED = "Corroborated"
LABEL_PARTIAL = "Partially verified"
LABEL_UNVERIFIED = "Unverified"
LABEL_OFFICIAL = "Official"


@dataclass(frozen=True)
class TrustContext:
    """External signals available when scoring a report."""

    recent_rain_mm: float | None = None
    accident_zones: tuple[tuple[str, float, float], ...] = ()
    reputation: dict[str, tuple[float, int]] | None = None  # reporter_id -> (0-1, judged reports)


def label_for(score: int, source: SourceType) -> str:
    if source == SourceType.official:
        return LABEL_OFFICIAL
    if score >= 70:
        return LABEL_CORROBORATED
    if score >= 40:
        return LABEL_PARTIAL
    return LABEL_UNVERIFIED


def score_report(report: Report, others: Iterable[Report], ctx: TrustContext) -> tuple[int, list[str]]:
    """Return (score 0-100, human-readable reasons)."""
    if report.source == SourceType.official:
        return 95, ["Published by an official source"]

    score = 20.0
    reasons = ["Base score for a single community report"]

    if report.has_photo:
        score += 15
        reasons.append("Photo evidence attached (+15)")
    if report.has_audio:
        score += 5
        reasons.append("Voice note attached (+5)")
    if report.ai_consistency is not None:
        bonus = round(report.ai_consistency * 15)
        score += bonus
        reasons.append(f"AI check: media matches description {round(report.ai_consistency * 100)}% (+{bonus})")

    corroborating = [
        o
        for o in others
        if o.id != report.id
        and o.category == report.category
        and abs(o.created_at - report.created_at) <= CORROBORATION_WINDOW
        and haversine_m((o.lat, o.lng), (report.lat, report.lng)) <= CORROBORATION_RADIUS_M
    ]
    if corroborating:
        bonus = min(30, 12 * len(corroborating))
        score += bonus
        reasons.append(f"{len(corroborating)} independent nearby report(s) within 6 h (+{bonus})")

    if (
        report.category == ReportCategory.waterlogging
        and ctx.recent_rain_mm is not None
        and ctx.recent_rain_mm >= RAIN_THRESHOLD_MM
    ):
        score += 20
        reasons.append(f"Weather data confirms {ctx.recent_rain_mm:.1f} mm recent rain (+20)")

    if report.category in (ReportCategory.accident, ReportCategory.traffic):
        for name, lat, lng in ctx.accident_zones:
            if haversine_m((lat, lng), (report.lat, report.lng)) <= ACCIDENT_ZONE_RADIUS_M:
                score += 10
                reasons.append(f"Inside a publicly reported accident-prone corridor: {name} (+10)")
                break

    # Community verification (CommuniSense-style): people on the ground confirm or dispute.
    if report.confirmations:
        bonus = min(30, 10 * report.confirmations)
        score += bonus
        reasons.append(f"{report.confirmations} person(s) confirmed it is still there (+{bonus})")
    if report.disputes:
        penalty = min(45, 15 * report.disputes)
        score -= penalty
        reasons.append(f"{report.disputes} person(s) disputed it (-{penalty})")

    # Learned reporter reputation: accurate reporters earn more trust next time.
    if ctx.reputation and report.reporter_id in ctx.reputation:
        rep, judged = ctx.reputation[report.reporter_id]
        adj = round((rep - 0.5) * 20)
        if adj:
            score += adj
            reasons.append(f"Reporter's track record: {round(rep * 100)}% accurate over {judged} judged report(s) ({adj:+d})")

    return max(0, min(100, round(score))), reasons


def freshness(created_at: datetime, now: datetime) -> str:
    """Human label for report age."""
    hours = (now - created_at).total_seconds() / 3600
    if hours < 1:
        return "Just now"
    if hours < 24:
        return f"{int(hours)} h ago"
    return f"{int(hours // 24)} d ago"
