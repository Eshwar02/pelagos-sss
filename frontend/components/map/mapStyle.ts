import type { StyleSpecification } from "maplibre-gl";

// Self-contained dark-ocean basemap. No external tile server -> renders instantly,
// works with no network, and reads as a survey instrument. Swap for OpenFreeMap /
// a self-hosted PMTiles bathymetry style for production detail.
export const OCEAN_STYLE: StyleSpecification = {
  version: 8,
  name: "pelagos-ocean",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#04101a" },
    },
  ],
};

// Gulf of Mannar / Palk Strait theatre.
export const REGION_BBOX: [number, number, number, number] = [78.9, 8.75, 79.45, 9.35];
export const REGION_CENTER: [number, number] = [
  (REGION_BBOX[0] + REGION_BBOX[2]) / 2,
  (REGION_BBOX[1] + REGION_BBOX[3]) / 2,
];
