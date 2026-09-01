"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Loader2, CheckCircle2 } from "lucide-react";
import type { Job, Survey } from "@/lib/types";
import { fetchSurveys, inferSurvey, streamJob } from "@/lib/api";
import { STAGE_ORDER, STAGE_LABEL } from "@/lib/stages";

// Runs the full pipeline over a survey and streams stage progress via SSE —
// "the SSE progress stream ticks through named stages" (report demo script).
export function InferenceRunner() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [surveyId, setSurveyId] = useState<string>("");
  const [job, setJob] = useState<Job | null>(null);
  const [running, setRunning] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetchSurveys()
      .then((s) => {
        setSurveys(s);
        if (s.length) setSurveyId(s[0].id);
      })
      .catch(() => {});
    return () => esRef.current?.close();
  }, []);

  async function run() {
    if (!surveyId || running) return;
    setRunning(true);
    setJob(null);
    try {
      const created = await inferSurvey(surveyId);
      esRef.current = streamJob(
        created.id,
        (j) => setJob(j),
        () => setRunning(false),
      );
    } catch {
      setRunning(false);
    }
  }

  const activeIdx = job?.stage ? STAGE_ORDER.indexOf(job.stage) : -1;
  const done = job?.state === "done";

  return (
    <div className="w-64 rounded-lg border border-ocean-800 bg-ocean-900/90 p-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <select
          value={surveyId}
          onChange={(e) => setSurveyId(e.target.value)}
          disabled={running}
          className="mono flex-1 rounded-md border border-ocean-800 bg-ocean-950 px-2 py-1.5 text-[11px] text-[#cde3ef] outline-none"
        >
          {surveys.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id}
            </option>
          ))}
        </select>
        <button
          onClick={run}
          disabled={running || !surveyId}
          className="flex items-center gap-1.5 rounded-md bg-teal-400/90 px-3 py-1.5 text-[11px] font-medium text-ocean-950 transition-colors hover:bg-teal-300 disabled:opacity-60"
        >
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          Infer
        </button>
      </div>

      {(running || job) && (
        <div className="mt-3 space-y-1">
          {STAGE_ORDER.map((stage, i) => {
            const state = done || i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
            return (
              <div key={stage} className="flex items-center gap-2 text-[10px]">
                {state === "done" ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                ) : state === "active" ? (
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin text-teal-300" />
                ) : (
                  <span className="h-3 w-3 shrink-0 rounded-full border border-ocean-700" />
                )}
                <span className={state === "pending" ? "text-[#4d6377]" : "text-[#cde3ef]"}>
                  {STAGE_LABEL[stage]}
                </span>
              </div>
            );
          })}
          {done && (
            <div className="mono mt-1 text-[10px] text-emerald-300">
              ✓ pipeline complete · targets ranked
            </div>
          )}
        </div>
      )}
    </div>
  );
}
