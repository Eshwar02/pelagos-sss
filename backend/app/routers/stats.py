"""Dashboard rollup endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.schemas import Stats
from app.services.store import store

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=Stats, response_model_by_alias=True)
def get_stats(survey_id: str | None = Query(default=None)) -> Stats:
    return store.compute_stats(survey_id=survey_id)
