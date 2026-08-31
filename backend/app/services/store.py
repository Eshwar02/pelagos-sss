"""In-memory fixture store for detection targets.

Loads the generated fixture once at import and exposes typed accessors. In the
demo this stands in for the PostGIS-backed detection table.
"""

from __future__ import annotations

import json
from collections import Counter
from functools import lru_cache
from pathlib import Path

from app.config import get_settings
from app.schemas import ClassCount, Stats, Target

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"


@lru_cache
def _load_targets() -> list[Target]:
    raw = json.loads((FIXTURES / "targets.json").read_text())
    return [Target.model_validate(item) for item in raw]


def list_targets(
    status: str | None = None,
    object_class: str | None = None,
    min_priority: float = 0.0,
) -> list[Target]:
    items = _load_targets()
    if status:
        items = [t for t in items if t.status == status]
    if object_class:
        items = [t for t in items if t.object_class == object_class]
    if min_priority > 0:
        items = [t for t in items if t.priority >= min_priority]
    return sorted(items, key=lambda t: t.priority, reverse=True)


def get_target(target_id: str) -> Target | None:
    return next((t for t in _load_targets() if t.id == target_id), None)


def compute_stats() -> Stats:
    items = _load_targets()
    status_counts = Counter(t.status for t in items)
    class_counts = Counter(t.object_class for t in items)
    confirmed = [t for t in items if t.status == "confirmed"]

    # Demo survey footprint; false-alarm metric = rejected candidates per km^2.
    surveyed_km2 = 128.0
    rejected = status_counts.get("rejected", 0)

    return Stats(
        total=len(items),
        confirmed=status_counts.get("confirmed", 0),
        review=status_counts.get("review", 0),
        candidate=status_counts.get("candidate", 0),
        rejected=rejected,
        by_class=[ClassCount(object_class=c, count=n) for c, n in class_counts.most_common()],
        mean_confidence=round(sum(t.confidence for t in items) / len(items), 3) if items else 0.0,
        high_priority=sum(1 for t in items if t.priority >= 0.7),
        surveyed_km2=surveyed_km2,
        false_alarms_per_km2=round(rejected / surveyed_km2, 3),
        region=get_settings().region_name,
    )
