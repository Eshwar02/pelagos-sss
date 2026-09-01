"""Cleanup-priority scoring — the actual operational product (report §6.3).

    priority = w1*confidence + w2*entanglement + w3*reef_proximity
             + w4*diver_accessibility + w5*cluster_density

Exposed so the dashboard sliders can re-rank live. Pure arithmetic, no ML —
this is business logic, not a model.
"""

from __future__ import annotations

from app.schemas import PriorityWeights, Target


def _clamp(x: float) -> float:
    return max(0.0, min(1.0, x))


def reef_score(reef_proximity_m: float) -> float:
    """Closer to a reef → higher cleanup priority. Saturates at 1.2 km."""
    return _clamp(1 - reef_proximity_m / 1200)


def priority_of(t: Target, w: PriorityWeights) -> float:
    """Weighted cleanup priority for one target under operator weights."""
    total_w = w.confidence + w.entanglement + w.reef + w.access + w.cluster or 1.0
    raw = (
        w.confidence * t.confidence
        + w.entanglement * t.entanglement_risk
        + w.reef * reef_score(t.reef_proximity_m)
        + w.access * t.diver_accessibility
        + w.cluster * t.cluster_density
    )
    return round(_clamp(raw / total_w), 3)


def uncertainty_of(t: Target) -> float:
    """Active-learning score — how informative an operator label would be.

    Highest for detections sitting near the decision boundary or flagged as
    open-set novel; these are surfaced first in the review queue.
    """
    margin = 1 - abs(t.confidence - 0.5) * 2  # 1 at 0.5, 0 at 0/1
    return round(_clamp(0.6 * margin + 0.4 * t.evidence.open_set_novelty), 3)
