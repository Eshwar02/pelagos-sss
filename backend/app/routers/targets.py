"""Detection target endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.schemas import Target
from app.services import store

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
