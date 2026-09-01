"use client";

import { useState } from "react";
import { Check, X, Tag } from "lucide-react";
import type { ObjectClass, ReviewActionKind, Target } from "@/lib/types";
import { CLASS_LABEL } from "@/lib/palette";
import { reviewTarget } from "@/lib/api";

const CLASSES: ObjectClass[] = [
  "ghost_net", "gillnet", "trawl_net", "rope", "fishing_trap", "pipe", "wreck", "unknown_artificial",
];

// Confirm / reject / reclassify → writes to the active-learning queue (§6.5).
export function ReviewActions({
  target,
  onReviewed,
}: {
  target: Target;
  onReviewed?: (updated: Target) => void;
}) {
  const [busy, setBusy] = useState<ReviewActionKind | null>(null);
  const [reclassing, setReclassing] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function run(action: ReviewActionKind, newClass?: ObjectClass) {
    setBusy(action);
    try {
      const ev = await reviewTarget(target.id, { action, new_class: newClass });
      setDone(`${action} → ${ev.new_status}`);
      onReviewed?.({
        ...target,
        status: ev.new_status,
        class: ev.new_class,
      });
    } catch (e) {
      setDone((e as Error).message);
    } finally {
      setBusy(null);
      setReclassing(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={() => run("confirm")}
          disabled={busy !== null}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" /> Confirm
        </button>
        <button
          onClick={() => run("reject")}
          disabled={busy !== null}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 py-2 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" /> Reject
        </button>
        <button
          onClick={() => setReclassing((v) => !v)}
          disabled={busy !== null}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 py-2 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
        >
          <Tag className="h-3.5 w-3.5" /> Reclassify
        </button>
      </div>

      {reclassing && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {CLASSES.filter((c) => c !== target.class).map((c) => (
            <button
              key={c}
              onClick={() => run("reclassify", c)}
              className="rounded-md border border-ocean-800 bg-ocean-900 px-2 py-1.5 text-left text-[11px] text-[#cde3ef] transition-colors hover:bg-ocean-800"
            >
              {CLASS_LABEL[c]}
            </button>
          ))}
        </div>
      )}

      {done && <div className="mono mt-2 text-[11px] text-teal-300">✓ {done}</div>}
    </div>
  );
}
