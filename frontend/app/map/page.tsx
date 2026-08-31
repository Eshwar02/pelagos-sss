"use client";

import dynamic from "next/dynamic";
import { fetchTargets, fetchWaves } from "@/lib/api";
import { useAsync } from "@/lib/hooks";

// deck.gl / maplibre are browser-only.
const MapView = dynamic(() => import("@/components/map/MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-ocean-950 text-xs text-[#6b8299]">
      loading chart engine…
    </div>
  ),
});

export default function MapPage() {
  const targets = useAsync(() => fetchTargets());
  const waves = useAsync(fetchWaves);

  if (targets.error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-coral-500">
        Backend unreachable — start the API on :8000.
      </div>
    );
  }

  if (!targets.data) {
    return (
      <div className="flex h-full items-center justify-center bg-ocean-950 text-xs text-[#6b8299]">
        loading targets…
      </div>
    );
  }

  return <MapView targets={targets.data} waves={waves.data ?? []} />;
}
