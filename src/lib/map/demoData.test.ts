import { describe, expect, it } from "vitest";
import { demoAerodromes } from "./demoData";

describe("demoAerodromes", () => {
  const list = demoAerodromes();
  it("lists every aerodrome once", () => {
    expect(new Set(list.map((a) => a.icao)).size).toBe(list.length);
  });
  it("has 18 visited and 27 not-visited demo aerodromes", () => {
    expect(list.filter((a) => a.landings > 0)).toHaveLength(18);
    expect(list.filter((a) => a.landings === 0)).toHaveLength(27);
  });
});
