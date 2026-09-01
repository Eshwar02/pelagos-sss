"""Stateful in-memory store for surveys, targets and review events.

Stands in for the PostGIS-backed schema (report §8). Seeded once from the
generated fixture, then mutated in-process by the review loop and the priority
re-ranker. Not persistent — restart resets to the seed, which is exactly what a
demo wants.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.config import get_settings
from app.schemas import (
    AblationRung,
    CalibrationBin,
    ClassCount,
    Metrics,
    PriorityWeights,
    ReviewAction,
    ReviewEvent,
    StageLatency,
    Stats,
    Survey,
    Target,
)
from app.services import scoring
from app.services.similar import rank_similar

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"

# Per-survey surveyed area (km²) — used for the false-alarm-per-km² metric.
_SURVEY_AREA_KM2 = 42.0

# Deterministic per-survey metadata pools (report §8 surveys table).
_VESSELS = ["INS Sarvekshak", "FV Meenava", "RV Sagar Nidhi", "AUV Matsya", "FV Kadal Rani"]
_SONARS = ["EdgeTech 4125", "Klein 3000", "Marine Sonic ARC", "Kongsberg 2040"]
_FREQS = [400.0, 600.0, 900.0, 1200.0]
_RANGES = [50.0, 75.0, 100.0, 150.0]


def _seed(key: str) -> int:
    return int(hashlib.sha256(key.encode()).hexdigest(), 16)


class Store:
    def __init__(self) -> None:
        self.targets: list[Target] = self._load_targets()
        self.weights = PriorityWeights()
        self.review_events: list[ReviewEvent] = []
        self.surveys: dict[str, Survey] = self._build_surveys()

    # -- seeding ----------------------------------------------------------- #

    def _load_targets(self) -> list[Target]:
        raw = json.loads((FIXTURES / "targets.json").read_text())
        return [Target.model_validate(item) for item in raw]

    def _build_surveys(self) -> dict[str, Survey]:
        """Synthesize survey records from the survey_ids present in the targets."""
        settings = get_settings()
        bbox = settings.region_bbox
        surveys: dict[str, Survey] = {}
        ids = sorted({t.survey_id for t in self.targets})
        for sid in ids:
            h = _seed(sid)
            members = [t for t in self.targets if t.survey_id == sid]
            # A simple lawnmower track across the theatre, offset per survey.
            lon0, lat0, lon1, lat1 = bbox
            legs = 4
            track: list[tuple[float, float]] = []
            for i in range(legs + 1):
                lon = round(lon0 + (lon1 - lon0) * (i / legs), 5)
                lat = round(lat0 + (lat1 - lat0) * ((i % 2 + (h % 3) * 0.05)), 5)
                lat = min(max(lat, lat0), lat1)
                track.append((lon, lat))
            start = datetime(2026, 8, 29, 6, 0, tzinfo=UTC) + timedelta(hours=h % 72)
            surveys[sid] = Survey(
                id=sid,
                name=f"Gulf of Mannar line {sid}",
                region=settings.region_name,
                vessel=_VESSELS[h % len(_VESSELS)],
                sonar_model=_SONARS[h % len(_SONARS)],
                frequency_khz=_FREQS[h % len(_FREQS)],
                range_setting_m=_RANGES[h % len(_RANGES)],
                track=track,
                surveyed_km2=_SURVEY_AREA_KM2,
                operator_org="INCOIS / NIOT (demo)",
                n_targets=len(members),
                start_ts=start,
                end_ts=start + timedelta(hours=6),
            )
        return surveys

    # -- reads ------------------------------------------------------------- #

    def list_targets(
        self,
        survey_id: str | None = None,
        status: str | None = None,
        object_class: str | None = None,
        min_priority: float = 0.0,
    ) -> list[Target]:
        items = self.targets
        if survey_id:
            items = [t for t in items if t.survey_id == survey_id]
        if status:
            items = [t for t in items if t.status == status]
        if object_class:
            items = [t for t in items if t.object_class == object_class]
        if min_priority > 0:
            items = [t for t in items if t.priority >= min_priority]
        return sorted(items, key=lambda t: t.priority, reverse=True)

    def get_target(self, target_id: str) -> Target | None:
        return next((t for t in self.targets if t.id == target_id), None)

    def list_surveys(self) -> list[Survey]:
        return sorted(self.surveys.values(), key=lambda s: s.id)

    def get_survey(self, survey_id: str) -> Survey | None:
        return self.surveys.get(survey_id)

    def review_queue(self, survey_id: str | None = None) -> list[Target]:
        """Uncertainty-ranked list — most informative labels first (§6.5)."""
        items = [t for t in self.targets if t.status != "rejected"]
        if survey_id:
            items = [t for t in items if t.survey_id == survey_id]
        return sorted(items, key=scoring.uncertainty_of, reverse=True)

    def similar(self, target_id: str, k: int = 6):
        query = self.get_target(target_id)
        if query is None:
            return None
        return rank_similar(query, self.targets, k=k)

    # -- mutations --------------------------------------------------------- #

    def review(self, target_id: str, action: ReviewAction) -> tuple[Target, ReviewEvent] | None:
        t = self.get_target(target_id)
        if t is None:
            return None
        old_class, old_status = t.object_class, t.status
        if action.action == "confirm":
            t.status = "confirmed"
        elif action.action == "reject":
            t.status = "rejected"
        elif action.action == "reclassify" and action.new_class:
            t.object_class = action.new_class
            t.status = "confirmed"
        event = ReviewEvent(
            target_id=t.id,
            action=action.action,
            old_class=old_class,
            new_class=t.object_class,
            old_status=old_status,
            new_status=t.status,
            operator=action.operator,
            ts=datetime.now(UTC),
            note=action.note,
        )
        self.review_events.append(event)
        return t, event

    def reprioritise(self, weights: PriorityWeights, survey_id: str | None = None) -> list[Target]:
        """Recompute priority for every target under new operator weights."""
        self.weights = weights
        pool = self.targets if survey_id is None else [
            t for t in self.targets if t.survey_id == survey_id
        ]
        for t in pool:
            t.priority = scoring.priority_of(t, weights)
        return sorted(pool, key=lambda t: t.priority, reverse=True)

    # -- rollups ----------------------------------------------------------- #

    def compute_stats(self, survey_id: str | None = None) -> Stats:
        items = self.list_targets(survey_id=survey_id)
        status_counts = Counter(t.status for t in items)
        class_counts = Counter(t.object_class for t in items)
        rejected = status_counts.get("rejected", 0)
        if survey_id and survey_id in self.surveys:
            surveyed_km2 = self.surveys[survey_id].surveyed_km2
        else:
            surveyed_km2 = _SURVEY_AREA_KM2 * max(len(self.surveys), 1)
        return Stats(
            total=len(items),
            confirmed=status_counts.get("confirmed", 0),
            review=status_counts.get("review", 0),
            candidate=status_counts.get("candidate", 0),
            rejected=rejected,
            by_class=[ClassCount(object_class=c, count=n) for c, n in class_counts.most_common()],
            mean_confidence=round(sum(t.confidence for t in items) / len(items), 3) if items else 0.0,
            high_priority=sum(1 for t in items if t.priority >= 0.7),
            surveyed_km2=round(surveyed_km2, 1),
            false_alarms_per_km2=round(rejected / surveyed_km2, 3) if surveyed_km2 else 0.0,
            region=get_settings().region_name,
        )

    def compute_metrics(self, survey_id: str | None = None) -> Metrics:
        items = self.list_targets(survey_id=survey_id)
        stats = self.compute_stats(survey_id=survey_id)
        confirmed = [t for t in items if t.status == "confirmed"]
        multi_ping = [t for t in confirmed if t.n_observations >= 3]

        # Reliability diagram: bucket by confidence, "accuracy" = confirmed share.
        bins: list[CalibrationBin] = []
        for lo in [i / 10 for i in range(0, 10, 2)]:
            hi = lo + 0.2
            bucket = [t for t in items if lo <= t.confidence < hi or (hi >= 1.0 and t.confidence == 1.0)]
            if bucket:
                acc = sum(1 for t in bucket if t.status == "confirmed") / len(bucket)
                bins.append(CalibrationBin(confidence=round(lo + 0.1, 2), accuracy=round(acc, 3), count=len(bucket)))

        stage_latency = [
            StageLatency(stage="alai_ingest", ms=180.0),
            StageLatency(stage="alai_preprocess", ms=240.0),
            StageLatency(stage="detect", ms=42.0),
            StageLatency(stage="valai_segment", ms=68.0),
            StageLatency(stage="nizhal_verify", ms=6.0),
            StageLatency(stage="artificiality", ms=3.0),
            StageLatency(stage="openset", ms=2.0),
            StageLatency(stage="thadam_track", ms=11.0),
            StageLatency(stage="geo_context", ms=9.0),
            StageLatency(stage="padai_prioritise", ms=1.0),
        ]

        # Monotonically-improving ablation ladder (report §11.3), demo values.
        ladder = [
            (1, "SSS-only detector, no preprocessing", 12.4, 0.61),
            (2, "+ sonar-correct preprocessing", 9.1, 0.66),
            (3, "+ synthetic pretraining", 7.0, 0.71),
            (4, "+ FiLM frequency conditioning", 5.6, 0.74),
            (5, "+ segmentation head", 4.4, 0.78),
            (6, "+ shadow-geometry verifier", 2.3, 0.80),
            (7, "+ artificiality + hard negatives", 1.4, 0.82),
            (8, "+ multi-ping persistence", 0.9, 0.83),
            (9, "+ bathymetric context", 0.6, 0.84),
            (10, "Full pipeline, edge-quantised", 0.7, 0.83),
        ]
        ablation = [
            AblationRung(step=s, config=c, false_alarms_per_km2=f, recall=r) for s, c, f, r in ladder
        ]

        return Metrics(
            survey_id=survey_id or "all",
            region=stats.region,
            surveyed_km2=stats.surveyed_km2,
            recall=0.83,
            false_alarms_per_km2=stats.false_alarms_per_km2,
            mean_confidence=stats.mean_confidence,
            localisation_error_m=3.4,
            pct_confirmed_multi_ping=round(len(multi_ping) / len(confirmed), 3) if confirmed else 0.0,
            calibration=bins,
            stage_latency=stage_latency,
            ablation=ablation,
        )


# Module singleton — one mutable store for the process.
store = Store()
