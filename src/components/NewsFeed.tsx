import { useMemo } from "react";
import { ExternalLink, Newspaper, Radio, RefreshCw } from "lucide-react";
import { filterNewsForCity } from "../data/news";
import { useGlobeStore } from "../store/globeStore";

function relativeTime(iso: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NewsFeed({ onRefresh }: { onRefresh: () => void }) {
  const news = useGlobeStore((s) => s.news);
  const newsLive = useGlobeStore((s) => s.newsLive);
  const newsLoading = useGlobeStore((s) => s.newsLoading);
  const selectedCity = useGlobeStore((s) => s.selectedCity);

  const items = useMemo(() => {
    if (!selectedCity) return news;
    return filterNewsForCity(news, selectedCity.keywords);
  }, [news, selectedCity]);

  return (
    <aside className="glass flex h-full w-full flex-col overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
            <Newspaper className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-slate-100">
              {selectedCity ? `${selectedCity.name} News` : "World News"}
            </h2>
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Radio
                className={`h-3 w-3 ${newsLive ? "text-emerald-400" : "text-amber-400"}`}
              />
              {newsLoading
                ? "Loading feed…"
                : newsLive
                  ? "Live RSS"
                  : "Curated fallback"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={newsLoading}
          className="rounded-lg border border-slate-600/60 bg-slate-800/60 p-2 text-slate-300 transition hover:border-sky-500/40 hover:text-sky-300 disabled:opacity-50"
          title="Refresh news"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${newsLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="custom-scroll flex-1 space-y-2 overflow-y-auto p-3">
        {newsLoading && items.length === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-slate-800/60"
              />
            ))}
          </div>
        )}

        {!newsLoading && items.length === 0 && (
          <p className="px-2 py-8 text-center text-sm text-slate-500">
            No headlines found for this region.
          </p>
        )}

        {items.map((item, idx) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="news-card fade-in-up block rounded-xl border border-slate-700/40 bg-slate-900/40 p-3"
            style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400/90">
                {item.source}
              </span>
              <span className="text-[10px] text-slate-500">
                {relativeTime(item.publishedAt)}
              </span>
            </div>
            <h3 className="text-[13px] font-medium leading-snug text-slate-100">
              {item.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
              {item.summary}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-slate-500">
              Open story <ExternalLink className="h-3 w-3" />
            </span>
          </a>
        ))}
      </div>
    </aside>
  );
}
