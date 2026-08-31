import type { ClassCount } from "@/lib/types";
import { CLASS_HEX, CLASS_LABEL } from "@/lib/palette";

export function ClassBreakdown({ items }: { items: ClassCount[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="rounded-xl border border-ocean-800 bg-ocean-900 p-5">
      <h2 className="mb-4 text-sm font-medium text-white">Debris taxonomy</h2>
      <div className="space-y-2.5">
        {items.map(({ class: cls, count }) => (
          <div key={cls} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-xs text-[#8aa6bb]">{CLASS_LABEL[cls]}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-ocean-800">
              <div
                className="h-full rounded-full"
                style={{ width: `${(count / max) * 100}%`, backgroundColor: CLASS_HEX[cls] }}
              />
            </div>
            <span className="mono w-6 text-right text-xs text-[#cde3ef]">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
