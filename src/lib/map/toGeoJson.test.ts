import { describe, expect, it } from "vitest";
import { SAMPLE_AERODROMES } from "./sampleAerodromes";
import { graticule, landingsLabel, markerSize, mergeAerodromes, toGeoJson } from "./toGeoJson";
import { SPAIN } from "./regions";
import type { VisitedAerodrome } from "./types";

const base = { name: "Test", lat: 40, lon: -3, country: "ES", zone: "peninsula" };

describe("mergeAerodromes", () => {
  it("draws each aerodrome only once and adds up its landings", () => {
    const merged = mergeAerodromes([
      { ...base, icao: "LECU", landings: 3 },
      { ...base, icao: "lecu", landings: 2 },
      { ...base, icao: "LEZG", landings: 1 },
    ]);
    expect(merged.map((a) => [a.icao, a.landings])).toEqual([["LECU", 5], ["LEZG", 1]]);
  });

  it("does not change the input list", () => {
    const input: VisitedAerodrome[] = [{ ...base, icao: "LECU", landings: 1 }, { ...base, icao: "LECU", landings: 1 }];
    mergeAerodromes(input);
    expect(input[0].landings).toBe(1);
  });

  it("ignores invalid codes, coordinates and landing counts", () => {
    const merged = mergeAerodromes([
      { ...base, icao: "XX", landings: 1 },
      { ...base, icao: "LEVC", lat: 120, landings: 1 },
      { ...base, icao: "LEVC", lon: Number.NaN, landings: 1 },
      { ...base, icao: "LEMG", landings: -4 },
      { ...base, icao: "LEMG", landings: 1.5 },
    ]);
    expect(merged).toEqual([{ ...base, icao: "LEMG", landings: 0 }]);
  });

  it("merges the duplicated LECU in the demo data", () => {
    const merged = mergeAerodromes(SAMPLE_AERODROMES);
    expect(merged.filter((a) => a.icao === "LECU")).toHaveLength(1);
    expect(merged.find((a) => a.icao === "LECU")?.landings).toBe(42);
    expect(new Set(merged.map((a) => a.icao)).size).toBe(merged.length);
  });
});

describe("demo data", () => {
  it("covers the Peninsula, the Balearic and the Canary Islands inside their views", () => {
    const inside = (id: string, a: VisitedAerodrome) => {
      const [w, s, e, n] = SPAIN.views.find((v) => v.id === id)!.bounds;
      return a.lon >= w && a.lon <= e && a.lat >= s && a.lat <= n;
    };
    for (const a of SAMPLE_AERODROMES) {
      expect(inside("todo", a)).toBe(true);
      expect(inside(a.zone === "canarias" ? "canarias" : "peninsula-baleares", a)).toBe(true);
    }
    expect(new Set(SAMPLE_AERODROMES.map((a) => a.zone))).toEqual(new Set(["peninsula", "baleares", "canarias"]));
  });
});

describe("helpers", () => {
  it("labels landings in Spanish, singular and plural", () => {
    expect(landingsLabel(1)).toBe("1 aterrizaje");
    expect(landingsLabel(0)).toBe("0 aterrizajes");
    expect(landingsLabel(42)).toBe("42 aterrizajes");
  });

  it("sizes markers by landings", () => {
    expect([markerSize(1), markerSize(3), markerSize(10)]).toEqual(["s", "m", "l"]);
  });

  it("builds one GeoJSON point per aerodrome", () => {
    const fc = toGeoJson(SAMPLE_AERODROMES);
    expect(fc.features).toHaveLength(mergeAerodromes(SAMPLE_AERODROMES).length);
    expect(fc.features[0].geometry.coordinates).toEqual([-3.7851, 40.3706]);
  });

  it("draws a 1-degree grid", () => {
    const g = graticule([-2, 40, 1, 42], 1);
    expect(g.features).toHaveLength(4 + 3);
  });
});
