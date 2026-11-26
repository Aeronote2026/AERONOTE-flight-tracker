import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import * as d3geo from "d3-geo";
import * as d3path from "d3-path";
import { describe, expect, it } from "vitest";
import { inCanaryInset, projectAerodromes, projectPoint } from "./project";
import { SAMPLE_AERODROMES } from "./sampleAerodromes";
import spain from "./spain.generated.json";

// Reference: the original composite projection, configured exactly as the build script does.
function referenceProjection() {
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  const code = fs.readFileSync(
    path.join(process.cwd(), "node_modules/d3-composite-projections/d3-composite-projections.js"),
    "utf8",
  );
  vm.runInNewContext(code, {
    exports: mod.exports,
    module: mod,
    require: (n: string) => (n === "d3-geo" ? d3geo : n === "d3-path" ? d3path : null),
    globalThis: {},
  });
  const make = mod.exports.geoConicConformalSpain as () => d3geo.GeoProjection;
  return make().scale(spain.projection.scale).translate(spain.projection.mainlandTranslate as [number, number]);
}

describe("projectPoint", () => {
  const reference = referenceProjection();
  const points: [string, number, number][] = [
    ["Madrid", -3.7, 40.4],
    ["A Coruña", -8.4, 43.3],
    ["Cabo de Gata", -2.2, 36.7],
    ["Menorca", 4.2, 39.9],
    ["Gran Canaria", -15.4, 27.9],
    ["La Palma", -17.8, 28.6],
    ["Lanzarote", -13.6, 28.9],
  ];

  it.each(points)("matches the reference projection for %s (within 0.1 units)", (_n, lon, lat) => {
    const ours = projectPoint(lon, lat)!;
    const ref = reference([lon, lat])!;
    expect(Math.abs(ours[0] - ref[0])).toBeLessThan(0.1);
    expect(Math.abs(ours[1] - ref[1])).toBeLessThan(0.1);
  });

  it("places the Canary Islands inside their inset and the rest outside it", () => {
    const [x, y, w, h] = spain.views.canarias;
    for (const a of SAMPLE_AERODROMES) {
      const [px, py] = projectPoint(a.lon, a.lat)!;
      const inside = px >= x && px <= x + w && py >= y && py <= y + h;
      expect(inside).toBe(a.zone === "canarias");
      expect(inCanaryInset(a.lon, a.lat)).toBe(a.zone === "canarias");
    }
  });

  it("keeps the Balearic Islands in their real position, inside the Peninsula view", () => {
    const [x, y, w, h] = spain.views.peninsula;
    for (const a of SAMPLE_AERODROMES.filter((s) => s.zone === "baleares")) {
      const [px, py] = projectPoint(a.lon, a.lat)!;
      expect(px >= x && px <= x + w && py >= y && py <= y + h).toBe(true);
    }
  });

  it("leaves out points that cannot be drawn", () => {
    expect(projectPoint(Number.NaN, 40)).toBeNull();
    expect(projectPoint(-74.0, 40.7)).toBeNull(); // New York
  });
});

describe("projectAerodromes", () => {
  it("separates drawable and non-drawable aerodromes", () => {
    const { onMap, offMap } = projectAerodromes([
      { icao: "LECU", name: "Cuatro Vientos", lat: 40.37, lon: -3.79, country: "ES", zone: "peninsula", landings: 1 },
      { icao: "KJFK", name: "New York JFK", lat: 40.64, lon: -73.78, country: "US", zone: "", landings: 1 },
    ]);
    expect(onMap.map((a) => a.icao)).toEqual(["LECU"]);
    expect(offMap.map((a) => a.icao)).toEqual(["KJFK"]);
  });
});

describe("generated cartography", () => {
  it("records the IGN derived-work attribution in its metadata", () => {
    expect(spain.meta.attribution).toContain("Obra derivada de BDLJE CC-BY 4.0 ign.es");
    expect(spain.meta.lineage).toContain("Obra derivada de BDLJE CC-BY 4.0 ign.es");
    expect(spain.meta.accessConstraints).toContain("CC-BY 4.0 ign.es");
    expect(spain.meta.abstract).toContain("No apta para navegación");
  });

  it("contains every map layer", () => {
    for (const layer of Object.values(spain.layers)) expect(layer.length).toBeGreaterThan(10);
  });
});
