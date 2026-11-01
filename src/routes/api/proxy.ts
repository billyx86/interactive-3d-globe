import { createFileRoute } from "@tanstack/react-router";

/**
 * Same-origin CORS proxy for RSS feeds (#7, #15).
 *
 * The client's proxy chain (`src/data/news.ts`) tries this route first —
 * same origin, no third-party rate limits — before falling back to public
 * CORS proxies. Server-side, fetches run without browser CORS restrictions,
 * so feeds that blocked the old public-proxy User-Agent work here.
 *
 * Security model:
 *  - only `?url=` (absolute http/https) is served, max 2048 chars
 *  - deny-listed hosts (internal/LAN, localhost, private IP literals)
 *  - 20 s fetch budget, 4 MB response cap
 *  - response is passed through untouched (feeds are public XML/HTML)
 */
const MAX_URL_LEN = 2048;
const FETCH_TIMEOUT_MS = 20_000;
const MAX_BODY_BYTES = 4 * 1024 * 1024;

const DENY_HOSTS = new Set(["localhost", "0.0.0.0", "[::]"]);

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (DENY_HOSTS.has(h)) return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  // 10.x, 192.168.x, 172.16-31.x, 127.x, 169.254.x (link-local / cloud metadata)
  const parts = h.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length === 4 && parts.every((p) => Number.isFinite(p))) {
    const [a, b] = parts as [number, number, number, number];
    if (a === 127 || a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

export const Route = createFileRoute("/api/proxy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get("url") ?? "";
        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return new Response("Invalid or missing ?url= parameter", { status: 400 });
        }
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return new Response("Only http(s) URLs are proxied", { status: 400 });
        }
        if (target.length > MAX_URL_LEN || isPrivateHost(parsed.hostname)) {
          return new Response("URL not allowed", { status: 403 });
        }

        let res: Response;
        try {
          res = await fetch(parsed, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            headers: {
              // RSS publishers expect browser-like clients
              "user-agent":
                "Mozilla/5.0 (compatible; Orbital-Globe/1.0; +https://github.com/billyx86/interactive-3d-globe)",
              accept: "application/rss+xml, application/xml, text/xml, */*",
            },
          });
        } catch {
          return new Response("Upstream fetch failed", { status: 502 });
        }
        if (!res.ok) {
          return new Response(`Upstream responded ${res.status}`, { status: 502 });
        }

        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.byteLength > MAX_BODY_BYTES) {
          return new Response("Upstream response too large", { status: 502 });
        }

        const contentType = res.headers.get("content-type") ?? "application/octet-stream";
        return new Response(Buffer.from(buf), {
          status: 200,
          headers: {
            "content-type": contentType,
            // Short client-side cache keeps refreshes honest while trimming load
            "cache-control": "no-cache, max-age=0",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
