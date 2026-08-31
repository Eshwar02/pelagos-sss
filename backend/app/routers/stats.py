"""Dashboard rollup endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas import Stats
from app.services import store

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=Stats, response_model_by_alias=True)
def get_stats() -> Stats:
    return store.compute_stats()
