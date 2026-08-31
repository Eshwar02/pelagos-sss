"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer, PolygonLayer, LineLayer } from "@deck.gl/layers";
import type { Target, WaveField } from "@/lib/types";
import { CLASS_HEX, priorityHex, hexToRgb, CLASS_LABEL, STATUS_LABEL } from "@/lib/palette";
import { OCEAN_STYLE, REGION_BBOX, REGION_CENTER } from "./mapStyle";
import { Legend } from "./Legend";
import { meters, pct } from "@/lib/format";
import { Layers, Waves as WavesIcon } from "lucide-react";

type Mode = "priority" | "class";
interface HoverInfo {
  x: number;
  y: number;
  target: Target;
}

// Meteorological direction (coming-from) -> unit vector going-to, in lon/lat space.
function dirVec(dirDeg: number): [number, number] {
  const theta = ((dirDeg + 180) * Math.PI) / 180;
  return [Math.sin(theta), Math.cos(theta)];
}

function hsColor(hs: number): [number, number, number] {
  if (hs >= 1.8) return [251, 146, 60];
  if (hs >= 1.4) return [45, 212, 191];
  if (hs >= 1.0) return [76, 201, 240];
  return [96, 165, 250];
}

// Deterministic per-cell phase offset so waves don't march in lockstep.
function hash(lon: number, lat: number): number {
  return (Math.sin(lon * 12.9898 + lat * 78.233) * 43758.5453) % 1;
}

