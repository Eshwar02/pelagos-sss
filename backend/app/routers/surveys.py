"""Survey endpoints — the pipeline's unit of work (report §9)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.schemas import (
    Job,
    Metrics,
    PriorityWeights,
    Survey,
    Target,
)
from app.services import export as export_svc
from app.services import jobs as jobs_svc
from app.services.store import store

router = APIRouter(prefix="/api/surveys", tags=["surveys"])


@router.get("", response_model=list[Survey])
def list_surveys() -> list[Survey]:
    return store.list_surveys()


@router.get("/{survey_id}", response_model=Survey)
def get_survey(survey_id: str) -> Survey:
    survey = store.get_survey(survey_id)
    if survey is None:
        raise HTTPException(status_code=404, detail=f"survey {survey_id} not found")
    return survey


@router.post("/{survey_id}/ingest", response_model=Job)
def ingest(survey_id: str) -> Job:
    """Trigger preprocessing + tiling; returns a job id to stream."""
    if store.get_survey(survey_id) is None:
        raise HTTPException(status_code=404, detail=f"survey {survey_id} not found")
    return jobs_svc.create_job(survey_id, "ingest")


@router.post("/{survey_id}/infer", response_model=Job)
def infer(survey_id: str) -> Job:
    """Run the full pipeline; returns a job id to stream."""
    if store.get_survey(survey_id) is None:
        raise HTTPException(status_code=404, detail=f"survey {survey_id} not found")
    return jobs_svc.create_job(survey_id, "infer")


@router.get("/{survey_id}/targets", response_model=list[Target], response_model_by_alias=True)
def survey_targets(
    survey_id: str,
    status: str | None = Query(default=None),
    object_class: str | None = Query(default=None, alias="class"),
    min_priority: float = Query(default=0.0, ge=0, le=1),
) -> list[Target]:
    return store.list_targets(
        survey_id=survey_id, status=status, object_class=object_class, min_priority=min_priority
    )


@router.get("/{survey_id}/review-queue", response_model=list[Target], response_model_by_alias=True)
def review_queue(survey_id: str) -> list[Target]:
    """Uncertainty-ranked list for the operator."""
    return store.review_queue(survey_id=survey_id)


@router.post("/{survey_id}/prioritise", response_model=list[Target], response_model_by_alias=True)
def prioritise(survey_id: str, weights: PriorityWeights) -> list[Target]:
    """Recompute priority with operator-supplied weights and re-rank."""
    return store.reprioritise(weights, survey_id=survey_id)


@router.get("/{survey_id}/export")
def export(survey_id: str, format: str = Query(default="geojson")) -> Response:
    fmt = format.lower()
    if fmt not in export_svc.EXPORT_FORMATS:
        raise HTTPException(status_code=422, detail=f"format must be one of {export_svc.EXPORT_FORMATS}")
    targets = store.list_targets(survey_id=survey_id)
    body = export_svc.render(fmt, targets)
    ext = "geojson" if fmt == "geojson" else fmt
    return Response(
        content=body,
        media_type=export_svc.MEDIA_TYPES[fmt],
        headers={"Content-Disposition": f'attachment; filename="dive_plan_{survey_id}.{ext}"'},
    )


@router.get("/{survey_id}/metrics", response_model=Metrics)
def metrics(survey_id: str) -> Metrics:
    if store.get_survey(survey_id) is None:
        raise HTTPException(status_code=404, detail=f"survey {survey_id} not found")
    return store.compute_metrics(survey_id=survey_id)
