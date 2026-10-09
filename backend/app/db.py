"""Tiny SQLite persistence for reports and votes (stdlib only, no ORM)."""

from __future__ import annotations

import os
import sqlite3
import tempfile
import threading
from pathlib import Path

from app.models import Report

SCHEMA = """
CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS votes (
    report_id TEXT NOT NULL,
    voter_id TEXT NOT NULL,
    vote TEXT NOT NULL CHECK (vote IN ('confirm', 'dispute', 'resolved')),
    PRIMARY KEY (report_id, voter_id)
);
"""


def _default_path() -> Path:
    configured = os.getenv("DATA_DIR")
    base = Path(configured) if configured else Path(__file__).resolve().parents[1] / ".data"
    try:
        base.mkdir(parents=True, exist_ok=True)
        probe = base / ".write-test"
        probe.write_text("ok")
        probe.unlink()
    except OSError:
        base = Path(tempfile.gettempdir()) / "citypulse"
        base.mkdir(parents=True, exist_ok=True)
    return base / "citypulse.sqlite3"


class Database:
    def __init__(self, path: Path | str | None = None) -> None:
        self.path = str(path or _default_path())
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(self.path, check_same_thread=False)
        self._conn.executescript(SCHEMA)
        self._conn.commit()

    def load_reports(self) -> list[Report]:
        with self._lock:
            rows = self._conn.execute("SELECT data FROM reports").fetchall()
        return [Report.model_validate_json(r[0]) for r in rows]

    def save_reports(self, reports: list[Report]) -> None:
        with self._lock:
            self._conn.executemany(
                "INSERT OR REPLACE INTO reports (id, data) VALUES (?, ?)",
                [(r.id, r.model_dump_json()) for r in reports],
            )
            self._conn.commit()

    def upsert_vote(self, report_id: str, voter_id: str, vote: str) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT OR REPLACE INTO votes (report_id, voter_id, vote) VALUES (?, ?, ?)",
                (report_id, voter_id, vote),
            )
            self._conn.commit()

    def vote_counts(self, report_id: str) -> dict[str, int]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT vote, COUNT(*) FROM votes WHERE report_id = ? GROUP BY vote", (report_id,)
            ).fetchall()
        return {v: n for v, n in rows}
