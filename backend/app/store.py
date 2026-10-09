"""In-memory report store (per instance). Re-scores trust when new evidence arrives."""

from __future__ import annotations

import threading
from datetime import datetime, timezone

from app.data.pune import ACCIDENT_ZONES, seed_reports
from app.models import Report
from app.services.trust import TrustContext, label_for, score_report

MAX_REPORTS = 500


class ReportStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._reports: list[Report] = seed_reports()
        self._rain_mm: float | None = None
        self.rescore()

    def context(self) -> TrustContext:
        return TrustContext(recent_rain_mm=self._rain_mm, accident_zones=tuple(ACCIDENT_ZONES))

    def set_recent_rain(self, rain_mm: float | None) -> None:
        if rain_mm != self._rain_mm:
            self._rain_mm = rain_mm
            self.rescore()

    def rescore(self) -> None:
        """Corroboration is mutual: a new report can raise trust in older ones."""
        with self._lock:
            ctx = self.context()
            snapshot = list(self._reports)
            for rep in self._reports:
                score, reasons = score_report(rep, snapshot, ctx)
                rep.trust_score = score
                rep.trust_reasons = reasons
                rep.trust_label = label_for(score, rep.source)

    def add(self, report: Report) -> Report:
        with self._lock:
            self._reports.append(report)
            if len(self._reports) > MAX_REPORTS:
                self._reports = self._reports[-MAX_REPORTS:]
        self.rescore()
        return report

    def all(self) -> list[Report]:
        with self._lock:
            return sorted(self._reports, key=lambda r: r.created_at, reverse=True)


store = ReportStore()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
