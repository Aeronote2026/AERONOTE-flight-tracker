/**
 * Loaded only in the browser (dynamic import from AviationMap), because
 * MapLibre needs `window` and WebGL. The worker setup follows the official
 * MapLibre guide for Next.js 15+ with Turbopack.
 */
import { setWorkerUrl } from "maplibre-gl";

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());

export * from "maplibre-gl";
