"""In-memory job registry and the SSE stage stream (report §9 /jobs/{id}/stream).

The demo centrepiece: running inference ticks the progress bar through the named
subsystems — Alai, detector, Nizhal, Valai, Thadam, Padai — so the architecture
is legible without a diagram. No Celery/Redis; an in-process registry is the
correct hackathon answer and ships in twenty minutes.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import AsyncIterator

from app.schemas import Job, JobKind, PipelineStage

# Human-facing stage captions, in execution order.
_STAGE_FLOW: list[tuple[PipelineStage, str]] = [
    ("alai_ingest", "Alai · ingesting XTF / PNG pings"),
    ("alai_preprocess", "Alai · slant-range + TVG + speckle, tiling"),
    ("detect", "Detector · YOLOv11 + FiLM candidates"),
    ("valai_segment", "Valai · SegFormer masks on candidates"),
    ("nizhal_verify", "Nizhal · shadow-geometry physics check"),
    ("artificiality", "Verifier · natural / artificial classification"),
    ("openset", "Open-set · routing unknown anomalies to review"),
    ("thadam_track", "Thadam · multi-ping geographic association"),
    ("geo_context", "Geo · GEBCO depth / slope / roughness"),
    ("padai_prioritise", "Padai · cleanup-priority ranking + dive plan"),
]

# Ingest only runs the front of the pipeline.
_INGEST_FLOW = _STAGE_FLOW[:2]

_JOBS: dict[str, Job] = {}


def create_job(survey_id: str, kind: JobKind) -> Job:
    job = Job(id=f"job_{uuid.uuid4().hex[:10]}", survey_id=survey_id, kind=kind, state="queued")
    _JOBS[job.id] = job
    return job


def get_job(job_id: str) -> Job | None:
    return _JOBS.get(job_id)


async def stream(job_id: str, tick: float = 0.45) -> AsyncIterator[str]:
    """Yield Server-Sent Events as the job walks its pipeline stages."""
    job = _JOBS.get(job_id)
    if job is None:
        yield _sse({"error": "job not found"})
        return

    flow = _INGEST_FLOW if job.kind == "ingest" else _STAGE_FLOW
    job.state = "running"
    n = len(flow)
    for i, (stage, caption) in enumerate(flow, start=1):
        job.stage = stage
        job.progress = round(i / n, 3)
        job.message = caption
        yield _sse(job.model_dump())
        await asyncio.sleep(tick)

    job.state = "done"
    job.progress = 1.0
    job.message = "complete"
    yield _sse(job.model_dump())


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"
