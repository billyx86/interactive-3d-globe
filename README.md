# Orbital — Interactive 3D Globe

A polished interactive 3D globe web app with real-time day/night lighting, clickable city markers, and a live world news feed.

**Repository:** https://github.com/billyx86/interactive-3d-globe

## Features

1. **Interactive 3D Earth** — three.js + React Three Fiber + Drei (orbit, zoom, stars, atmosphere)
2. **Real-time day/night** — directional sun light from UTC: `sunLon = 180 - (UTC_hours/24)*360`
3. **Clickable cities** — 18 major world cities with markers, info panel, local clocks
4. **Live news** — BBC/Reuters RSS via CORS proxies, curated fallback headlines
5. **Dark glass UI** — HUD, side panels, city filter on news

## Stack

- TanStack Start + Vite + React 19
- three / @react-three/fiber / @react-three/drei
- Tailwind CSS v4 + lucide-react + zustand

## Run

```bash
chmod +x startup.sh
./startup.sh
# or:
npm install
npm install three @react-three/fiber @react-three/drei @types/three
npm run dev
```

Serves on **0.0.0.0:8080**.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on 0.0.0.0:8080 |
| `npm run build` | Production build (Nitro Vercel preset) |
| `npm run typecheck` | TypeScript check |

## Project layout

```
src/
  components/   Globe, GlobeCanvas, CityMarkers, NewsFeed, CityPanel
  data/         cities.ts, news.ts
  lib/          sun.ts
  store/        globeStore.ts
  routes/       __root.tsx, index.tsx
```
