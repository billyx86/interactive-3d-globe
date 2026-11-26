import { lookup as dnsLookup } from "node:dns/promises";

/**
 * SSRF hostname & IP guard for `/api/proxy` (issue #17).
 *
 * Defense-in-depth two-stage check:
 *  1. Fast literal check on the normalized hostname (deny-list, internal
 *     suffixes, single-label internal names, private/reserved IPv4 & IPv6
 *     ranges including IPv4-mapped IPv6).
 *  2. DNS pre-flight via `lookup(hostname, { all: true })` so wildcard-DNS
 *     services (e.g. `127.0.0.1.nip.io`) and dual-homed records resolving to
 *     any private address are rejected.
 *
 * Pure module with no framework or route imports so it can be unit-tested
 * directly with an injected lookup stub.
 */

export interface LookupAddress {
  address: string;
  family: number;
}

export type LookupFn = (
  hostname: string,
  options: { all: true },
) => Promise<LookupAddress[]>;

const DENY_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "broadcasthost",
  "0.0.0.0",
  "::",
  "::1",
  "[::]",
  "[::1]",
]);

const DENY_SUFFIXES = [".local", ".internal", ".localhost", ".home.arpa"];

const IPV4_OCTET_RE = /^\d{1,3}$/;
const IPV6_HEXTET_RE = /^[0-9a-f]{1,4}$/i;

function parseIpv4(input: string): [number, number, number, number] | null {
  const parts = input.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!IPV4_OCTET_RE.test(part)) return null;
    const value = Number.parseInt(part, 10);
    if (value < 0 || value > 255) return null;
    octets.push(value);
  }
  return octets as [number, number, number, number];
}

function isPrivateIpv4(octets: [number, number, number, number]): boolean {
  const [a, b, c] = octets;
  if (a === 0) return true; // 0.0.0.0/8 ("this network")
  if (a === 10) return true; // 10.0.0.0/8 (RFC 1918)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT, RFC 6598)
  if (a === 127) return true; // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local + cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (RFC 1918)
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24 (IETF protocol assignments)
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 (RFC 1918)
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 (benchmarking)
  if (a >= 224 && a <= 239) return true; // 224.0.0.0/4 (multicast)
  if (a >= 240) return true; // 240.0.0.0/4 (reserved, incl. 255.255.255.255)
  return false;
}

