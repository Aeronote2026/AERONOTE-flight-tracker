#!/usr/bin/env node
/**
 * Builds the vector cartography for My Aviation Map (Spain).
 *
 *   node scripts/build-spain-map.mjs
 *
 * Output: src/lib/map/spain.generated.json — projected SVG path data
 * plus the projection parameters, so the app never ships a map library
 * to the browser and needs no external map service.
 *
 * Sources (see src/lib/map/CREDITS.md):
 *  - Spain: IGN / CNIG "Líneas límite jurisdiccionales" (BDLJE), via the
 *    npm package es-atlas 0.6.0. Licence CC BY 4.0 (Orden FOM/2807/2015).
 *    This output is a DERIVED WORK (simplified and reprojected).
 *  - Neighbouring countries: Natural Earth 1:10m, via world-atlas 2.0.2
 *    (public domain).
 *
 * Gibraltar is drawn neutrally as a neighbouring territory: it is NOT
 * part of Spain's land fill, coastline or internal boundaries, and it has
 * no label.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import * as d3geo from "d3-geo";
import * as d3path from "d3-path";
import { feature, mesh } from "topojson-client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

// d3-composite-projections only publishes a UMD bundle that Node cannot
// import directly from an ESM package; evaluate it in a sandbox.
function loadSpainProjection() {
  const mod = { exports: {} };
  vm.runInNewContext(read("node_modules/d3-composite-projections/d3-composite-projections.js"), {
    exports: mod.exports,
    module: mod,
    require: (name) => (name === "d3-geo" ? d3geo : name === "d3-path" ? d3path : null),
    globalThis: {},
  });
  return mod.exports.geoConicConformalSpain;
}

const es = JSON.parse(read("node_modules/es-atlas/es/provinces.json"));
const world = JSON.parse(read("node_modules/world-atlas/countries-10m.json"));

const W = 1000;
const H = 760;
const isGibraltar = (g) => /gibraltar/i.test(g?.properties?.name ?? "");
const isCanarias = (g) => /canarias/i.test(g?.properties?.name ?? "");

const regions = feature(es, es.objects.autonomous_regions).features;
const spainRegions = regions.filter((f) => !isGibraltar(f));
const gibraltar = regions.filter(isGibraltar);

const projection = loadSpainProjection()().fitExtent(
  [[40, 30], [W - 30, H - 30]],
  { type: "FeatureCollection", features: spainRegions },
);
const toPath = d3geo.geoPath(projection);
// One decimal place is ~0.1 px: plenty for a 1000-unit drawing.
const round = (d) => (d ?? "").replace(/(\d+\.\d)\d+/g, "$1");

// Edges between two Spanish units (internal boundaries).
const internal = (a, b) => a !== b && !isGibraltar(a) && !isGibraltar(b);
// Spain's outline: its coast plus its land borders (incl. the one with Gibraltar),
// but never Gibraltar's own coastline.
const outline = (a, b) => (a === b ? !isGibraltar(a) : isGibraltar(a) !== isGibraltar(b));

// Neighbouring countries (context only). ISO 3166-1 numeric codes.
const NEIGHBOURS = new Set(["620", "250", "020", "504", "012"]); // PT, FR, AD, MA, DZ
const neighbourFeatures = feature(world, world.objects.countries).features.filter((f) => NEIGHBOURS.has(f.id));

// Sub-projection parameters, so the server can place any aerodrome with
// d3-geo alone (no composite library at runtime). The Canary Islands use
// the same projection shifted into the inset.
const mainland = d3geo
  .geoConicConformal()
  .rotate([5, -38.6])
  .parallels([0, 60])
  .scale(projection.scale())
  .translate(projection.translate());
const probe = [-15.5, 28.1];
const shifted = projection(probe);
const unshifted = mainland(probe);
const canaryTranslate = [
  projection.translate()[0] + (shifted[0] - unshifted[0]),
  projection.translate()[1] + (shifted[1] - unshifted[1]),
];

const bounds = (features, pad) => {
  const [[x0, y0], [x1, y1]] = toPath.bounds({ type: "FeatureCollection", features });
  return [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad].map((v) => +v.toFixed(1));
};
const mainlandAndBalearics = spainRegions.filter((f) => !isCanarias(f) && !/ceuta|melilla/i.test(f.properties.name));

const labels = [
  ["PORTUGAL", -8.1, 39.6],
  ["FRANCIA", 1.2, 43.9],
  ["MAR CANTÁBRICO", -5.0, 43.85],
  ["MAR MEDITERRÁNEO", 3.2, 38.3],
]
  .map(([text, lon, lat]) => {
    const p = projection([lon, lat]);
    return p && { text, x: +p[0].toFixed(1), y: +p[1].toFixed(1) };
  })
  .filter(Boolean);

const attribution =
  "Obra derivada de BDLJE CC-BY 4.0 ign.es · Países vecinos: Natural Earth (dominio público)";

const output = {
  meta: {
    abstract:
      "Cartografía vectorial de España para My Aviation Map (AERONOTE). No apta para navegación aérea.",
    lineage:
      "Obra derivada de BDLJE CC-BY 4.0 ign.es (IGN/CNIG, Líneas límite jurisdiccionales, vía es-atlas 0.6.0): " +
      "simplificada y reproyectada (cónica conforme, recuadro de Canarias). Países vecinos: Natural Earth 1:10m " +
      "vía world-atlas 2.0.2 (dominio público). Gibraltar representado como territorio vecino, sin etiqueta.",
    accessConstraints: attribution,
    attribution,
    attributionUrl: "https://www.ign.es",
    generatedBy: "scripts/build-spain-map.mjs",
    sources: {
      "es-atlas": "0.6.0",
      "world-atlas": "2.0.2",
      "d3-composite-projections": "2.0.0",
      "d3-geo": "3.1.2",
    },
  },
  width: W,
  height: H,
  projection: {
    rotate: [5, -38.6],
    parallels: [0, 60],
    scale: +projection.scale().toFixed(4),
    mainlandTranslate: projection.translate().map((v) => +v.toFixed(4)),
    canaryTranslate: canaryTranslate.map((v) => +v.toFixed(4)),
    // Points in this lon/lat box are drawn in the Canary Islands inset.
    canaryBox: [-19, 26.5, -12.5, 30],
  },
  layers: {
    neighbours: round(toPath({ type: "FeatureCollection", features: [...neighbourFeatures, ...gibraltar] })),
    land: round(toPath({ type: "FeatureCollection", features: spainRegions })),
    provinces: round(toPath(mesh(es, es.objects.provinces, internal))),
    regions: round(toPath(mesh(es, es.objects.autonomous_regions, internal))),
    outline: round(toPath(mesh(es, es.objects.autonomous_regions, outline))),
    insetFrame: round(projection.getCompositionBorders()),
    graticule: round(toPath(d3geo.geoGraticule().step([1, 1]).extent([[-19, 26], [6, 45]])())),
  },
  labels,
  views: {
    peninsula: bounds(mainlandAndBalearics, 24),
    canarias: bounds(spainRegions.filter(isCanarias), 26),
    todo: [0, 0, W, H],
  },
};

const target = path.join(root, "src/lib/map/spain.generated.json");
fs.writeFileSync(target, JSON.stringify(output) + "\n");
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0);
console.log(`Wrote ${path.relative(root, target)} (${kb(JSON.stringify(output))} KB)`);
for (const [k, v] of Object.entries(output.layers)) console.log(`  ${k}: ${kb(v)} KB`);
