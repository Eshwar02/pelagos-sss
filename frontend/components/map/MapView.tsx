"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ScatterplotLayer, PolygonLayer } from "@deck.gl/layers";
import type { Target, WaveField } from "@/lib/types";
import { CLASS_HEX, priorityHex, hexToRgb, CLASS_LABEL, STATUS_LABEL } from "@/lib/palette";
import { OCEAN_STYLE, REGION_BBOX, REGION_CENTER, WORLD_CENTER, WORLD_ZOOM } from "./mapStyle";
import { createWaterLayer, type WaterHandle } from "./WaterLayer";
import { Legend } from "./Legend";
import { WaveLegend } from "./WaveLegend";
import { UploadControl } from "./UploadControl";
import { InferenceRunner } from "./InferenceRunner";
import { TargetDetail } from "@/components/detail/TargetDetail";
import { meters, pct } from "@/lib/format";
import { Layers, Waves as WavesIcon, Crosshair, Pause, Play } from "lucide-react";

type Mode = "priority" | "class";
interface HoverInfo {
  x: number;
  y: number;
  target: Target;
}

// Mean significant wave height across the current forecast timestep.
function meanHs(waves: WaveField[]): number {
  if (!waves.length) return 1.3;
  const cells = waves[0].cells;
  return cells.reduce((s, c) => s + c.hs, 0) / cells.length;
}
// Map mean Hs -> 0..1 animation intensity.
function toIntensity(hs: number): number {
  return Math.max(0, Math.min(1, (hs - 0.8) / 1.6));
}

