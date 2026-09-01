// Typed API client. Every backend call goes through here so the fixture/live
// swap stays invisible to components. Requests are proxied to FastAPI via
// next.config rewrites (/api/* -> 127.0.0.1:8000).

import type {
  Job,
  Metrics,
  PriorityWeights,
  ReviewAction,
  ReviewEvent,
  SimilarTarget,
  Stats,
  Survey,
  Target,
  WaveField,
} from "./types";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export interface TargetQuery {
  status?: string;
  class?: string;
  min_priority?: number;
}

export function fetchTargets(q: TargetQuery = {}): Promise<Target[]> {
  const params = new URLSearchParams();
  if (q.status) params.set("status", q.status);
  if (q.class) params.set("class", q.class);
  if (q.min_priority) params.set("min_priority", String(q.min_priority));
  const qs = params.toString();
  return get<Target[]>(`/api/targets${qs ? `?${qs}` : ""}`);
}

export function fetchTarget(id: string): Promise<Target> {
  return get<Target>(`/api/targets/${id}`);
}

export function fetchStats(): Promise<Stats> {
  return get<Stats>("/api/stats");
}

export function fetchWaves(): Promise<WaveField[]> {
  return get<WaveField[]>("/api/waves");
}

// -- surveys ---------------------------------------------------------------- //

export function fetchSurveys(): Promise<Survey[]> {
  return get<Survey[]>("/api/surveys");
}

export function fetchSurvey(id: string): Promise<Survey> {
  return get<Survey>(`/api/surveys/${id}`);
}

export function fetchSurveyTargets(id: string, q: TargetQuery = {}): Promise<Target[]> {
  const params = new URLSearchParams();
  if (q.status) params.set("status", q.status);
  if (q.class) params.set("class", q.class);
  if (q.min_priority) params.set("min_priority", String(q.min_priority));
  const qs = params.toString();
  return get<Target[]>(`/api/surveys/${id}/targets${qs ? `?${qs}` : ""}`);
}

export function ingestSurvey(id: string): Promise<Job> {
  return post<Job>(`/api/surveys/${id}/ingest`);
}

export function inferSurvey(id: string): Promise<Job> {
  return post<Job>(`/api/surveys/${id}/infer`);
}

/** Open an SSE stream for a running job. Caller owns closing the source. */
export function streamJob(
  jobId: string,
  onTick: (job: Job) => void,
  onDone?: () => void,
): EventSource {
  const es = new EventSource(`/api/jobs/${jobId}/stream`);
  es.onmessage = (ev) => {
    const job = JSON.parse(ev.data) as Job;
    onTick(job);
    if (job.state === "done" || job.state === "error") {
      es.close();
      onDone?.();
    }
  };
  es.onerror = () => {
    es.close();
    onDone?.();
  };
  return es;
}

// -- targets: similar + review --------------------------------------------- //

export function fetchSimilar(targetId: string, k = 6): Promise<SimilarTarget[]> {
  return get<SimilarTarget[]>(`/api/targets/${targetId}/similar?k=${k}`);
}

export function reviewTarget(targetId: string, action: ReviewAction): Promise<ReviewEvent> {
  return post<ReviewEvent>(`/api/targets/${targetId}/review`, action);
}

// -- analytics: queue, prioritise, metrics --------------------------------- //

export function fetchReviewQueue(): Promise<Target[]> {
  return get<Target[]>("/api/review-queue");
}

export function fetchWeights(): Promise<PriorityWeights> {
  return get<PriorityWeights>("/api/weights");
}

export function prioritise(weights: PriorityWeights): Promise<Target[]> {
  return post<Target[]>("/api/prioritise", weights);
}

export function fetchMetrics(): Promise<Metrics> {
  return get<Metrics>("/api/metrics");
}

export function exportUrl(surveyId: string, format: "geojson" | "csv" | "gpx" | "kml"): string {
  return `/api/surveys/${surveyId}/export?format=${format}`;
}
