// Typed API client. Every backend call goes through here so the fixture/live
// swap stays invisible to components. Requests are proxied to FastAPI via
// next.config rewrites (/api/* -> 127.0.0.1:8000).

import type { Stats, Target, WaveField } from "./types";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
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
