"""Pydantic schemas for detection targets, stats and wave fields.

These mirror the evidence-provenance model from the SIH technical report: every
target carries a decomposed evidence vector rather than a single black-box score.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import AliasChoices, BaseModel, Field

ObjectClass = Literal[
    "ghost_net",
    "gillnet",
    "trawl_net",
    "rope",
    "fishing_trap",
    "pipe",
    "wreck",
    "unknown_artificial",
]

TargetStatus = Literal["candidate", "confirmed", "review", "rejected"]


class EvidenceVector(BaseModel):
    """Decomposed, auditable confidence — displayed as a stacked bar in the UI."""

    detector: float = Field(ge=0, le=1, description="Temperature-calibrated detector objectness")
    shadow_geometry: float = Field(ge=0, le=1, description="Shadow-geometry consistency (0/0.5/1)")
    ping_persistence: float = Field(ge=0, le=1, description="min(n_observations / 5, 1)")
    artificiality: float = Field(ge=0, le=1, description="XGBoost P(artificial)")
    bathymetry_plausibility: float = Field(ge=0, le=1, description="Terrain-roughness penalty")
    open_set_novelty: float = Field(ge=0, le=1, description="Inverted energy score; high routes to review")


class Target(BaseModel):
    """A confirmed or candidate physical object on the seabed."""

    id: str
    object_class: ObjectClass = Field(
        validation_alias=AliasChoices("class", "object_class"), serialization_alias="class"
    )
    status: TargetStatus
    lat: float
    lon: float
    depth_m: float
    length_m: float
    width_m: float
    confidence: float = Field(ge=0, le=1, description="Calibrated composite confidence")
    priority: float = Field(ge=0, le=1, description="Weighted cleanup priority")
    evidence: EvidenceVector
    n_observations: int = Field(ge=1)
    entanglement_risk: float = Field(ge=0, le=1)
    reef_proximity_m: float
    diver_accessibility: float = Field(ge=0, le=1)
    cluster_density: float = Field(ge=0, le=1)
    survey_id: str
    first_ping: int
    last_ping: int
    thumbnail: str
    detected_at: datetime

    model_config = {"populate_by_name": True}


class ClassCount(BaseModel):
    object_class: ObjectClass = Field(
        validation_alias=AliasChoices("class", "object_class"), serialization_alias="class"
    )
    count: int


class Stats(BaseModel):
    """Fleet-level rollup for the dashboard."""

    total: int
    confirmed: int
    review: int
    candidate: int
    rejected: int
    by_class: list[ClassCount]
    mean_confidence: float
    high_priority: int
    surveyed_km2: float
    false_alarms_per_km2: float
    region: str


class WaveCell(BaseModel):
    lat: float
    lon: float
    hs: float = Field(description="Significant wave height (m)")
    dir: float = Field(description="Mean wave direction (deg, coming-from)")
    period: float = Field(description="Mean wave period (s)")


class WaveField(BaseModel):
    """A single 3-hourly wave forecast timestep over the region grid."""

    time: datetime
    source: Literal["copernicus", "fixture"]
    bbox: tuple[float, float, float, float]
    cells: list[WaveCell]


# --------------------------------------------------------------------------- #
# Surveys, jobs, review and the operator artefacts (report §8, §9)            #
# --------------------------------------------------------------------------- #


class Survey(BaseModel):
    """A single sonar survey mission — the unit the pipeline runs over."""

    id: str
    name: str
    region: str
    vessel: str
    sonar_model: str
    frequency_khz: float
    range_setting_m: float
    track: list[tuple[float, float]] = Field(description="Survey line as [lon, lat] vertices")
    surveyed_km2: float
    operator_org: str
    n_targets: int
    start_ts: datetime
    end_ts: datetime


PipelineStage = Literal[
    "alai_ingest",
    "alai_preprocess",
    "detect",
    "valai_segment",
    "nizhal_verify",
    "artificiality",
    "openset",
    "thadam_track",
    "geo_context",
    "padai_prioritise",
]

JobKind = Literal["ingest", "infer"]
JobState = Literal["queued", "running", "done", "error"]


class Job(BaseModel):
    """An async ingest/infer job whose progress is streamed over SSE."""

    id: str
    survey_id: str
    kind: JobKind
    state: JobState
    stage: PipelineStage | None = None
    progress: float = Field(ge=0, le=1, default=0.0)
    message: str = ""


class ReviewAction(BaseModel):
    """Operator confirm / reject / reclassify — feeds the active-learning queue."""

    action: Literal["confirm", "reject", "reclassify"]
    new_class: ObjectClass | None = None
    operator: str = "operator"
    note: str = ""


class ReviewEvent(BaseModel):
    target_id: str
    action: Literal["confirm", "reject", "reclassify"]
    old_class: ObjectClass
    new_class: ObjectClass
    old_status: TargetStatus
    new_status: TargetStatus
    operator: str
    ts: datetime
    note: str = ""


class PriorityWeights(BaseModel):
    """Operator-tunable weights for the cleanup-priority scoring function (§6.3)."""

    confidence: float = Field(ge=0, le=1, default=0.30)
    entanglement: float = Field(ge=0, le=1, default=0.28)
    reef: float = Field(ge=0, le=1, default=0.18)
    access: float = Field(ge=0, le=1, default=0.16)
    cluster: float = Field(ge=0, le=1, default=0.08)


class SimilarTarget(BaseModel):
    """A nearest-neighbour of a query target (pgvector stand-in — cosine sim)."""

    target: Target
    similarity: float = Field(ge=0, le=1)


class CalibrationBin(BaseModel):
    confidence: float
    accuracy: float
    count: int


class StageLatency(BaseModel):
    stage: PipelineStage
    ms: float


class AblationRung(BaseModel):
    step: int
    config: str
    false_alarms_per_km2: float
    recall: float


class Metrics(BaseModel):
    """Operational + model metrics for the metrics page (§11)."""

    survey_id: str
    region: str
    surveyed_km2: float
    recall: float
    false_alarms_per_km2: float
    mean_confidence: float
    localisation_error_m: float
    pct_confirmed_multi_ping: float
    calibration: list[CalibrationBin]
    stage_latency: list[StageLatency]
    ablation: list[AblationRung]


class DziDescriptor(BaseModel):
    """OpenSeadragon deep-zoom descriptor for a survey waterfall image."""

    survey_id: str
    width: int
    height: int
    tile_size: int
    overlap: int
    format: str
    url_template: str
