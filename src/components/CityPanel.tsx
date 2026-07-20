import { MapPin, Users, Clock, X, Globe2 } from "lucide-react";
import { CITIES } from "../data/cities";
import { formatLocalForTimezone } from "../lib/sun";
import { useGlobeStore } from "../store/globeStore";
import { useEffect, useState } from "react";

export function CityPanel() {
  const selectedCity = useGlobeStore((s) => s.selectedCity);
  const setSelectedCity = useGlobeStore((s) => s.setSelectedCity);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="glass flex h-full w-full flex-col overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
            <Globe2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Cities</h2>
            <p className="text-[11px] text-slate-400">{CITIES.length} markers</p>
          </div>
        </div>
      </div>

      {selectedCity && (
        <div className="fade-in-up border-b border-slate-700/40 bg-sky-500/5 px-4 py-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-sky-100">
                {selectedCity.name}
              </h3>
              <p className="text-xs text-slate-400">{selectedCity.country}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCity(null)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-3 text-[12px] leading-relaxed text-slate-300">
            {selectedCity.description}
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="glass-soft flex items-center gap-1.5 rounded-lg px-2 py-1.5">
              <Users className="h-3 w-3 text-sky-400" />
              <span className="text-slate-300">{selectedCity.population}</span>
            </div>
            <div className="glass-soft flex items-center gap-1.5 rounded-lg px-2 py-1.5">
              <MapPin className="h-3 w-3 text-sky-400" />
              <span className="text-slate-300">
                {selectedCity.lat.toFixed(1)}°, {selectedCity.lon.toFixed(1)}°
              </span>
            </div>
            <div className="glass-soft col-span-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5">
              <Clock className="h-3 w-3 text-amber-300" />
              <span className="text-slate-300" key={tick}>
                {formatLocalForTimezone(selectedCity.timezone)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="custom-scroll flex-1 space-y-1 overflow-y-auto p-2">
        {CITIES.map((city) => {
          const active = selectedCity?.id === city.id;
          return (
            <button
              key={city.id}
              type="button"
              onClick={() => setSelectedCity(active ? null : city)}
              className={`city-item flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2 text-left ${
                active ? "active" : ""
              }`}
            >
              <div>
                <div className="text-[13px] font-medium text-slate-100">
                  {city.name}
                </div>
                <div className="text-[11px] text-slate-500">{city.country}</div>
              </div>
              <div
                className={`h-2 w-2 rounded-full ${
                  active ? "bg-sky-400 shadow-[0_0_8px_#38bdf8]" : "bg-amber-400/80"
                }`}
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
