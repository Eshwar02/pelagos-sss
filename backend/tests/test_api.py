"""End-to-end API tests for the Kadal Netra surface.

Each test rebuilds the store so review mutations don't leak between tests.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app.services.store as store_mod
from app.main import app


@pytest.fixture(autouse=True)
def fresh_store():
    """Reset the in-memory store to its fixture seed before every test."""
    store_mod.store = store_mod.Store()
    yield


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_surveys_seeded_from_targets(client):
    surveys = client.get("/api/surveys").json()
    assert surveys
    sid = surveys[0]["id"]
    targets = client.get(f"/api/surveys/{sid}/targets").json()
    assert all(t["survey_id"] == sid for t in targets)
    assert surveys[0]["n_targets"] == len(targets)


def test_targets_sorted_by_priority(client):
    targets = client.get("/api/targets").json()
    prio = [t["priority"] for t in targets]
    assert prio == sorted(prio, reverse=True)


def test_similar_returns_ranked_neighbours(client):
    tid = client.get("/api/targets").json()[0]["id"]
    sims = client.get(f"/api/targets/{tid}/similar?k=5").json()
    assert len(sims) == 5
    scores = [s["similarity"] for s in sims]
    assert scores == sorted(scores, reverse=True)
    assert all(s["target"]["id"] != tid for s in sims)


def test_similar_404(client):
    assert client.get("/api/targets/NOPE/similar").status_code == 404


def test_review_confirm_changes_status(client):
    tid = client.get("/api/targets").json()[0]["id"]
    ev = client.post(f"/api/targets/{tid}/review", json={"action": "confirm"}).json()
    assert ev["new_status"] == "confirmed"
    assert client.get(f"/api/targets/{tid}").json()["status"] == "confirmed"


def test_review_reject(client):
    tid = client.get("/api/targets").json()[0]["id"]
    client.post(f"/api/targets/{tid}/review", json={"action": "reject"})
    assert client.get(f"/api/targets/{tid}").json()["status"] == "rejected"


def test_review_reclassify_requires_new_class(client):
    tid = client.get("/api/targets").json()[0]["id"]
    r = client.post(f"/api/targets/{tid}/review", json={"action": "reclassify"})
    assert r.status_code == 422


def test_review_reclassify_sets_class(client):
    tid = client.get("/api/targets").json()[0]["id"]
    client.post(f"/api/targets/{tid}/review", json={"action": "reclassify", "new_class": "wreck"})
    got = client.get(f"/api/targets/{tid}").json()
    assert got["class"] == "wreck"
    assert got["status"] == "confirmed"


def test_prioritise_reranks(client):
    # Weight confidence to the exclusion of all else → top target has max confidence.
    weights = {"confidence": 1.0, "entanglement": 0.0, "reef": 0.0, "access": 0.0, "cluster": 0.0}
    ranked = client.post("/api/prioritise", json=weights).json()
    top = ranked[0]
    assert top["confidence"] == max(t["confidence"] for t in ranked)
    # priority now equals confidence under this weighting.
    assert abs(top["priority"] - top["confidence"]) < 1e-6


def test_review_queue_sorted_by_uncertainty(client):
    q = client.get("/api/review-queue").json()
    assert all(t["status"] != "rejected" for t in q)


@pytest.mark.parametrize("fmt,needle", [
    ("geojson", "FeatureCollection"),
    ("csv", "id,class,status"),
    ("gpx", "<gpx"),
    ("kml", "<kml"),
])
def test_export_formats(client, fmt, needle):
    sid = client.get("/api/surveys").json()[0]["id"]
    r = client.get(f"/api/surveys/{sid}/export?format={fmt}")
    assert r.status_code == 200
    assert needle in r.text
    assert "attachment" in r.headers["content-disposition"]


def test_export_bad_format(client):
    sid = client.get("/api/surveys").json()[0]["id"]
    assert client.get(f"/api/surveys/{sid}/export?format=shapefile").status_code == 422


def test_metrics_shape(client):
    m = client.get("/api/metrics").json()
    assert m["recall"] > 0
    assert len(m["ablation"]) == 10
    # ablation false-alarm rate is broadly decreasing across the ladder.
    fa = [r["false_alarms_per_km2"] for r in m["ablation"]]
    assert fa[0] > fa[-1]
    assert len(m["stage_latency"]) == 10


def test_dzi_descriptor(client):
    sid = client.get("/api/surveys").json()[0]["id"]
    d = client.get(f"/api/tiles/{sid}/dzi").json()
    assert d["height"] > d["width"]
    assert d["tile_size"] == 256


def test_infer_job_and_stream(client):
    sid = client.get("/api/surveys").json()[0]["id"]
    job = client.post(f"/api/surveys/{sid}/infer").json()
    assert job["state"] == "queued"
    with client.stream("GET", f"/api/jobs/{job['id']}/stream") as r:
        events = [ln for ln in r.iter_lines() if ln.startswith("data:")]
    # full pipeline = 10 stages + final complete event.
    assert len(events) == 11
    assert "complete" in events[-1]
