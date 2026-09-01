"""Fleet-wide analytics — global re-prioritise, review queue and metrics.

Survey-scoped variants live under /api/surveys/{id}/...; these operate across the
whole target set for the dashboard, dive-plan and metrics pages.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas import Metrics, PriorityWeights, Target
from app.services.store import store

router = APIRouter(prefix="/api", tags=["analytics"])


@router.get("/review-queue", response_model=list[Target], response_model_by_alias=True)
def review_queue() -> list[Target]:
    return store.review_queue()


@router.post("/prioritise", response_model=list[Target], response_model_by_alias=True)
def prioritise(weights: PriorityWeights) -> list[Target]:
    return store.reprioritise(weights)


@router.get("/metrics", response_model=Metrics)
def metrics() -> Metrics:
    return store.compute_metrics()


@router.get("/weights", response_model=PriorityWeights)
def weights() -> PriorityWeights:
    return store.weights
