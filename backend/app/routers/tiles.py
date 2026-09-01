"""Waterfall deep-zoom descriptor (report §9 /tiles/{id}/dzi).

Returns the OpenSeadragon descriptor for a survey's waterfall image. No real
sonar raster is generated in this build; the frontend renders a synthesized
waterfall panel from this descriptor so the viewer + mask-overlay UX is present.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas import DziDescriptor

router = APIRouter(prefix="/api/tiles", tags=["tiles"])

# A tall waterfall image — height dominates because pings accumulate down-track.
_WIDTH = 1024
_HEIGHT = 40000
_TILE = 256


@router.get("/{survey_id}/dzi", response_model=DziDescriptor)
def dzi(survey_id: str) -> DziDescriptor:
    return DziDescriptor(
        survey_id=survey_id,
        width=_WIDTH,
        height=_HEIGHT,
        tile_size=_TILE,
        overlap=1,
        format="png",
        url_template=f"/api/tiles/{survey_id}/{{level}}/{{col}}_{{row}}.png",
    )
