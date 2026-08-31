"""Application settings for the pelagos-sss backend."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration. Values can be overridden via env vars."""

    model_config = SettingsConfigDict(env_prefix="PELAGOS_", env_file=".env", extra="ignore")

    app_name: str = "pelagos-sss"

    # CORS: the Next.js dev server.
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Gulf of Mannar / Palk Strait theatre bounding box (min_lon, min_lat, max_lon, max_lat).
    region_bbox: tuple[float, float, float, float] = (78.90, 8.75, 79.45, 9.35)
    region_name: str = "Gulf of Mannar"

    # Copernicus Marine — Global Ocean Waves Analysis and Forecast (GLOBAL_ANALYSISFORECAST_WAV_001_027).
    # If credentials are absent, the waves service falls back to the bundled fixture.
    copernicus_username: str | None = None
    copernicus_password: str | None = None
    copernicus_wave_dataset: str = "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i"


@lru_cache
def get_settings() -> Settings:
    return Settings()
