import type { City } from "../data/cities";

/**
 * Runtime validation for the city dataset.
 *
 * The dataset is hand-curated data (not user input), so validation is a
 * defense against typos and drift, not an attack surface. It runs once at
 * module load in `src/data/cities.ts` and in the unit tests.
 *
 * Every check here mirrors an invariant the tests already assert on the
 * current dataset — so extending the city list is safe as long as entries
 * keep satisfying the same invariants.
 */

const INVALID_ID_RE = /\s/;

/**
 * Validate a single city entry.
 * @throws Error with a message identifying the city and the failed field.
 */
export function validateCity(city: City, index?: number): void {
  const label = index !== undefined ? `cities[${index}]` : "city";
  const where = city.id ? ` (${city.id})` : "";

  if (!city.id || INVALID_ID_RE.test(city.id) || !/^[a-z0-9-]+$/.test(city.id)) {
    throw new Error(`${label}${where}: id must be lowercase kebab-case [a-z0-9-]`);
  }
  if (!Number.isFinite(city.lat) || city.lat < -90 || city.lat > 90) {
    throw new Error(`${label}${where}: lat ${city.lat} out of range [-90, 90]`);
  }
  if (!Number.isFinite(city.lon) || city.lon < -180 || city.lon > 180) {
    throw new Error(`${label}${where}: lon ${city.lon} out of range [-180, 180]`);
  }
  if (!city.name?.trim()) throw new Error(`${label}${where}: name is empty`);
  if (!city.country?.trim()) throw new Error(`${label}${where}: country is empty`);
  if (!city.population?.trim()) {
    throw new Error(`${label}${where}: population is empty`);
  }
  if (!city.description?.trim()) {
    throw new Error(`${label}${where}: description is empty`);
  }
  if (!Array.isArray(city.keywords) || city.keywords.length === 0) {
    throw new Error(`${label}${where}: keywords must be a non-empty array`);
  }
  for (const kw of city.keywords) {
    if (typeof kw !== "string" || !kw.trim()) {
      throw new Error(`${label}${where}: keywords contain an empty entry`);
    }
  }
  // IANA timezone names — Intl.DateTimeFormat throws for unknown ones.
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: city.timezone });
  } catch {
    throw new Error(`${label}${where}: invalid IANA timezone "${city.timezone}"`);
  }
}

/**
 * Validate the whole dataset: every entry plus id uniqueness.
 * @returns the input array (unchanged) for convenient `validateCities(CITIES)` chains.
 */
export function validateCities(cities: City[]): City[] {
  const seen = new Set<string>();
  cities.forEach((city, i) => {
    validateCity(city, i);
    if (seen.has(city.id)) {
      throw new Error(`cities[${i}] (${city.id}): duplicate id`);
    }
    seen.add(city.id);
  });
  return cities;
}
