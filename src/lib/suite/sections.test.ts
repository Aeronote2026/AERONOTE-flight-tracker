import { describe, expect, it } from "vitest";
import { isActiveSection, SUITE_SECTIONS, visibleSections } from "./sections";

describe("Main Suite sections", () => {
  it("shows My Logbook and My Aviation Map, in that order", () => {
    expect(visibleSections().map((s) => [s.label, s.href, s.shortLabel])).toEqual([
      ["My Logbook", "/logbook", "Logbook"],
      ["My Aviation Map", "/aviation-map", "Mapa"],
    ]);
  });

  it("keeps future sections prepared but hidden", () => {
    const hidden = SUITE_SECTIONS.filter((s) => !s.enabled).map((s) => s.label);
    expect(hidden).toEqual(["My Aircraft", "My Progress"]);
  });

  it("has unique routes and names", () => {
    expect(new Set(SUITE_SECTIONS.map((s) => s.href)).size).toBe(SUITE_SECTIONS.length);
    expect(new Set(SUITE_SECTIONS.map((s) => s.label)).size).toBe(SUITE_SECTIONS.length);
  });

  it("marks the active section, including sub-pages and trailing slashes", () => {
    expect(isActiveSection("/logbook", "/logbook")).toBe(true);
    expect(isActiveSection("/logbook/", "/logbook")).toBe(true);
    expect(isActiveSection("/logbook/123", "/logbook")).toBe(true);
    expect(isActiveSection("/aviation-map", "/logbook")).toBe(false);
    expect(isActiveSection("/logbooks", "/logbook")).toBe(false);
    expect(isActiveSection("/lab/chart", "/aviation-map")).toBe(false);
  });
});
