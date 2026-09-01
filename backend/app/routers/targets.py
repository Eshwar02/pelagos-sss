"""Detection target endpoints — record, evidence, similar search, review."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.schemas import ReviewAction, ReviewEvent, SimilarTarget, Target
from app.services.store import store

router = APIRouter(prefix="/api/targets", tags=["targets"])


@router.get("", response_model=list[Target], response_model_by_alias=True)
def list_targets(
    status: str | None = Query(default=None),
    object_class: str | None = Query(default=None, alias="class"),
    min_priority: float = Query(default=0.0, ge=0, le=1),
) -> list[Target]:
    return store.list_targets(status=status, object_class=object_class, min_priority=min_priority)


@router.get("/{target_id}", response_model=Target, response_model_by_alias=True)
def get_target(target_id: str) -> Target:
    target = store.get_target(target_id)
    if target is None:
        raise HTTPException(status_code=404, detail=f"target {target_id} not found")
    return target


@router.get("/{target_id}/similar", response_model=list[SimilarTarget], response_model_by_alias=True)
def similar_targets(target_id: str, k: int = Query(default=6, ge=1, le=20)) -> list[SimilarTarget]:
    """pgvector-style nearest neighbours — 'find everything that looks like this'."""
    ranked = store.similar(target_id, k=k)
    if ranked is None:
        raise HTTPException(status_code=404, detail=f"target {target_id} not found")
    return [SimilarTarget(target=t, similarity=s) for t, s in ranked]


@router.post("/{target_id}/review", response_model=ReviewEvent)
def review_target(target_id: str, action: ReviewAction) -> ReviewEvent:
    """Confirm / reject / reclassify; writes to the active-learning queue."""
    if action.action == "reclassify" and action.new_class is None:
        raise HTTPException(status_code=422, detail="reclassify requires new_class")
    result = store.review(target_id, action)
    if result is None:
        raise HTTPException(status_code=404, detail=f"target {target_id} not found")
    _, event = result
    return event
