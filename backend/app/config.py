"""Runtime configuration, read once from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _load_dotenv(path: Path) -> None:
    """Minimal .env loader so local dev needs no extra dependency."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_ROOT = Path(__file__).resolve().parents[2]
_load_dotenv(_ROOT / ".env")
_load_dotenv(_ROOT / "backend" / ".env")


@dataclass(frozen=True)
class Settings:
    gemini_api_key: str | None
    gemini_model: str
    gemini_fallback_models: tuple[str, ...]
    gemini_timeout_s: float
    http_timeout_s: float
    rate_limit_per_minute: int
    max_upload_bytes: int
    static_dir: Path
    allowed_origins: tuple[str, ...]

    @property
    def ai_enabled(self) -> bool:
        return bool(self.gemini_api_key)


def get_settings() -> Settings:
    origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
    return Settings(
        gemini_api_key=os.getenv("GEMINI_API_KEY") or None,
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
        gemini_fallback_models=tuple(
            m.strip()
            for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-flash-latest,gemini-3.8-flash,gemini-3.5-flash-lite").split(",")
            if m.strip()
        ),
        gemini_timeout_s=float(os.getenv("GEMINI_TIMEOUT_S", "20")),
        http_timeout_s=float(os.getenv("HTTP_TIMEOUT_S", "6")),
        rate_limit_per_minute=int(os.getenv("RATE_LIMIT_PER_MINUTE", "60")),
        max_upload_bytes=int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024))),
        static_dir=Path(os.getenv("STATIC_DIR", str(_ROOT / "frontend" / "dist"))),
        allowed_origins=tuple(o.strip() for o in origins.split(",") if o.strip()),
    )


settings = get_settings()
