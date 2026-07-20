# Orbital — Interactive 3D Globe

Explore Earth in 3D with a **real-time day/night cycle**, **clickable cities**, and a **live world news** feed.

## Features

- **3D globe** — Blue Marble day map, bump topography, night city lights (dark side only), atmosphere, stars
- **Day / night** — Sun position from live UTC (`sunLon ≈ 180 − hours/24 × 360`) + seasonal declination
- **18 cities** — Pulsing markers; click for local clock, population, description
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
