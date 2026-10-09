# Security

## Reporting
Please report vulnerabilities privately to the maintainers via GitHub security advisories rather than public issues.

## Measures in पुण्यात काय?
| Area | Control | Where |
|---|---|---|
| Secrets | Gemini key only from env / **Google Secret Manager** at runtime; `.env` git-ignored; `.gcloudignore` keeps it out of builds; no keys in history | `backend/app/config.py`, `deploy/gcp/deploy.sh` |
| Input validation | Pydantic models on every endpoint; Pune bounding-box check; enum categories; id patterns; `lang` whitelist; query length limits | `backend/app/models.py`, `backend/app/main.py` |
| Uploads | MIME allow-list (JPEG/PNG/WebP, WebM/OGG/MP3/WAV/MP4) and 5 MB cap; media analysed once and never stored | `_read_upload` in `backend/app/main.py` |
| Abuse | Per-IP sliding-window rate limit (429 + `Retry-After`), idle buckets pruned (no memory growth), request-body size guard (413) | `security_and_rate_limit` middleware |
| Headers | CSP (no inline scripts), HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer- and Permissions-Policy, per-request `X-Request-ID` | middleware |
| Prompt injection | User text is fenced as untrusted inside Gemini prompts; model output rendered as text only (no `dangerouslySetInnerHTML`); Google Maps info windows built with `textContent` | `backend/app/services/gemini.py`, `frontend/src/components/GoogleCityMap.tsx` |
| Privacy | No accounts; anonymous device id only for reputation / one-vote-per-device; reporter id never returned by the API | `frontend/src/identity.ts`, `_report_view` |
| Integrity | One vote per device per report, no self-voting, disputed reports excluded from learning | `backend/app/store.py`, `backend/app/services/learning.py` |
| Runtime | Non-root container user, multi-stage image, dependency pins, Dependabot, CI lint (ruff incl. bandit `S` rules) | `Dockerfile`, `.github/` |
