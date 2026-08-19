export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  region?: string;
};

export const FALLBACK_NEWS: NewsItem[] = [
  {
    id: "fb-1",
    title: "Global markets steady as central banks signal cautious optimism",
    summary:
      "Investors digest mixed inflation data while major equity indexes hold near recent highs. Energy and tech lead sector moves.",
    source: "World Desk",
    url: "https://www.bbc.com/news/business",
    publishedAt: new Date().toISOString(),
    region: "global",
  },
  {
    id: "fb-2",
    title: "Climate summit drafts new framework for urban resilience",
    summary:
      "Cities from Singapore to Lagos join a pact focused on heat, flooding, and coastal adaptation funding through 2035.",
    source: "Planet Wire",
    url: "https://www.reuters.com/business/environment/",
    publishedAt: new Date(Date.now() - 3600_000).toISOString(),
    region: "global",
  },
  {
    id: "fb-3",
    title: "Tokyo unveils next-gen transit expansion for Olympics legacy corridors",
    summary:
      "Japan's capital greenlights automated rail links connecting outer suburbs with the bay area logistics hub.",
    source: "Asia Today",
    url: "https://www.bbc.com/news/world/asia",
    publishedAt: new Date(Date.now() - 7200_000).toISOString(),
    region: "tokyo",
  },
  {
    id: "fb-4",
    title: "New York tech corridor sees record venture deployment in Q2",
    summary:
      "AI infrastructure and fintech startups raised the bulk of capital, with midtown office absorption ticking up.",
    source: "Metro Markets",
    url: "https://www.reuters.com/technology/",
    publishedAt: new Date(Date.now() - 10800_000).toISOString(),
    region: "nyc",
  },
  {
    id: "fb-5",
    title: "London and Paris deepen cross-channel clean energy grid talks",
    summary:
      "Officials outline a joint undersea transmission roadmap aimed at stabilizing renewable supply across NW Europe.",
    source: "Euro Pulse",
    url: "https://www.bbc.com/news/world/europe",
    publishedAt: new Date(Date.now() - 14400_000).toISOString(),
    region: "london",
  },
  {
    id: "fb-6",
    title: "Dubai Airshow previews long-haul fleet orders amid travel rebound",
    summary:
      "Gulf carriers signal multi-year commitments as passenger demand between Asia, Africa, and Europe remains strong.",
    source: "Skyline News",
    url: "https://www.reuters.com/business/aerospace-defense/",
    publishedAt: new Date(Date.now() - 18000_000).toISOString(),
    region: "dubai",
  },
  {
    id: "fb-7",
    title: "São Paulo startups pioneer agrotech for Amazon basin monitoring",
    summary:
      "Satellite analytics firms partner with cooperatives to track deforestation risk and improve crop yields.",
    source: "LatAm Ledger",
    url: "https://www.bbc.com/news/world/latin_america",
    publishedAt: new Date(Date.now() - 21600_000).toISOString(),
    region: "sao-paulo",
  },
  {
    id: "fb-8",
    title: "Cairo hosts Nile basin water-security forum",
    summary:
      "Diplomats and engineers discuss shared irrigation, hydro, and drought early-warning systems for East Africa.",
    source: "Africa Watch",
    url: "https://www.reuters.com/world/africa/",
    publishedAt: new Date(Date.now() - 25200_000).toISOString(),
    region: "cairo",
  },
  {
    id: "fb-9",
    title: "Mumbai port authority modernizes container terminals",
    summary:
      "Automation and deeper berths aim to cut turnaround times as India-Middle East trade corridors expand.",
    source: "Trade Routes",
    url: "https://www.bbc.com/news/world/asia/india",
    publishedAt: new Date(Date.now() - 28800_000).toISOString(),
    region: "mumbai",
  },
  {
    id: "fb-10",
    title: "Berlin museums launch open digital archive of Cold War artifacts",
    summary:
      "A pan-European consortium digitizes letters, radio broadcasts, and photographs for free public access.",
    source: "Culture Wire",
    url: "https://www.reuters.com/world/europe/",
    publishedAt: new Date(Date.now() - 32400_000).toISOString(),
    region: "berlin",
  },
  {
    id: "fb-11",
    title: "Singapore advances green shipping corridor with Rotterdam",
    summary:
      "The dual-port partnership targets low-carbon bunkering standards for Asia–Europe container fleets.",
    source: "Maritime Brief",
    url: "https://www.bbc.com/news/business",
    publishedAt: new Date(Date.now() - 36000_000).toISOString(),
    region: "singapore",
  },
  {
    id: "fb-12",
    title: "Sydney heat-resilience plan prioritizes coastal wetlands restoration",
    summary:
      "Local councils pair nature-based defenses with building-code updates ahead of a warmer decade.",
    source: "Oceania Report",
    url: "https://www.reuters.com/world/asia-pacific/",
    publishedAt: new Date(Date.now() - 39600_000).toISOString(),
    region: "sydney",
  },
];

const RSS_FEEDS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://feeds.reuters.com/Reuters/worldNews",
];

export function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseRss(xml: string, sourceLabel: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const blocks = xml.match(itemRegex) ?? [];

  for (let i = 0; i < Math.min(blocks.length, 15); i++) {
    const block = blocks[i];
    const title = stripHtml((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1] ?? "");
    const link = stripHtml((block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ?? [])[1] ?? "#");
    const desc = stripHtml(
      (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ?? [])[1] ?? "",
    );
    const pub =
      stripHtml((block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ?? [])[1] ?? "") ||
      new Date().toISOString();

    if (!title) continue;
    items.push({
      id: `rss-${sourceLabel}-${i}-${title.slice(0, 24)}`,
      title,
      summary: desc.slice(0, 220) || "Read the full story on the source site.",
      source: sourceLabel,
      url: link.startsWith("http") ? link : "#",
      publishedAt: pub,
      region: "global",
    });
  }
  return items;
}

async function fetchViaProxy(url: string): Promise<string | null> {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];
  for (const proxy of proxies) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(proxy, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const text = await res.text();
      if (text && text.length > 200) return text;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function fetchWorldNews(): Promise<{ items: NewsItem[]; live: boolean }> {
  try {
    const results = await Promise.all(
      RSS_FEEDS.map(async (feed, idx) => {
        const xml = await fetchViaProxy(feed);
        if (!xml) return [] as NewsItem[];
        const label = idx === 0 ? "BBC World" : "Reuters";
        return parseRss(xml, label);
      }),
    );
    const merged = results.flat();
    if (merged.length >= 3) {
      // de-dupe by title prefix
      const seen = new Set<string>();
      const unique = merged.filter((n) => {
        const key = n.title.toLowerCase().slice(0, 40);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { items: unique.slice(0, 24), live: true };
    }
  } catch {
    /* fall through */
  }
  return { items: FALLBACK_NEWS, live: false };
}

export function filterNewsForCity(items: NewsItem[], cityKeywords: string[]): NewsItem[] {
  if (!cityKeywords.length) return items;
  const keys = cityKeywords.map((k) => k.toLowerCase());
  const matched = items.filter((item) => {
    const hay = `${item.title} ${item.summary} ${item.region ?? ""}`.toLowerCase();
    return keys.some((k) => hay.includes(k));
  });
  // If too few matches, blend with global headlines
  if (matched.length < 3) {
    const extras = items.filter((i) => !matched.includes(i)).slice(0, 6);
    return [...matched, ...extras];
  }
  return matched;
}
