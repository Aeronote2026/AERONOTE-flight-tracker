import { describe, expect, it } from "vitest";
import { formatDuration, MAX_SINGLE_ENTRY, parseDuration } from "./duration";

describe("formatDuration", () => {
  it.each([
    [90, "01:30"],
    [45, "00:45"],
    [615, "10:15"],
    [0, "00:00"],
    [1440, "24:00"],
    [74045, "1234:05"],
  ])("%i minutes -> %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });

  it("rejects negative or fractional minutes", () => {
    expect(() => formatDuration(-1)).toThrow();
    expect(() => formatDuration(1.5)).toThrow();
  });
});

describe("parseDuration", () => {
  it.each(["01:30", "1:30", "130", "0130"])("%s -> 90 minutes", (text) => {
    expect(parseDuration(text)).toEqual({ ok: true, minutes: 90 });
  });

  it.each([
    ["45", 45],
    ["00:45", 45],
    ["10:15", 615],
    ["1015", 615],
    [" 2:05 ", 125],
  ])("%s -> %i minutes", (text, minutes) => {
    expect(parseDuration(text)).toEqual({ ok: true, minutes });
  });

  it("never reads 90 as ninety minutes", () => {
    expect(parseDuration("90")).toEqual({ ok: false, error: "Minutes must be 00–59" });
    expect(parseDuration("1:75")).toEqual({ ok: false, error: "Minutes must be 00–59" });
  });

  it("rejects text that is not a time", () => {
    for (const text of ["abc", "", "1.5", "1:5", "-1:00"]) {
      expect(parseDuration(text).ok).toBe(false);
    }
  });

  it("limits a single flight or session to 24:00", () => {
    expect(parseDuration("24:00", { max: MAX_SINGLE_ENTRY })).toEqual({ ok: true, minutes: 1440 });
    expect(parseDuration("24:01", { max: MAX_SINGLE_ENTRY })).toEqual({ ok: false, error: "Maximum is 24:00" });
  });

  it("allows long accumulated totals when no maximum is given", () => {
    expect(parseDuration("1234:05")).toEqual({ ok: true, minutes: 74045 });
  });
});
