import { describe, expect, it, vi } from "vitest";
import {
  FALLBACK_NEWS,
  filterNewsForCity,
  parseRss,
  stripHtml,
  fetchWorldNews,
  type NewsItem,
} from "./news";

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("  <b>Hello</b>   world  ")).toBe("Hello world");
  });

  it("decodes common entities", () => {
    expect(stripHtml("a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39;")).toBe(
      'a & b <c> "d" \'e\'',
    );
  });

  it("unwraps CDATA sections", () => {
    expect(stripHtml("<![CDATA[Summit begins in Geneva]]>")).toBe("Summit begins in Geneva");
  });
});

describe("parseRss", () => {
  const XML = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title><![CDATA[First <headline> story]]></title>
    <link>https://example.com/a</link>
    <description>&lt;b&gt;Summary one&lt;/b&gt;</description>
    <pubDate>Tue, 18 Aug 2026 10:00:00 GMT</pubDate>
  </item>
  <item>
    <title>Second story</title>
    <description>No link in this one</description>
  </item>
  <item>
    <description>Item without a title should be skipped</description>
  </item>
</channel></rss>`;

  it("extracts titles, links and summaries", () => {
    const items = parseRss(XML, "Test Source");
    expect(items).toHaveLength(2);
    // CDATA is unwrapped first, then any embedded tags are stripped
    expect(items[0]!.title).toBe("First story");
    expect(items[0]!.url).toBe("https://example.com/a");
    expect(items[0]!.source).toBe("Test Source");
    expect(items[0]!.publishedAt).toContain("2026");
  });

  it("skips items without a title", () => {
    const items = parseRss(XML, "Test Source");
    expect(items.every((i) => i.title.length > 0)).toBe(true);
  });

  it("caps output at 15 items", () => {
    const many = `<rss><channel>${"<item><title>t</title><link>https://e.com</link></item>".repeat(30)}</channel></rss>`;
    expect(parseRss(many, "S")).toHaveLength(15);
  });

  it("returns [] for non-RSS input", () => {
    expect(parseRss("<html><body>not a feed</body></html>", "S")).toEqual([]);
  });
});

describe("FALLBACK_NEWS", () => {
  it("items are well-formed", () => {
    for (const item of FALLBACK_NEWS) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.summary.length).toBeGreaterThan(0);
      expect(item.url).toMatch(/^https:\/\//);
      expect(Number.isNaN(Date.parse(item.publishedAt)), item.id).toBe(false);
    }
  });

  it("ids are unique", () => {
    const ids = FALLBACK_NEWS.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("filterNewsForCity", () => {
  const items: NewsItem[] = [
    { id: "1", title: "Tokyo rail line opens", summary: "Transit expansion", source: "S", url: "https://e.com", publishedAt: new Date().toISOString(), region: "tokyo" },
    { id: "2", title: "Markets rally in Asia", summary: "Nikkei hits high", source: "S", url: "https://e.com", publishedAt: new Date().toISOString(), region: "global" },
    { id: "3", title: "Weather front moves over Europe", summary: "Rain expected", source: "S", url: "https://e.com", publishedAt: new Date().toISOString(), region: "europe" },
  ];

  it("returns everything when there are no keywords", () => {
    expect(filterNewsForCity(items, [])).toHaveLength(items.length);
  });

  it("matches keywords across title, summary and region", () => {
    const matched = filterNewsForCity(items, ["tokyo", "nikkei"]);
    const ids = matched.map((n) => n.id);
    // Direct keyword hits: item 1 (tokyo) and item 2 (nikkei)
    expect(ids).toContain("1");
    expect(ids).toContain("2");
    // 2 matches < 3, so the rest are blended in to fill the feed
    expect(matched.length).toBe(items.length);
  });

  it("blends in extras when matches are scarce", () => {
    const matched = filterNewsForCity(items, ["tokyo"]);
    // 1 direct match (< 3) → blended with up to 6 extras
    expect(matched.length).toBeGreaterThan(1);
    expect(matched[0]!.id).toBe("1");
  });
});

describe("fetchWorldNews", () => {
  it("returns the fallback set when all feeds fail", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
    const { items, live } = await fetchWorldNews();
    expect(live).toBe(false);
    expect(items).toEqual(FALLBACK_NEWS);
    vi.unstubAllGlobals();
  });

  it("returns live items from a successful feed", async () => {
    const xml = `<rss><channel>${[0, 1, 2, 3].map((i) => `<item><title>Headline ${i}</title><link>https://e.com/n${i}</link><description>Body ${i}</description></item>`).join("")}</channel></rss>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("allorigins")) {
          return { ok: true, text: async () => xml };
        }
        throw new Error("no proxy");
      }),
    );
    const { items, live } = await fetchWorldNews();
    expect(live).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(3);
    vi.unstubAllGlobals();
  });
});
