import { SAMPLE_AERODROMES } from "./sampleAerodromes";
import { mergeAerodromes } from "./toGeoJson";
import type { VisitedAerodrome } from "./types";

/**
 * DEMONSTRATION ONLY: Spanish aerodromes shown as "not visited" in the
 * demo. Coordinates are APPROXIMATE and NOT verified against the AIP
 * España: they must never be used as definitive data.
 */
const DEMO_NOT_VISITED: [string, string, number, number][] = [
  ["LEAB", "Albacete", 38.9485, -1.8635], ["LEAL", "Alicante", 38.2822, -0.5582],
  ["LEAM", "Almería", 36.8439, -2.3701], ["LEAS", "Asturias", 43.5636, -6.0346],
  ["LEBB", "Bilbao", 43.3011, -2.9106], ["LEBG", "Burgos", 42.3576, -3.6206],
  ["LECO", "A Coruña", 43.3021, -8.3773], ["LEGE", "Girona", 41.901, 2.7606],
  ["LEGR", "Granada", 37.1887, -3.7774], ["LEHC", "Huesca", 42.0761, -0.3164],
  ["LEJR", "Jerez", 36.7446, -6.0601], ["LELO", "Logroño", 42.461, -2.3223],
  ["LEMI", "Región de Murcia", 37.803, -1.125], ["LEPP", "Pamplona", 42.77, -1.6463],
  ["LERS", "Reus", 41.1474, 1.1672], ["LESO", "San Sebastián", 43.3565, -1.7906],
  ["LEST", "Santiago", 42.8963, -8.4151], ["LEXJ", "Santander", 43.4271, -3.82],
  ["LEVD", "Valladolid", 41.7061, -4.8519], ["LEVT", "Vitoria", 42.8828, -2.7245],
  ["LEVX", "Vigo", 42.2318, -8.6268], ["LEBZ", "Badajoz", 38.8913, -6.8213],
  ["LEBA", "Córdoba", 37.842, -4.8488], ["GCFV", "Fuerteventura", 28.4527, -13.8638],
  ["GCLA", "La Palma", 28.6265, -17.7556], ["GCHI", "El Hierro", 27.8148, -17.8871],
  ["GCGM", "La Gomera", 28.0296, -17.2146],
];

/** Visited demo aerodromes (merged) plus not-visited demo aerodromes. */
export function demoAerodromes(): VisitedAerodrome[] {
  const visited = mergeAerodromes(SAMPLE_AERODROMES);
  const known = new Set(visited.map((a) => a.icao));
  const notVisited = DEMO_NOT_VISITED.filter(([icao]) => !known.has(icao)).map(
    ([icao, name, lat, lon]): VisitedAerodrome => ({
      icao, name, lat, lon, country: "ES", zone: icao.startsWith("GC") ? "canarias" : "peninsula", landings: 0,
    }),
  );
  return [...visited, ...notVisited];
}