function parseIpv6(input: string): number[] | null {
  if (!input.includes(":")) return null;
  // Strip optional IPv6 zone identifier (e.g. `fe80::1%eth0`).
  const zoneIdx = input.indexOf("%");
  let addr = zoneIdx >= 0 ? input.slice(0, zoneIdx) : input;

  // Handle embedded dotted-quad IPv4 suffix (e.g. `::ffff:127.0.0.1`).
  if (addr.includes(".")) {
    const lastColon = addr.lastIndexOf(":");
    if (lastColon === -1) return null;
    const v4 = parseIpv4(addr.slice(lastColon + 1));
    if (!v4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    addr = `${addr.slice(0, lastColon + 1)}${hi}:${lo}`;
  }

  const halves = addr.split("::");
  if (halves.length > 2) return null;

  let groups: string[];
  if (halves.length === 2) {
    const left = halves[0] === "" ? [] : halves[0].split(":");
    const right = halves[1] === "" ? [] : halves[1].split(":");
    const missing = 8 - (left.length + right.length);
    if (missing < 1) return null;
    groups = [...left, ...Array<string>(missing).fill("0"), ...right];
  } else {
    groups = addr.split(":");
    if (groups.length !== 8) return null;
  }

  const hextets: number[] = [];
  for (const group of groups) {
    if (!IPV6_HEXTET_RE.test(group)) return null;
    hextets.push(Number.parseInt(group, 16));
  }
  return hextets;
}

function isPrivateIpv6(hextets: number[]): boolean {
  const [h0, h1, h2, h3, h4, h5, h6, h7] = hextets;
  const allZeroPrefix =
    h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0;

  // Unspecified `::` and loopback `::1`
  if (allZeroPrefix && h5 === 0 && h6 === 0 && (h7 === 0 || h7 === 1)) {
    return true;
  }

  // IPv4-mapped `::ffff:0:0/96` (both `::ffff:a.b.c.d` and `::ffff:7f00:1`)
  if (allZeroPrefix && h5 === 0xffff) {
    return isPrivateIpv4([
      (h6 >> 8) & 0xff,
      h6 & 0xff,
      (h7 >> 8) & 0xff,
      h7 & 0xff,
    ]);
  }

  // Link-local `fe80::/10`
  if ((h0 & 0xffc0) === 0xfe80) return true;

  // Unique Local Address (ULA) `fc00::/7`
  if ((h0 & 0xfe00) === 0xfc00) return true;

  // Multicast `ff00::/8`
  if ((h0 & 0xff00) === 0xff00) return true;

  return false;
}

function isIpLiteral(normalized: string): boolean {
  return parseIpv4(normalized) !== null || parseIpv6(normalized) !== null;
}

/**
 * Normalize a raw URL hostname for SSRF checks (issue #17).
 *
 * Lowercases, strips any trailing `.` (closing `localhost.` bypasses), strips
 * enclosing `[` `]` from IPv6 literals, and maps `*.localhost` subdomains to
 * `"localhost"`. Returns `""` for empty input so callers treat it as private.
 */
export function normalizeHostname(hostname: string): string {
  let h = hostname.trim().toLowerCase();
  while (h.endsWith(".")) {
    h = h.slice(0, -1);
  }
  if (h.startsWith("[") && h.endsWith("]")) {
    h = h.slice(1, -1);
  }
  while (h.endsWith(".")) {
    h = h.slice(0, -1);
  }
  if (!h) return "";
  if (h.endsWith(".localhost")) return "localhost";
  return h;
}

/**
 * Check whether an IP literal (IPv4, IPv6, or IPv4-mapped IPv6) falls inside a
 * private, loopback, link-local, metadata, multicast, or reserved range
 * (issue #17).
 *
 * Accepts both dotted-quad (`::ffff:127.0.0.1`) and URL-normalized hex
 * (`::ffff:7f00:1`) IPv4-mapped IPv6 forms, with or without brackets. Returns
 * `false` for non-IP strings (hostnames are evaluated elsewhere).
 */
export function isPrivateAddress(address: string): boolean {
  let raw = address.trim().toLowerCase();
  if (raw.startsWith("[") && raw.endsWith("]")) {
    raw = raw.slice(1, -1);
  }
  if (!raw) return false;

  const v4 = parseIpv4(raw);
  if (v4) return isPrivateIpv4(v4);

  const v6 = parseIpv6(raw);
  if (v6) return isPrivateIpv6(v6);

  return false;
}

/**
 * Synchronous fast-path SSRF check on a hostname string with no DNS I/O
 * (issue #17).
 *
 * Blocks empty hostnames, explicit deny-listed hosts, local/internal suffixes
 * (`.local`, `.internal`, `.localhost`, `.home.arpa`), private IPv4/IPv6
 * literals, and single-label internal hostnames (while still permitting public
 * IPv6 literals).
 */
export function isPrivateHostLiteral(hostname: string): boolean {
  const h = normalizeHostname(hostname);
  if (!h) return true;
  if (DENY_HOSTS.has(h)) return true;
  if (DENY_SUFFIXES.some((suffix) => h.endsWith(suffix))) return true;

  const v4 = parseIpv4(h);
  if (v4) return isPrivateIpv4(v4);

  const v6 = parseIpv6(h);
  if (v6) return isPrivateIpv6(v6);

  // Single-label hostnames (no dots) resolve against local search domains /
  // /etc/hosts and are never public internet hosts.
  if (!h.includes(".")) return true;

  return isPrivateAddress(h);
}

/**
 * Full async SSRF guard for `/api/proxy` (issue #17).
 *
 * Runs the synchronous literal check first (fast path — no DNS for obvious
 * blocks or already-validated public IP literals). For domain names, resolves
 * every A/AAAA record with `lookup(hostname, { all: true })` and blocks if any
 * resolved address is private. A DNS lookup failure does not throw and returns
 * `false` so the route's upstream `fetch` can return its existing 502 instead
 * of turning transient DNS errors into 403.
 *
 * TOCTOU note: this is a pre-flight check; `fetch` resolves the hostname again
 * when opening the socket, so a short DNS-rebinding window remains. This is an
 * accepted trade-off because pinning the resolved IP in the request URL breaks
 * TLS SNI and certificate hostname verification.
 */
export async function isBlockedHostname(
  hostname: string,
  lookup: LookupFn = dnsLookup,
): Promise<boolean> {
  if (isPrivateHostLiteral(hostname)) return true;

  const normalized = normalizeHostname(hostname);
  if (isIpLiteral(normalized)) return false;

  let records: LookupAddress[];
  try {
    records = await lookup(normalized, { all: true });
  } catch {
    return false;
  }

  return records.some((record) => isPrivateAddress(record.address));
}
