"""Deterministic fixture generator for pelagos-sss.

Produces plausible Gulf of Mannar detection targets + a coarse wave-forecast grid.
Run with the stdlib only:  python backend/scripts/gen_fixtures.py
"""

from __future__ import annotations

import json
import math
import random
from datetime import UTC, datetime, timedelta
from pathlib import Path

SEED = 20260831
FIX_DIR = Path(__file__).resolve().parent.parent / "app" / "fixtures"

# Gulf of Mannar / Palk Strait theatre.
BBOX = (78.90, 8.75, 79.45, 9.35)  # min_lon, min_lat, max_lon, max_lat
REGION = "Gulf of Mannar"

CLASSES = [
    "ghost_net",
    "gillnet",
    "trawl_net",
    "rope",
    "fishing_trap",
    "pipe",
    "wreck",
    "unknown_artificial",
]

# Priority weights (from the report's cleanup-priority scoring function).
W = dict(confidence=0.30, entanglement=0.28, reef=0.18, access=0.16, cluster=0.08)


def _r(a: float, b: float, n: int = 3) -> float:
    return round(random.uniform(a, b), n)


def _clamp(x: float) -> float:
    return max(0.0, min(1.0, x))


def make_target(i: int, rng: random.Random) -> dict:
    cls = rng.choices(
        CLASSES,
        weights=[26, 20, 10, 14, 12, 5, 4, 9],  # nets dominate Indian coastal debris
        k=1,
    )[0]

    lon = round(rng.uniform(BBOX[0] + 0.02, BBOX[2] - 0.02), 5)
    lat = round(rng.uniform(BBOX[1] + 0.02, BBOX[3] - 0.02), 5)
    depth = _r(4, 42, 1)

    n_obs = rng.randint(1, 9)
    detector = _clamp(rng.uniform(0.45, 0.98))
    shadow = rng.choice([0.0, 0.5, 1.0, 1.0, 1.0])  # mostly passes physics check
    persistence = _clamp(n_obs / 5)
    artificiality = _clamp(rng.uniform(0.35, 0.99))
    bathy = _clamp(rng.uniform(0.4, 1.0))
    novelty = _clamp(rng.uniform(0.0, 0.6) if cls != "unknown_artificial" else rng.uniform(0.6, 0.95))

    # Composite calibrated confidence: mean of the hard-evidence sources.
    confidence = round(
        _clamp(0.30 * detector + 0.22 * shadow + 0.18 * persistence + 0.18 * artificiality + 0.12 * bathy),
        3,
    )

    entanglement = {
        "ghost_net": 0.95, "gillnet": 0.9, "trawl_net": 0.8, "rope": 0.6,
        "fishing_trap": 0.5, "pipe": 0.2, "wreck": 0.3, "unknown_artificial": 0.55,
    }[cls]
    entanglement = _clamp(entanglement + rng.uniform(-0.08, 0.08))

    reef_prox_m = round(rng.uniform(15, 1200), 0)
    reef_score = _clamp(1 - reef_prox_m / 1200)  # closer to reef = higher priority
    access = _clamp(1 - (depth - 4) / 38)  # shallower = more diveable
    cluster = _clamp(rng.uniform(0.1, 0.95))

    priority = round(
        _clamp(
            W["confidence"] * confidence
            + W["entanglement"] * entanglement
            + W["reef"] * reef_score
            + W["access"] * access
            + W["cluster"] * cluster
        ),
        3,
    )

    # Status distribution: most confirmed, some review/candidate, few rejected.
    if novelty > 0.7:
        status = "review"
    else:
        status = rng.choices(
            ["confirmed", "candidate", "review", "rejected"],
            weights=[58, 22, 12, 8],
            k=1,
        )[0]

    detected = datetime(2026, 8, 29, 6, 0, tzinfo=UTC) + timedelta(minutes=rng.randint(0, 5000))

    return {
        "id": f"KN-{i:03d}",
        "class": cls,
        "status": status,
        "lat": lat,
        "lon": lon,
        "depth_m": depth,
        "length_m": _r(0.6, 22, 1),
        "width_m": _r(0.3, 6, 1),
        "confidence": confidence,
        "priority": priority,
        "evidence": {
            "detector": round(detector, 3),
            "shadow_geometry": shadow,
            "ping_persistence": round(persistence, 3),
            "artificiality": round(artificiality, 3),
            "bathymetry_plausibility": round(bathy, 3),
            "open_set_novelty": round(novelty, 3),
        },
        "n_observations": n_obs,
        "entanglement_risk": round(entanglement, 3),
        "reef_proximity_m": reef_prox_m,
        "diver_accessibility": round(access, 3),
        "cluster_density": round(cluster, 3),
        "survey_id": f"GoM-{rng.choice(['A', 'B', 'C'])}-{rng.randint(1, 6):02d}",
        "first_ping": (fp := rng.randint(1000, 8000)),
        "last_ping": fp + n_obs * rng.randint(3, 30),
        "thumbnail": f"/sonar/tiles/{cls}_{(i % 6) + 1}.png",
        "detected_at": detected.isoformat(),
    }


def make_waves(rng: random.Random) -> list[dict]:
    """Coarse ~0.083deg grid over the region, 8 forecast timesteps (3-hourly)."""
    steps = []
    base = datetime(2026, 8, 31, 0, 0, tzinfo=UTC)
    lons = [round(x, 3) for x in _frange(BBOX[0], BBOX[2], 0.083)]
    lats = [round(y, 3) for y in _frange(BBOX[1], BBOX[3], 0.083)]
    for t in range(8):
        # A travelling swell: height oscillates through the day, direction drifts.
        phase = t / 8 * 2 * math.pi
        base_hs = 0.9 + 0.7 * (math.sin(phase) + 1) / 2  # 0.9–1.6 m background
        cells = []
        for la in lats:
            for lo in lons:
                grad = (lo - BBOX[0]) / (BBOX[2] - BBOX[0])  # rougher offshore (west)
                hs = round(_clamp01(base_hs + 0.6 * (1 - grad) + rng.uniform(-0.12, 0.12)) , 2)
                direction = round((205 + 30 * math.sin(phase) + rng.uniform(-6, 6)) % 360, 1)
                period = round(5.5 + 2.5 * (hs / 2.2) + rng.uniform(-0.3, 0.3), 1)
                cells.append({"lat": la, "lon": lo, "hs": hs, "dir": direction, "period": period})
        steps.append(
            {
                "time": (base + timedelta(hours=3 * t)).isoformat(),
                "source": "fixture",
                "bbox": list(BBOX),
                "cells": cells,
            }
        )
    return steps


def _frange(a: float, b: float, step: float):
    x = a
    while x <= b + 1e-9:
        yield x
        x += step


def _clamp01(x: float) -> float:
    return max(0.0, min(2.5, x))


def main() -> None:
    rng = random.Random(SEED)
    targets = [make_target(i, rng) for i in range(1, 19)]
    waves = make_waves(rng)

    FIX_DIR.mkdir(parents=True, exist_ok=True)
    (FIX_DIR / "targets.json").write_text(json.dumps(targets, indent=2))
    (FIX_DIR / "waves.json").write_text(json.dumps(waves, indent=2))
    print(f"wrote {len(targets)} targets, {len(waves)} wave timesteps -> {FIX_DIR}")


if __name__ == "__main__":
    main()
