import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Sun,
  Moon,
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { Globe } from "../components/Globe";
import { NewsFeed } from "../components/NewsFeed";
import { CityPanel } from "../components/CityPanel";
import { fetchWorldNews } from "../data/news";
import { formatUtcClock, getSunDirection } from "../lib/sun";
import { useGlobeStore } from "../store/globeStore";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const setNews = useGlobeStore((s) => s.setNews);
  const setNewsLoading = useGlobeStore((s) => s.setNewsLoading);
  const autoRotate = useGlobeStore((s) => s.autoRotate);
  const toggleAutoRotate = useGlobeStore((s) => s.toggleAutoRotate);
  const showNightLights = useGlobeStore((s) => s.showNightLights);
  const toggleNightLights = useGlobeStore((s) => s.toggleNightLights);

  const [utcClock, setUtcClock] = useState(formatUtcClock());
  const [sunLon, setSunLon] = useState(() => getSunDirection().sunLongitude);

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    const { items, live } = await fetchWorldNews();
    setNews(items, live);
  }, [setNews, setNewsLoading]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  useEffect(() => {
    const id = setInterval(() => {
      setUtcClock(formatUtcClock());
      setSunLon(getSunDirection().sunLongitude);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Approximate day/night label for a user-friendly HUD
  const dayFraction = getSunDirection().dayFraction;
  const isMostlyDay = dayFraction > 0.25 && dayFraction < 0.75;

  return (
    <div className="relative flex h-svh w-full flex-col overflow-hidden">
      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4 md:p-5">
        <div className="pointer-events-auto glass rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/30 to-indigo-500/20 text-sky-300">
              <Sparkles className="h-4.5 w-4.5 h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-white">
                Orbital
              </h1>
              <p className="text-[11px] text-slate-400">
                Interactive 3D Earth · Day / Night · News
              </p>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <div className="glass hidden items-center gap-3 rounded-2xl px-3 py-2 sm:flex">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              {isMostlyDay ? (
                <Sun className="h-3.5 w-3.5 text-amber-300" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-indigo-300" />
              )}
              <span className="font-mono tabular-nums">{utcClock}</span>
            </div>
            <div className="h-3 w-px bg-slate-600" />
            <div className="text-[11px] text-slate-400">
              Sun lon{" "}
              <span className="font-mono text-sky-300/90">
                {sunLon.toFixed(1)}°
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleAutoRotate}
            className="glass flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] text-slate-200 transition hover:border-sky-400/30"
            title="Toggle auto-rotate"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${autoRotate ? "text-sky-300" : "text-slate-500"}`} />
            <span className="hidden sm:inline">{autoRotate ? "Spin on" : "Spin off"}</span>
          </button>

          <button
            type="button"
            onClick={toggleNightLights}
            className="glass flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] text-slate-200 transition hover:border-sky-400/30"
            title="Toggle city lights"
          >
            {showNightLights ? (
              <Eye className="h-3.5 w-3.5 text-amber-300" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-slate-500" />
            )}
            <span className="hidden sm:inline">Lights</span>
          </button>
        </div>
      </header>

      {/* Globe canvas */}
      <main className="relative min-h-0 flex-1">
        <Globe />

        {/* Soft vignette so panels read better */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,7,13,0.55)_100%)]" />

        {/* Side panels */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-[42%] max-h-[380px] gap-3 p-3 md:inset-y-20 md:left-4 md:right-auto md:h-auto md:max-h-none md:w-[280px] md:flex-col md:p-0 md:py-2">
          <div className="pointer-events-auto hidden min-h-0 flex-1 md:block">
            <CityPanel />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-[46%] max-h-[420px] gap-3 p-3 md:inset-y-20 md:left-auto md:right-4 md:h-auto md:max-h-none md:w-[320px] md:flex-col md:p-0 md:py-2">
          <div className="pointer-events-auto min-h-0 flex-1">
            <NewsFeed onRefresh={loadNews} />
          </div>
        </div>

        {/* Mobile city strip */}
        <div className="pointer-events-auto absolute bottom-[48%] left-0 right-0 z-10 px-3 md:hidden">
          <div className="glass max-h-36 overflow-hidden rounded-2xl p-2">
            <CityPanel />
          </div>
        </div>

        {/* Hint */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 md:block">
          <p className="rounded-full border border-slate-700/50 bg-slate-950/50 px-3 py-1 text-[10px] text-slate-500 backdrop-blur">
            Drag to orbit · Scroll to zoom · Click a city marker
          </p>
        </div>
      </main>
    </div>
  );
}
