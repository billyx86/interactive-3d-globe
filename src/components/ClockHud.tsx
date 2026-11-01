import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { formatUtcClock, getSunDirection } from "../lib/sun";

/**
 * 1 Hz UTC clock + sun-longitude HUD.
 *
 * Kept out of HomePage on purpose: the per-second tick lives in this leaf
 * component, so only this ~8-node subtree re-renders each second instead of
 * the whole page (globe canvas + all 23 city markers) (#13).
 */
export function ClockHud() {
  const [utcClock, setUtcClock] = useState(formatUtcClock());
  const [sunLon, setSunLon] = useState(() => getSunDirection().sunLongitude);

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
        <span className="font-mono text-sky-300/90">{sunLon.toFixed(1)}°</span>
      </div>
    </div>
  );
}