export function MapView({ targets, waves }: { targets: Target[]; waves: WaveField[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const waterRef = useRef<WaterHandle | null>(null);
  const hoverRef = useRef<HoverInfo | null>(null);

  const [mode, setMode] = useState<Mode>("priority");
  const [waterOn, setWaterOn] = useState(true);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [ready, setReady] = useState(false);
  const [extraTargets, setExtraTargets] = useState<Target[]>([]);
  const [selected, setSelected] = useState<Target | null>(null);
  const [reviewed, setReviewed] = useState<Record<string, Target>>({});

  const hs = meanHs(waves);
  const intensity = toIntensity(hs);
  const baseTargets = extraTargets.length ? [...targets, ...extraTargets] : targets;
  const allTargets = baseTargets.map((t) => reviewed[t.id] ?? t);

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
        filled: false,
        getLineColor: [94, 234, 212, 180],
        getLineWidth: 1.5,
        lineWidthUnits: "pixels",
      }),
    [],
  );

  const targetLayer = useCallback(
    (h: HoverInfo | null) =>
      new ScatterplotLayer<Target>({
        id: "targets",
        data: allTargets,
        pickable: true,
        stroked: true,
        radiusUnits: "meters",
        radiusMinPixels: 5,
        radiusMaxPixels: 30,
        lineWidthMinPixels: 1,
        getPosition: (t) => [t.lon, t.lat],
        getRadius: (t) => 60 + t.priority * 260,
        getFillColor: (t) => {
          const hex = mode === "priority" ? priorityHex(t.priority) : CLASS_HEX[t.class];
          const [r, g, b] = hexToRgb(hex);
          return [r, g, b, 210];
        },
        getLineColor: (t) =>
          h && h.target.id === t.id ? [255, 255, 255, 255] : [4, 16, 26, 200],
        getLineWidth: (t) => (h && h.target.id === t.id ? 3 : 1),
        updateTriggers: {
          getFillColor: [mode, allTargets],
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
        onClick: (info) => {
          if (info.object) setSelected(info.object as Target);
        },
      }),
    [allTargets, mode],
  );

  const pushLayers = useCallback(() => {
    overlayRef.current?.setProps({
      layers: [bboxLayer(), targetLayer(hoverRef.current)],
    });
  }, [bboxLayer, targetLayer]);

  // Init map, water layer, land, deck overlay — once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OCEAN_STYLE,
      center: WORLD_CENTER,
      zoom: WORLD_ZOOM,
      minZoom: 1,
      maxZoom: 16,
      attributionControl: false,
      antialias: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const overlay = new MapboxOverlay({ interleaved: false, layers: [] });
    map.addControl(overlay);
    mapRef.current = map;
    overlayRef.current = overlay;

    map.on("load", () => {
      // 1) Animated water fills the world (bottom, above the background).
      const water = createWaterLayer(map);
      water.setIntensity(intensity);
      map.addLayer(water.layer);
      waterRef.current = water;

      // 2) Land masses on top of the water.
      map.addSource("land", { type: "geojson", data: "/geo/land-50m.geojson" });
      map.addLayer({
        id: "land-fill",
        type: "fill",
        source: "land",
        paint: { "fill-color": "#071620", "fill-opacity": 0.92 },
      });
      map.addLayer({
        id: "land-outline",
        type: "line",
        source: "land",
        paint: { "line-color": "#1c4a6e", "line-width": 0.6 },
      });

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
      waterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push deck layers when data/mode/hover change.
  useEffect(() => {
    if (ready) pushLayers();
  }, [ready, pushLayers, hover]);

  // Reflect wave intensity + play/pause into the water shader.
  useEffect(() => {
    waterRef.current?.setIntensity(intensity);
  }, [intensity]);
  useEffect(() => {
    waterRef.current?.setRunning(waterOn);
  }, [waterOn]);

  const flyToRegion = () =>
    mapRef.current?.flyTo({ center: REGION_CENTER, zoom: 10.5, duration: 1800 });
  const flyToWorld = () =>
    mapRef.current?.flyTo({ center: WORLD_CENTER, zoom: WORLD_ZOOM, duration: 1400 });

  const handleAnalysed = (fresh: Target[]) => {
    setExtraTargets((prev) => [...prev, ...fresh]);
    flyToRegion();
  };

  const handleReviewed = (updated: Target) => {
    setReviewed((prev) => ({ ...prev, [updated.id]: updated }));
    setSelected((s) => (s && s.id === updated.id ? updated : s));
  };

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* Controls */}
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
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
          onClick={() => setWaterOn((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border border-ocean-800 px-3 py-1.5 text-[11px] backdrop-blur transition-colors ${
            waterOn ? "bg-teal-400/15 text-teal-300" : "bg-ocean-900/85 text-[#8aa6bb] hover:text-white"
          }`}
        >
          {waterOn ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          <WavesIcon className="h-3 w-3" />
          Waves
          <span className="mono ml-1 text-[9px] opacity-70">
            Hs·{Math.round(intensity * 100)}% {waves[0]?.source ?? ""}
          </span>
        </button>

        <button
          onClick={flyToRegion}
          className="flex items-center gap-1.5 rounded-lg border border-ocean-800 bg-ocean-900/85 px-3 py-1.5 text-[11px] text-[#8aa6bb] backdrop-blur transition-colors hover:text-white"
        >
          <Crosshair className="h-3 w-3" />
          Gulf of Mannar
        </button>
        <button
          onClick={flyToWorld}
          className="rounded-lg border border-ocean-800 bg-ocean-900/85 px-3 py-1.5 text-[11px] text-[#8aa6bb] backdrop-blur transition-colors hover:text-white"
        >
          World
        </button>
      </div>

      {/* Inference runner, top-right (below nav control) */}
      <div className="absolute right-4 top-20 z-10">
        <InferenceRunner />
      </div>

      {/* Legends, bottom-right */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
        {waterOn && <WaveLegend meanHs={hs} />}
        <Legend mode={mode} />
      </div>

      {/* Upload FAB, bottom-left */}
      <UploadControl onAnalysed={handleAnalysed} />

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
          <div className="text-[13px] font-medium text-white">{CLASS_LABEL[hover.target.class]}</div>
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

      {selected && (
        <TargetDetail
          target={selected}
          onClose={() => setSelected(null)}
          onReviewed={handleReviewed}
          onSelect={setSelected}
        />
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
