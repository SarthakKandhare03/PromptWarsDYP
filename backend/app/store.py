"""Report store: in-memory working set, persisted to SQLite, with continuous learning.

Every change (new report, vote, weather update) re-runs the pipeline:
reputation -> trust scores -> hotspot model fit.
"""

from __future__ import annotations

import threading
from datetime import UTC, datetime, timedelta

from app.data.pune import ACCIDENT_ZONES, seed_history, seed_reports
from app.db import Database
from app.models import Report
from app.services.learning import HotspotModel, reporter_reputation
from app.services.trust import TrustContext, label_for, score_report

MAX_REPORTS = 2000
ACTIVE_WINDOW = timedelta(hours=72)
RESOLVE_THRESHOLD = 2


def utcnow() -> datetime:
    return datetime.now(UTC)


class ReportStore:
    def __init__(self, db: Database | None = None) -> None:
        self._lock = threading.RLock()
        self.db = db or Database()
        self._reports: list[Report] = self.db.load_reports()
        if not self._reports:
            self._reports = seed_reports() + seed_history()
            self.db.save_reports(self._reports)
        self._rain_mm: float | None = None
        self.model = HotspotModel()
        self.retrain()

    # ---------- learning pipeline ----------

    def retrain(self) -> None:
        with self._lock:
            reputation = reporter_reputation(self._reports)
            ctx = TrustContext(recent_rain_mm=self._rain_mm, accident_zones=tuple(ACCIDENT_ZONES), reputation=reputation)
            snapshot = list(self._reports)
            for rep in self._reports:
                score, reasons = score_report(rep, snapshot, ctx)
                rep.trust_score, rep.trust_reasons = score, reasons
                rep.trust_label = label_for(score, rep.source)
            self.model.fit(self._reports, utcnow())

    def set_recent_rain(self, rain_mm: float | None) -> None:
        if rain_mm != self._rain_mm:
            self._rain_mm = rain_mm
            self.retrain()

    # ---------- mutations ----------

    def add(self, report: Report) -> Report:
        with self._lock:
            self._reports.append(report)
            if len(self._reports) > MAX_REPORTS:
                self._reports = self._reports[-MAX_REPORTS:]
            self.retrain()
            self.db.save_reports(self._reports)
        return report

    def vote(self, report_id: str, voter_id: str, vote: str) -> Report:
        """Record one vote per voter per report; raises KeyError / PermissionError."""
        with self._lock:
            report = self.get(report_id)
            if report is None:
                raise KeyError(report_id)
            if report.reporter_id and report.reporter_id == voter_id:
                raise PermissionError("You cannot vote on your own report.")
            self.db.upsert_vote(report_id, voter_id, vote)
            counts = self.db.vote_counts(report_id)
            report.confirmations = counts.get("confirm", 0)
            report.disputes = counts.get("dispute", 0)
            report.resolved_votes = counts.get("resolved", 0)
            if report.resolved_votes >= RESOLVE_THRESHOLD:
                report.status = "resolved"
            self.retrain()
            self.db.save_reports(self._reports)
            return report

    # ---------- queries ----------

    def get(self, report_id: str) -> Report | None:
        with self._lock:
            return next((r for r in self._reports if r.id == report_id), None)

    def all(self) -> list[Report]:
        with self._lock:
            return sorted(self._reports, key=lambda r: r.created_at, reverse=True)

    def active(self) -> list[Report]:
        """Live, unresolved reports from the last 72 h: what the map and routing use."""
        cutoff = utcnow() - ACTIVE_WINDOW
        return [r for r in self.all() if r.status == "active" and r.created_at >= cutoff]


store = ReportStore()
