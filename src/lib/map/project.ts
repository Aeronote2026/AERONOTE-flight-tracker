import { geoConicConformal, type GeoProjection } from "d3-geo";
import spain from "./spain.generated.json";
import type { VisitedAerodrome } from "./types";

/**
 * Places an aerodrome on the Spain map drawing, using the exact projection
 * parameters saved by scripts/build-spain-map.mjs. Runs on the SERVER:
 * the browser only receives ready-made x/y positions.
 */
const p = spain.projection;
const make = (translate: number[]): GeoProjection =>
  geoConicConformal()
    .rotate(p.rotate as [number, number])
    .parallels(p.parallels as [number, number])
    .scale(p.scale)
    .translate(translate as [number, number]);

const mainland = make(p.mainlandTranslate);
const canary = make(p.canaryTranslate);

export function inCanaryInset(lon: number, lat: number): boolean {
  const [w, s, e, n] = p.canaryBox;
  return lon >= w && lon <= e && lat >= s && lat <= n;
}

/** Returns [x, y] in map units, or null if the point is not drawable. */
export function projectPoint(lon: number, lat: number): [number, number] | null {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  const xy = (inCanaryInset(lon, lat) ? canary : mainland)([lon, lat]);
  if (!xy) return null;
  const [x, y] = xy;
  // Anything outside the drawing (e.g. a foreign aerodrome) is left out.
  if (x < 0 || y < 0 || x > spain.width || y > spain.height) return null;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

export type ChartAerodrome = {
  icao: string;
  name: string;
  lat: number;
  lon: number;
  landings: number;
  x: number;
  y: number;
};

/** Projects a list of aerodromes; those that cannot be drawn are returned separately. */
export function projectAerodromes(list: VisitedAerodrome[]): {
  onMap: ChartAerodrome[];
  offMap: VisitedAerodrome[];
} {
  const onMap: ChartAerodrome[] = [];
  const offMap: VisitedAerodrome[] = [];
  for (const a of list) {
    const xy = projectPoint(a.lon, a.lat);
    if (xy) onMap.push({ icao: a.icao, name: a.name, lat: a.lat, lon: a.lon, landings: a.landings, x: xy[0], y: xy[1] });
    else offMap.push(a);
  }
  return { onMap, offMap };
}
