"""Similar-target search — a pgvector nearest-neighbour stand-in.

The report stores the detector's penultimate embedding per confirmed target and
serves cosine nearest-neighbours ("find everything that looks like this"). With
no trained detector here we build a deterministic feature vector from each
target's evidence + geometry and rank by cosine similarity. The API shape and
the demo moment are identical; only the vector's provenance differs.
"""

from __future__ import annotations

import math

from app.schemas import Target


def feature_vector(t: Target) -> list[float]:
    e = t.evidence
    return [
        e.detector,
        e.shadow_geometry,
        e.ping_persistence,
        e.artificiality,
        e.bathymetry_plausibility,
        e.open_set_novelty,
        t.entanglement_risk,
        t.diver_accessibility,
        t.cluster_density,
        min(t.length_m / 22.0, 1.0),
        min(t.width_m / 6.0, 1.0),
        min(t.depth_m / 42.0, 1.0),
    ]


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (na * nb)))


def rank_similar(query: Target, pool: list[Target], k: int = 6) -> list[tuple[Target, float]]:
    qv = feature_vector(query)
    scored = [
        (t, round(cosine(qv, feature_vector(t)), 4)) for t in pool if t.id != query.id
    ]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return scored[:k]
