import { describe, expect, it } from "vitest";
import { CITIES, latLonToVector3, type City } from "./cities";

describe("CITIES dataset", () => {
  it("has cities", () => {
    expect(CITIES.length).toBeGreaterThan(0);
  });

  it("ids are unique", () => {
    const ids = CITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every city is within valid lat/lon bounds", () => {
    for (const c of CITIES) {
      expect(c.lat, `${c.id} lat`).toBeGreaterThanOrEqual(-90);
      expect(c.lat, `${c.id} lat`).toBeLessThanOrEqual(90);
      expect(c.lon, `${c.id} lon`).toBeGreaterThanOrEqual(-180);
      expect(c.lon, `${c.id} lon`).toBeLessThanOrEqual(180);
    }
  });

  it("every city has a valid IANA timezone", () => {
    for (const c of CITIES) {
      // Throws for an invalid timezone name
      expect(() => new Intl.DateTimeFormat("en-GB", { timeZone: c.timezone }), c.timezone).not.toThrow();
    }
  });

  it("every city has non-empty labels and at least one keyword", () => {
    for (const c of CITIES) {
      expect(c.name.length, `${c.id} name`).toBeGreaterThan(0);
      expect(c.country.length, `${c.id} country`).toBeGreaterThan(0);
      expect(c.population.length, `${c.id} population`).toBeGreaterThan(0);
      expect(c.description.length, `${c.id} description`).toBeGreaterThan(0);
      expect(c.keywords.length, `${c.id} keywords`).toBeGreaterThan(0);
    }
  });
});

describe("latLonToVector3", () => {
  const R = 2;

  it("north pole maps to +Y", () => {
    const v = latLonToVector3(90, 0, R);
    expect(v.x).toBeCloseTo(0, 10);
    expect(v.z).toBeCloseTo(0, 10);
    expect(v.y).toBeCloseTo(R, 10);
  });

  it("south pole maps to -Y", () => {
    const v = latLonToVector3(-90, 0, R);
    expect(v.y).toBeCloseTo(-R, 10);
  });

  it("equator maps onto the XZ plane", () => {
    const v = latLonToVector3(0, 0, R);
    expect(v.y).toBeCloseTo(0, 10);
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(R, 10);
  });

  it("always returns a point on the sphere of radius R", () => {
    for (const c of CITIES) {
      const v = latLonToVector3(c.lat, c.lon, R);
      expect(Math.hypot(v.x, v.y, v.z), c.id).toBeCloseTo(R, 8);
    }
  });

  it("scales linearly with radius", () => {
    const a = latLonToVector3(45, 30, 1);
    const b = latLonToVector3(45, 30, 3);
    expect(b.x).toBeCloseTo(a.x * 3, 10);
    expect(b.y).toBeCloseTo(a.y * 3, 10);
    expect(b.z).toBeCloseTo(a.z * 3, 10);
  });
});
