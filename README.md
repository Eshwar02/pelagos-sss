# pelagos-sss

**Indian side-scan sonar marine-debris intelligence — SIH 2026 prototype.**

An operations console that turns raw side-scan sonar into a **ranked, auditable, dive-ready
cleanup plan** for Indian coastal waters (Gulf of Mannar / Palk Strait). Where existing tools
(GhostNetZero, sonoware) stop at *"where are the nets?"*, pelagos-sss answers *"what do we do
about them?"* — geographic targeting, decomposed evidence-provenance confidence, and cleanup
prioritisation.

> Prototype scope: the frontend + a fixture-backed API. Detection models are represented by
> realistic fixtures; the data layer is typed so a live ML backend can be swapped in later.

## Stack

- **Frontend** — Next.js 15 (App Router) · TypeScript · Tailwind v4 · MapLibre GL · deck.gl (GPU layers)
- **Backend** — FastAPI · Pydantic v2 · uv
- **Waves** — Copernicus Marine `GLOBAL_ANALYSISFORECAST_WAV_001_027` behind a service interface (fixture fallback)

## Features (this build)

| Feature | What it does |
| --- | --- |
| **Dashboard** | Fleet stats, debris taxonomy breakdown, ranked target table with per-target evidence-provenance bars, false-alarms-per-km² metric |
| **Target Map** | GPU-rendered geographic targets (MapLibre + deck.gl), class/priority colouring, hover detail, animated Copernicus wave field, self-contained offline basemap |

Planned: Review Console (deep-zoom sonar waterfall) · Dive Plan + GPX export.

## Run locally

Two terminals.

**Backend** (port 8000):
```bash
cd backend
uv sync
python scripts/gen_fixtures.py        # regenerate fixtures (optional; committed already)
uv run uvicorn app.main:app --port 8000
```

**Frontend** (port 3000, proxies /api → :8000):
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Liveness + region |
| `GET /api/stats` | Dashboard rollup |
| `GET /api/targets` | Ranked targets (`?status=`, `?class=`, `?min_priority=`) |
| `GET /api/targets/{id}` | Single target |
| `GET /api/waves` | 3-hourly wave forecast grid |

## Layout

```
backend/   FastAPI app, fixtures, wave service
frontend/  Next.js app — shell, dashboard, map
```
