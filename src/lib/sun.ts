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

  // Day of year for solar declination
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000);
  // Standard approximation: declination in degrees, then radians
  const declDeg = -23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365);
  const latRad = (declDeg * Math.PI) / 180;

  const sunLon = 180 - (utcHours / 24) * 360;
  // Match latLonToVector3 convention used for city markers
  const phi = Math.PI / 2 - latRad;
  const theta = ((sunLon + 180) * Math.PI) / 180;

  const x = -Math.sin(phi) * Math.cos(theta);
  const z = Math.sin(phi) * Math.sin(theta);
  const y = Math.cos(phi);

  const len = Math.hypot(x, y, z) || 1;
  return {
    x: x / len,
    y: y / len,
    z: z / len,
    sunLongitude: ((sunLon % 360) + 360) % 360,
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
