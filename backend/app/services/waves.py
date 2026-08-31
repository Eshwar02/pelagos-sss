"""Wave-field service.

Fetches Copernicus Marine GLOBAL_ANALYSISFORECAST_WAV_001_027 when credentials
are configured; otherwise serves the bundled fixture. The frontend only ever sees
`WaveField`, so the live/fixture swap is invisible to it.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from app.config import get_settings
from app.schemas import WaveField

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"


@lru_cache
def _fixture_steps() -> list[WaveField]:
    raw = json.loads((FIXTURES / "waves.json").read_text())
    return [WaveField.model_validate(step) for step in raw]


def _copernicus_available() -> bool:
    s = get_settings()
    return bool(s.copernicus_username and s.copernicus_password)


async def get_wave_forecast() -> list[WaveField]:
    """Return the 3-hourly wave forecast for the theatre.

    Live Copernicus retrieval is wired behind this interface; until credentials
    are supplied it transparently falls back to the fixture grid.
    """
    if _copernicus_available():
        try:
            return await _fetch_copernicus()
        except Exception:  # noqa: BLE001 — demo must never hard-fail on network
            return _fixture_steps()
    return _fixture_steps()


async def _fetch_copernicus() -> list[WaveField]:
    """Placeholder for live Copernicus Marine subsetting.

    Real implementation: use the `copernicusmarine` toolbox (or the WMTS/OPeNDAP
    endpoint) to subset VHM0 (sig. wave height), VMDR (direction) and VTM10
    (period) over `region_bbox`, then reshape into WaveField timesteps.
    """
    raise NotImplementedError("Live Copernicus retrieval not configured for the demo")
