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
