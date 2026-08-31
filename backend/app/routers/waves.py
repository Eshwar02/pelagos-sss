"""Wave-forecast endpoint (Copernicus behind interface, fixture fallback)."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas import WaveField
from app.services import waves

router = APIRouter(prefix="/api/waves", tags=["waves"])


@router.get("", response_model=list[WaveField])
async def get_waves() -> list[WaveField]:
    return await waves.get_wave_forecast()
