export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  region?: string;
};

export type LiveNews = { items: NewsItem[]; live: boolean };

/** Live feeds refresh on a short cycle; the fallback set is stale-by-design. */
export const LIVE_REFRESH_MS = 5 * 60 * 1000;
export const STALE_AFTER_MS = 15 * 60 * 1000;

/**
 * Decide whether the news cache should be re-fetched right now.
 *
 * - Live data older than LIVE_REFRESH_MS → refresh on schedule.
 * - Fallback data older than STALE_AFTER_MS → retry, in case the network
 *   (or the proxies) have recovered.
 * - Never loaded / already loading → no-op handled by the caller.
 */
export function shouldRefreshNews(
  lastLoadedAt: number | null,
  live: boolean,
  now: number,
): boolean {
  if (lastLoadedAt === null) return true;
  const age = now - lastLoadedAt;
  return live ? age >= LIVE_REFRESH_MS : age >= STALE_AFTER_MS;
}

export const FALLBACK_NEWS: NewsItem[] = [
  {
    id: "fallback-heat-pact",
    title: "Coastal cities strike global heat-adaptation pact",
    summary:
      "Cities from Singapore to Lagos join a pact focused on heat, flooding, and coastal adaptation funding through 2035.",
    source: "Planet Wire",
    url: "https://www.reuters.com/business/environment/",
    publishedAt: new Date(Date.now() - 3600_000).toISOString(),
    region: "global",
  },
  {
    id: "fallback-ai-vc",
    title: "AI infrastructure leads global venture funding in Q3",
    summary:
      "AI infrastructure and fintech startups raised the bulk of capital, with midtown office absorption ticking up.",
    source: "Metro Markets",
    url: "https://www.reuters.com/technology/",
    publishedAt: new Date(Date.now() - 10800_000).toISOString(),
    region: "nyc",
  },
  {
    id: "fallback-uk-airports",
    title: "UK airports approve expanded night-flight curbs",
    summary:
      "Heathrow and Gatwick agree new night-flight curbs after a two-year review into sleep and air-quality impacts.",
    source: "Aviation Desk",
    url: "https://www.bbc.co.uk/news/uk",
    publishedAt: new Date(Date.now() - 14400_000).toISOString(),
    region: "london",
  },
  {
    id: "fallback-gulf-aviation",
    title: "Gulf carriers add 40 long-haul routes for winter",
    summary:
      "Gulf carriers signal multi-year commitments as passenger demand between Asia, Africa, and Europe remains strong.",
    source: "Skyline News",
    url: "https://www.reuters.com/business/aerospace-defense/",
    publishedAt: new Date(Date.now() - 18000_000).toISOString(),
    region: "dubai",
  },
  {
    id: "fallback-nile-hydro",
    title: "Nile riparian states launch shared hydro-forecasting grid",
    summary:
      "Diplomats and engineers discuss shared irrigation, hydro, and drought early-warning systems for East Africa.",
    source: "Africa Watch",
    url: "https://www.reuters.com/world/africa/",
    publishedAt: new Date(Date.now() - 25200_000).toISOString(),
    region: "cairo",
  },
  {
    id: "fallback-eu-archive",
    title: "European digital archive opens 200 million documents",
    summary:
      "A pan-European consortium digitizes letters, radio broadcasts, and photographs for free public access.",
    source: "Culture Wire",
    url: "https://www.reuters.com/world/europe/",
    publishedAt: new Date(Date.now() - 32400_000).toISOString(),
    region: "berlin",
  },
  {
    id: "fallback-sea-level",
    title: "Pacific island states unveil sea-level early-warning ring",
    summary:
      "Local councils pair nature-based defenses with building-code updates ahead of a warmer decade.",
    source: "Oceania Report",
    url: "https://www.reuters.com/world/asia-pacific/",
    publishedAt: new Date(Date.now() - 39600_000).toISOString(),
    region: "sydney",
  },
];

/**
 * Live RSS feeds, verified working on 2026-11-01.
 *
 * feeds.reuters.com was removed — Reuters discontinued their public RSS
 * endpoints (host no longer resolves), which made every feed load burn a
 * 6s timeout on a dead connection before the other feeds could count.
 */
const RSS_FEEDS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://www.theguardian.com/world/rss",
  "https://www.aljazeera.com/xml/rss/all.xml",
];

/**
 * CORS proxy strategies, in fallback order: self-hosted (VITE_NEWS_PROXY)
 * first, then public proxies as last resort (see issue #7).
 * Each strategy maps a feed URL to a proxied URL. `via` identifies the
 * strategy for diagnostics.
 */
type ProxyStrategy = { name: string; build: (url: string) => string };

