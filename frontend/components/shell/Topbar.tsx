"use client";

import { usePathname } from "next/navigation";
import { Circle } from "lucide-react";

const TITLES: Record<string, string> = {
  "/": "Operations Dashboard",
  "/map": "Target Map",
};

export function Topbar() {
  const path = usePathname();
  const title = TITLES[path] ?? "pelagos-sss";
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-ocean-800 bg-ocean-900/60 px-6 backdrop-blur">
      <h1 className="text-sm font-medium tracking-wide text-white">{title}</h1>
      <div className="flex items-center gap-4 text-xs text-[#8aa6bb]">
        <span className="mono">EPSG:4326</span>
        <span className="flex items-center gap-1.5">
          <Circle className="h-2 w-2 fill-teal-400 text-teal-400" />
          backend online
        </span>
      </div>
    </header>
  );
}
