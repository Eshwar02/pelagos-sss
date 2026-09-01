"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutDashboard, Map, ScanEye, Route, BarChart3, Waves } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Target Map", icon: Map },
  { href: "/review", label: "Review Console", icon: ScanEye },
  { href: "/plan", label: "Dive Plan", icon: Route },
  { href: "/metrics", label: "Metrics", icon: BarChart3 },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-ocean-800 bg-ocean-900">
      <div className="flex items-center gap-2 px-5 py-5">
        <Waves className="h-6 w-6 text-teal-400" />
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wide text-white">
            pelagos<span className="text-teal-400">-sss</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-ocean-700">
            Marine Debris Ops
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "group mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-ocean-800 text-white"
                  : "text-[#8aa6bb] hover:bg-ocean-850 hover:text-white",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{label}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ocean-800 px-5 py-4 text-[10px] leading-relaxed text-ocean-700">
        Gulf of Mannar · Palk Strait
        <br />
        SIH 2026 · prototype
      </div>
    </aside>
  );
}
