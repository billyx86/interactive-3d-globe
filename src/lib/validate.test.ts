import { describe, expect, it } from "vitest";
import { validateCity, validateCities } from "./validate";
import type { City } from "../data/cities";

const validCity: City = {
  id: "test-city",
  name: "Test City",
  country: "Testland",
  lat: 10,
  lon: 20,
  population: "1M",
  timezone: "UTC",
  description: "A perfectly valid test city.",
  keywords: ["test"],
};

describe("validateCity", () => {
  it("accepts a fully valid city", () => {
    expect(() => validateCity(validCity)).not.toThrow();
  });

  it("rejects out-of-range latitude", () => {
    expect(() => validateCity({ ...validCity, lat: 91 })).toThrow(/lat.*out of range/);
    expect(() => validateCity({ ...validCity, lat: -90.1 })).toThrow(/lat.*out of range/);
    expect(() => validateCity({ ...validCity, lat: NaN })).toThrow(/lat.*out of range/);
  });

  it("rejects out-of-range longitude", () => {
    expect(() => validateCity({ ...validCity, lon: 181 })).toThrow(/lon.*out of range/);
    expect(() => validateCity({ ...validCity, lon: -180.5 })).toThrow(/lon.*out of range/);
  });

  it("rejects non-kebab-case ids", () => {
    for (const id of ["UPPER", "has space", "under_score", "", "with/dash"]) {
      expect(() => validateCity({ ...validCity, id }), id).toThrow(/id must be/);
    }
  });

  it("accepts the boundary lat/lon values", () => {
    expect(() => validateCity({ ...validCity, lat: 90, lon: 180 })).not.toThrow();
    expect(() => validateCity({ ...validCity, lat: -90, lon: -180 })).not.toThrow();
  });

  it("rejects empty required string fields", () => {
    expect(() => validateCity({ ...validCity, name: "  " })).toThrow(/name is empty/);
    expect(() => validateCity({ ...validCity, country: "" })).toThrow(/country is empty/);
    expect(() => validateCity({ ...validCity, population: "" })).toThrow(/population is empty/);
    expect(() => validateCity({ ...validCity, description: "" })).toThrow(/description is empty/);
  });

  it("rejects empty keywords or empty entries", () => {
    expect(() => validateCity({ ...validCity, keywords: [] })).toThrow(/non-empty array/);
    expect(() => validateCity({ ...validCity, keywords: ["ok", "  "] })).toThrow(/empty entry/);
  });

  it("rejects unknown IANA timezones", () => {
    expect(() => validateCity({ ...validCity, timezone: "Asia/Atlantis" })).toThrow(/timezone/);
  });
});

describe("validateCities", () => {
  it("accepts a dataset with unique ids", () => {
    const cities = [validCity, { ...validCity, id: "other", name: "Other" }];
    expect(validateCities(cities)).toBe(cities);
  });

  it("rejects duplicate ids and names the offender", () => {
    expect(() =>
      validateCities([validCity, { ...validCity, id: "test-city", name: "Clone" }]),
    ).toThrow(/duplicate id/);
  });

  it("reports the index of a failing entry", () => {
    const bad = { ...validCity, id: "bad one", lat: 999 };
    expect(() => validateCities([validCity, bad, validCity])).toThrow(/cities\[1\]/);
  });
});
