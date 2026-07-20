/**
 * Approximate sun direction from current UTC time.
 * Sun longitude ≈ 180 - (UTC_hours / 24) * 360
 * (subsolar point drifts west as Earth rotates).
 */
export function getSunDirection(date = new Date()) {
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;

  // Day of year for declination
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000);
  const declination =
    -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10) * (Math.PI / 180) * (180 / Math.PI));
  // Simpler standard approx:
  const declRad =
    ((-23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365)) * Math.PI) / 180;

  const sunLon = 180 - (utcHours / 24) * 360;
  const lonRad = (sunLon * Math.PI) / 180;
  const latRad = declRad;

  // Convert to Cartesian on unit sphere (same convention as latLonToVector3)
  const phi = Math.PI / 2 - latRad;
  const theta = lonRad + Math.PI;

  const x = -Math.sin(phi) * Math.cos(theta);
  const z = Math.sin(phi) * Math.sin(theta);
  const y = Math.cos(phi);

  // Normalize
  const len = Math.hypot(x, y, z) || 1;
  return {
    x: x / len,
    y: y / len,
    z: z / len,
    sunLongitude: sunLon,
    utcHours,
    dayFraction: utcHours / 24,
  };
}

export function formatUtcClock(date = new Date()) {
  return date.toISOString().slice(11, 19) + " UTC";
}

export function formatLocalForTimezone(tz: string, date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      weekday: "short",
      day: "2-digit",
      month: "short",
    }).format(date);
  } catch {
    return date.toUTCString();
  }
}