export function MapView({ targets, waves }: { targets: Target[]; waves: WaveField[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);
  const hoverRef = useRef<HoverInfo | null>(null);

  const [mode, setMode] = useState<Mode>("priority");
  const [showWaves, setShowWaves] = useState(true);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [ready, setReady] = useState(false);

  const bboxLayer = useCallback(
    () =>
      new PolygonLayer({
        id: "region-bbox",
        data: [
          [
            [REGION_BBOX[0], REGION_BBOX[1]],
            [REGION_BBOX[2], REGION_BBOX[1]],
            [REGION_BBOX[2], REGION_BBOX[3]],
            [REGION_BBOX[0], REGION_BBOX[3]],
          ],
        ],
        getPolygon: (d) => d as number[][],
        stroked: true,
        filled: true,
        getFillColor: [22, 69, 95, 40],
        getLineColor: [45, 212, 191, 120],
        getLineWidth: 1,
        lineWidthUnits: "pixels",
      }),
    [],
  );

  const targetLayer = useCallback(
    (h: HoverInfo | null) =>
      new ScatterplotLayer<Target>({
        id: "targets",
        data: targets,
        pickable: true,
        stroked: true,
        radiusUnits: "meters",
        radiusMinPixels: 5,
        radiusMaxPixels: 26,
        lineWidthMinPixels: 1,
        getPosition: (t) => [t.lon, t.lat],
        getRadius: (t) => 60 + t.priority * 260,
        getFillColor: (t) => {
          const hex = mode === "priority" ? priorityHex(t.priority) : CLASS_HEX[t.class];
          const [r, g, b] = hexToRgb(hex);
          return [r, g, b, 190];
        },
        getLineColor: (t) =>
          h && h.target.id === t.id ? [255, 255, 255, 255] : [4, 16, 26, 160],
        getLineWidth: (t) => (h && h.target.id === t.id ? 3 : 1),
        updateTriggers: {
          getFillColor: [mode],
          getLineColor: [h?.target.id],
          getLineWidth: [h?.target.id],
        },
        onHover: (info) => {
          const next = info.object
            ? { x: info.x, y: info.y, target: info.object as Target }
            : null;
          hoverRef.current = next;
          setHover(next);
        },
      }),
    [targets, mode],
  );

  const waveLayer = useCallback(
    (phase: number) => {
      if (!showWaves || waves.length === 0) return null;
      const cells = waves[0].cells;
      const span = 0.055; // travel distance per cycle (deg)
      const segments = cells.map((c) => {
        const [ux, uy] = dirVec(c.dir);
        const u = (phase * 0.35 + hash(c.lon, c.lat) + 1) % 1; // 0..1 travelling param
        const ox = ux * u * span;
        const oy = uy * u * span;
        const len = 0.01 + (c.hs / 2.2) * 0.02;
        const fade = Math.sin(u * Math.PI); // fade in/out at wrap ends
        const [r, g, b] = hsColor(c.hs);
        return {
          s: [c.lon + ox, c.lat + oy] as [number, number],
          t: [c.lon + ox + ux * len, c.lat + oy + uy * len] as [number, number],
          color: [r, g, b, Math.round(60 + fade * 150)] as [number, number, number, number],
          width: 1 + (c.hs / 2.2) * 2.5,
        };
      });
      return new LineLayer({
        id: "waves",
        data: segments,
        getSourcePosition: (d) => d.s,
        getTargetPosition: (d) => d.t,
        getColor: (d) => d.color,
        getWidth: (d) => d.width,
        widthUnits: "pixels",
      });
    },
    [showWaves, waves],
  );

  const pushLayers = useCallback(() => {
    if (!overlayRef.current) return;
    overlayRef.current.setProps({
      layers: [bboxLayer(), waveLayer(phaseRef.current), targetLayer(hoverRef.current)].filter(
        Boolean,
      ),
    });
  }, [bboxLayer, waveLayer, targetLayer]);

  // Init map + overlay once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OCEAN_STYLE,
      center: REGION_CENTER,
      zoom: 10.4,
      attributionControl: false,
      antialias: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const overlay = new MapboxOverlay({ interleaved: false, layers: [] });
    map.addControl(overlay);
    mapRef.current = map;
    overlayRef.current = overlay;
    map.on("load", () => setReady(true));
    return () => {
      cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  // Animation loop for the wave field.
  useEffect(() => {
    if (!ready) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (showWaves) phaseRef.current += dt;
      pushLayers();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, showWaves, pushLayers]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* Controls */}
      <div className="absolute left-4 top-4 z-10 flex gap-2">
        <div className="flex overflow-hidden rounded-lg border border-ocean-800 bg-ocean-900/85 backdrop-blur">
          {(["priority", "class"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] capitalize transition-colors ${
                mode === m ? "bg-ocean-700 text-white" : "text-[#8aa6bb] hover:text-white"
              }`}
            >
              <Layers className="h-3 w-3" />
              {m}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowWaves((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border border-ocean-800 px-3 py-1.5 text-[11px] backdrop-blur transition-colors ${
            showWaves
              ? "bg-teal-400/15 text-teal-300"
              : "bg-ocean-900/85 text-[#8aa6bb] hover:text-white"
          }`}
        >
          <WavesIcon className="h-3 w-3" />
          Wave field
          {waves[0] && (
            <span className="mono ml-1 text-[9px] opacity-70">{waves[0].source}</span>
          )}
        </button>
      </div>

      <Legend mode={mode} />

      {/* Hover tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute z-20 w-52 rounded-lg border border-ocean-700 bg-ocean-950/95 p-3 text-xs shadow-xl"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <div className="mono mb-1 flex items-center justify-between text-[#cde3ef]">
            <span>{hover.target.id}</span>
            <span style={{ color: priorityHex(hover.target.priority) }}>
              {hover.target.priority.toFixed(2)}
            </span>
          </div>
          <div className="text-[13px] font-medium text-white">
            {CLASS_LABEL[hover.target.class]}
          </div>
          <div className="mt-1.5 space-y-0.5 text-[#8aa6bb]">
            <Row k="Status" v={STATUS_LABEL[hover.target.status]} />
            <Row k="Confidence" v={pct(hover.target.confidence)} />
            <Row k="Depth" v={meters(hover.target.depth_m)} />
            <Row k="Observations" v={`${hover.target.n_observations} pings`} />
            <Row k="Reef proximity" v={meters(hover.target.reef_proximity_m)} />
          </div>
        </div>
      )}

      {!ready && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-ocean-950">
          <span className="text-xs text-[#6b8299]">initialising chart…</span>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span>{k}</span>
      <span className="text-[#cde3ef]">{v}</span>
    </div>
  );
}
