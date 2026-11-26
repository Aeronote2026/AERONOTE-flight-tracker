import type { VisitedAerodrome } from "./types";

/**
 * Combines entries for the same aerodrome into ONE point, adding up their
 * landings. Entries are matched by ICAO code (case-insensitive). Entries
 * with invalid coordinates or codes are left out.
 * Result is sorted by landings (most first), then ICAO.
 */
export function mergeAerodromes(entries: VisitedAerodrome[]): VisitedAerodrome[] {
  const byIcao = new Map<string, VisitedAerodrome>();
  for (const entry of entries) {
    const icao = entry.icao.trim().toUpperCase();
    const validCode = /^[A-Z]{4}$/.test(icao);
    const validPosition =
      Number.isFinite(entry.lat) && Number.isFinite(entry.lon) &&
      Math.abs(entry.lat) <= 90 && Math.abs(entry.lon) <= 180;
    if (!validCode || !validPosition) continue;

    const landings = Number.isInteger(entry.landings) && entry.landings > 0 ? entry.landings : 0;
    const existing = byIcao.get(icao);
    if (existing) {
      existing.landings += landings;
    } else {
      byIcao.set(icao, { ...entry, icao, landings });
    }
  }
  return [...byIcao.values()].sort(
    (a, b) => b.landings - a.landings || a.icao.localeCompare(b.icao),
  );
}

/** Marker size class from the number of landings. */
export function markerSize(landings: number): "s" | "m" | "l" {
  if (landings >= 10) return "l";
  if (landings >= 3) return "m";
  return "s";
}

/** Text for the landings line, e.g. "1 aterrizaje", "38 aterrizajes". */
export function landingsLabel(landings: number): string {
  return `${landings} ${landings === 1 ? "aterrizaje" : "aterrizajes"}`;
}

/** GeoJSON with one Point feature per aerodrome (for layers or export). */
export function toGeoJson(entries: VisitedAerodrome[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: mergeAerodromes(entries).map((a) => ({
      type: "Feature",
      id: a.icao,
      geometry: { type: "Point", coordinates: [a.lon, a.lat] },
      properties: { icao: a.icao, name: a.name, landings: a.landings, zone: a.zone },
    })),
  };
}

/** Faint latitude/longitude grid every `step` degrees, like a chart. */
export function graticule(
  [west, south, east, north]: [number, number, number, number],
  step = 1,
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  for (let lon = Math.ceil(west / step) * step; lon <= east; lon += step) {
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[lon, south], [lon, north]] } });
  }
  for (let lat = Math.ceil(south / step) * step; lat <= north; lat += step) {
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[west, lat], [east, lat]] } });
  }
  return { type: "FeatureCollection", features };
}
