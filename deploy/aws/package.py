"""Build an AWS Elastic Beanstalk (Python platform) source bundle.

Usage (from repo root, after `npm run build` in frontend/):
    python deploy/aws/package.py
Produces dist/citypulse-eb.zip containing the FastAPI app, the built SPA in
static/, requirements.txt and a Procfile. EB's nginx proxies :80 -> :8000.
"""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "dist" / "citypulse-eb.zip"
SKIP = {"__pycache__", ".pytest_cache"}


def add_tree(zf: zipfile.ZipFile, src: Path, arc_prefix: str) -> None:
    for path in sorted(src.rglob("*")):
        if path.is_file() and not SKIP.intersection(path.parts):
            zf.write(path, f"{arc_prefix}/{path.relative_to(src).as_posix()}")


def main() -> int:
    dist = ROOT / "frontend" / "dist"
    if not (dist / "index.html").is_file():
        print("frontend/dist missing: run `npm run build` in frontend/ first", file=sys.stderr)
        return 1
    OUT.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        add_tree(zf, ROOT / "backend" / "app", "app")
        add_tree(zf, dist, "static")
        zf.write(ROOT / "backend" / "requirements.txt", "requirements.txt")
        # Normalise line endings: a CRLF Procfile breaks the command on EB's Linux hosts.
        procfile = (ROOT / "deploy" / "aws" / "Procfile").read_text(encoding="utf-8").replace(chr(13), "")
        zf.writestr("Procfile", procfile)
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
