"""pelagos-sss backend — FastAPI application entrypoint."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import analytics, jobs, stats, surveys, targets, tiles, waves

settings = get_settings()

app = FastAPI(
    title="pelagos-sss API",
    description="Indian side-scan sonar marine-debris intelligence — SIH 2026 prototype.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(targets.router)
app.include_router(surveys.router)
app.include_router(jobs.router)
app.include_router(tiles.router)
app.include_router(analytics.router)
app.include_router(stats.router)
app.include_router(waves.router)


@app.get("/api/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok", "region": settings.region_name}
