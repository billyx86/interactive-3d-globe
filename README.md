# Orbital — Interactive 3D Globe

[![CI](https://github.com/billyx86/interactive-3d-globe/actions/workflows/ci.yml/badge.svg)](https://github.com/billyx86/interactive-3d-globe/actions/workflows/ci.yml)

Explore Earth in 3D with a **real-time day/night cycle**, **clickable cities**, and a **live world news** feed.

## Features

- **3D globe** — Blue Marble day map, bump topography, night city lights (dark side only), atmosphere, stars — textures vendored locally, no CDN needed
- **Day / night** — Sun position from live UTC (`sunLon ≈ 180 − hours/24 × 360`) + seasonal declination
- **23 cities** — Pulsing markers; click for local clock, population, description (dataset is validated at load — see "Adding cities" below)
- **World news** — BBC / Reuters RSS via CORS proxies, curated fallback if feeds are blocked
- **City-filtered news** — Selecting a city filters headlines by region keywords
- **HUD** — UTC clock, sun longitude, spin & city-lights toggles

## Stack

React 19 · TanStack Start / Router · Three.js · React Three Fiber · Drei · Tailwind v4 · Zustand · Lucide

## Run

```bash
npm install
chmod +x startup.sh && ./startup.sh
# or: npm run dev
```

App serves on **http://0.0.0.0:8080**

## Controls

| Action | How |
|--------|-----|
| Orbit | Drag |
| Zoom | Scroll |
| Select city | Click amber/sky marker or list |
| Auto-spin | Top bar **Spin** |
| Night lights | Top bar **Lights** |
| Refresh news | Panel refresh icon |

## Scripts

- `npm run dev` — development server
- `npm run build` — production / Vercel build
- `npm run typecheck` — TypeScript check
- `npm test` — vitest suite (47 tests: cities, news, sun math, store, validation)

CI (GitHub Actions) runs typecheck + tests + build on every push and PR.

## Adding cities

Cities are curated data in `src/data/cities.ts`. To add one:

```ts
{
  id: "your-city",        // kebab-case, unique
  name: "Your City",
  country: "Some Country",
  lat: 12.3,              // -90..90
  lon: 45.6,              // -180..180
  population: "1.0M",
  timezone: "UTC",        // any valid IANA timezone
  description: "One line shown in the city panel.",
  keywords: ["your city", "some country"],  // used for news filtering
},
```

Every entry is validated at module load by `validateCities`
(`src/lib/validate.ts`) — bad ids, coordinates, timezones, or duplicate ids
throw immediately, and `src/data/cities.test.ts` asserts the same invariants
for the whole dataset. Markers, the city panel, and news filtering all read
from the same `CITIES` array, so a new entry appears everywhere automatically.

## Assets

Earth textures live in `public/textures/` (vendored — NASA Blue Marble /
Black Marble + three-globe topology, all public domain). To swap in higher
resolutions, replace the files in place and keep the names.

## License

MIT — see [LICENSE](LICENSE).