const PUBLIC_PROXY_STRATEGIES: ProxyStrategy[] = [
  {
    name: "allorigins",
    build: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  },
  {
    name: "corsproxy",
    build: (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  },
];

// A self-hosted proxy (e.g. the Nitro route in server/proxy.ts) takes
// priority when configured: same origin, no third-party transit.
function configuredProxyStrategy(): ProxyStrategy | undefined {
  const base = (import.meta.env?.VITE_NEWS_PROXY as string | undefined) ?? "";
  if (!base.trim()) return undefined;
  return {
    name: "self-hosted",
    build: (url) => `${base.replace(/\/+$/, "")}/${encodeURIComponent(url)}`,
  };
}

function proxyStrategies(): ProxyStrategy[] {
  const selfHosted = configuredProxyStrategy();
  return selfHosted ? [selfHosted, ...PUBLIC_PROXY_STRATEGIES] : PUBLIC_PROXY_STRATEGIES;
}

/** Per-feed budget: a proxy that can't deliver this fast is not worth waiting on. */
const FEED_TIMEOUT_MS = 5_000;

/**
 * Fetch a feed through the proxy chain, stopping at the first success.
 * Exports nothing besides the function — tested via fetchWorldNews and
 * the strategy-order unit tests in news.test.ts.
 */
async function fetchViaProxies(feedUrl: string): Promise<string> {
  let lastError: unknown = new Error("no proxy strategies configured");
  for (const strategy of proxyStrategies()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
    try {
      const res = await fetch(strategy.build(feedUrl), {
        signal: controller.signal,
        headers: { accept: "application/rss+xml, application/xml, text/xml" },
      });
      if (!res.ok) throw new Error(`proxy ${strategy.name}: HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

/** Decode the small set of entities that actually appear in RSS. */
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Unwrap <![CDATA[...]]> (RSS titles/descriptions frequently use it). */
function unwrapCdata(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/^\s*<!\[CDATA\[/, "")
    .replace(/\]\]>\s*$/, "");
}

/** Strip HTML tags, decode entities, and collapse whitespace. */
export function stripHtml(raw: string): string {
  // CDATA unwrap → tag strip → decode. Decoding last so entity names
  // inside tags can't survive the tag strip.
  const tagless = unwrapCdata(raw).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return decodeEntities(tagless);
}


const RSS_ITEM_RE = /<item[\s>][\s\S]*?<\/item>/gi;
const TAG_RE = (tag: string) => new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");

/**
 * Parse an RSS 2.0 document into NewsItems.
 * Returns [] for anything that isn't a recognisable RSS feed.
 */
export function parseRss(xml: string, source: string, maxItems = 15): NewsItem[] {
  if (!/<rss[\s>]/i.test(xml)) return [];
  const items: NewsItem[] = [];
  for (const block of xml.match(RSS_ITEM_RE) ?? []) {
    const title = stripHtml(block.match(TAG_RE("title"))?.[1] ?? "");
    const link = (block.match(TAG_RE("link"))?.[1] ?? "").trim();
    const description = stripHtml(block.match(TAG_RE("description"))?.[1] ?? "");
    if (!title) continue;
    const pubDate = (block.match(TAG_RE("pubDate"))?.[1] ?? "").trim();
    items.push({
      id: `${source}:${link || title}`,
      title,
      summary: description,
      source,
      url: link || "https://example.com",
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
    });
    if (items.length >= maxItems) break;
  }
  return items;
}

/**
 * Pick the items most relevant to a city, blending in the rest of the feed
 * when matches are scarce so the panel is never empty.
 */
export function filterNewsForCity(items: NewsItem[], keywords: string[]): NewsItem[] {
  if (!keywords.length) return items;
  const kw = new Set(keywords.map((k) => k.toLowerCase()));
  const matches = items.filter((item) => {
    const haystack = [item.title, item.summary, item.region ?? ""]
      .join(" ")
      .toLowerCase();
    return [...kw].some((k) => haystack.includes(k));
  });
  if (matches.length >= 3) return matches;
  const extras = items.filter((i) => !matches.includes(i)).slice(0, 6);
  return [...matches, ...extras];
}

/**
 * Fetch live world news: probe every feed in parallel through the proxy
 * chain, merge, dedupe, sort newest-first. Falls back to FALLBACK_NEWS
 * (live=false) when nothing can be fetched.
 */
export async function fetchWorldNews(): Promise<LiveNews> {
  const sources: Array<{ url: string; name: string }> = [
    { url: RSS_FEEDS[0], name: "BBC World" },
    { url: RSS_FEEDS[1], name: "Guardian World" },
    { url: RSS_FEEDS[2], name: "Al Jazeera" },
  ];

  const results = await Promise.allSettled(
    sources.map(async ({ url, name }) => {
      const xml = await fetchViaProxies(url);
      return parseRss(xml, name);
    }),
  );

  const byKey = new Map<string, NewsItem>();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value) {
      if (!byKey.has(item.id)) byKey.set(item.id, item);
    }
  }
  const items = [...byKey.values()].sort((a, b) => {
    const ta = Date.parse(a.publishedAt);
    const tb = Date.parse(b.publishedAt);
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return tb - ta;
  });

  if (items.length === 0) return { items: FALLBACK_NEWS, live: false };
  return { items, live: true };
}
