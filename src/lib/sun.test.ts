import { describe, expect, it } from "vitest";
import { formatLocalForTimezone, formatUtcClock, getSunDirection } from "./sun";

describe("getSunDirection", () => {
  it("returns a unit vector", () => {
    const sun = getSunDirection(new Date("2026-08-18T12:00:00Z"));
    expect(Math.hypot(sun.x, sun.y, sun.z)).toBeCloseTo(1, 10);
  });

  it("sun longitude is within 0..360", () => {
    for (const h of [0, 6, 12, 18, 23.5]) {
      const d = new Date(Date.UTC(2026, 7, 18, h));
      const sun = getSunDirection(d);
      expect(sun.sunLongitude).toBeGreaterThanOrEqual(0);
      expect(sun.sunLongitude).toBeLessThan(360);
    }
  });

  it("noon UTC subsolar point is near the equator (small |y|)", () => {
    // Around the equinox, declination ≈ 0 → subsolar latitude ≈ 0
    const sun = getSunDirection(new Date(Date.UTC(2026, 2, 20, 12))); // ~equinox
    expect(Math.abs(sun.y)).toBeLessThan(0.1);
  });

  it("declination peaks at solstices", () => {
    const jun = getSunDirection(new Date(Date.UTC(2026, 5, 21, 12)));
    const dec = getSunDirection(new Date(Date.UTC(2026, 11, 21, 12)));
    expect(jun.y).toBeGreaterThan(0.35);
    expect(dec.y).toBeLessThan(-0.35);
  });

  it("dayFraction tracks UTC hour of day", () => {
    const noon = getSunDirection(new Date(Date.UTC(2026, 7, 18, 12)));
    expect(noon.dayFraction).toBeCloseTo(0.5, 10);
    const midnight = getSunDirection(new Date(Date.UTC(2026, 7, 18, 0)));
    expect(midnight.dayFraction).toBeCloseTo(0, 10);
  });
});

describe("formatUtcClock", () => {
  it("renders HH:MM:SS UTC", () => {
    expect(formatUtcClock(new Date("2026-08-18T06:07:08Z"))).toBe("06:07:08 UTC");
  });
});

describe("formatLocalForTimezone", () => {
  it("formats a known offset", () => {
    // Europe/London is BST (UTC+1) in August → 12:00 UTC = 13:00 local
    const out = formatLocalForTimezone("Europe/London", new Date("2026-08-18T12:00:00Z"));
    expect(out).toContain("13:00:00");
    expect(out).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it("falls back for an invalid timezone without throwing", () => {
    expect(() => formatLocalForTimezone("Not/AZone")).not.toThrow();
  });
});
