import { describe, expect, it, vi } from "vitest";
import {
  isBlockedHostname,
  isPrivateAddress,
  isPrivateHostLiteral,
  normalizeHostname,
  type LookupAddress,
  type LookupFn,
} from "./ssrf";

function makeStubLookup(
  recordsByHost: Record<string, LookupAddress[] | Error>,
): LookupFn {
  return async (hostname) => {
    const entry = recordsByHost[hostname];
    if (!entry) {
      throw new Error(`ENOTFOUND ${hostname}`);
    }
    if (entry instanceof Error) {
      throw entry;
    }
    return entry;
  };
}

describe("normalizeHostname (issue #17)", () => {
  it("lowercases and strips trailing dots", () => {
    expect(normalizeHostname("LOCALHOST.")).toBe("localhost");
    expect(normalizeHostname("Example.COM...")).toBe("example.com");
  });

  it("strips enclosing IPv6 brackets", () => {
    expect(normalizeHostname("[::1]")).toBe("::1");
    expect(normalizeHostname("[::ffff:7f00:1]")).toBe("::ffff:7f00:1");
    expect(normalizeHostname("[2606:4700:4700::1111]")).toBe("2606:4700:4700::1111");
  });

  it("maps localhost subdomains to a blocked form", () => {
    expect(normalizeHostname("foo.localhost")).toBe("localhost");
    expect(normalizeHostname("a.b.LOCALHOST.")).toBe("localhost");
  });

  it("returns empty string for empty or dot-only input", () => {
    expect(normalizeHostname("")).toBe("");
    expect(normalizeHostname("   ")).toBe("");
    expect(normalizeHostname("...")).toBe("");
  });
});

describe("isPrivateAddress (issue #17)", () => {
  it("blocks all private, loopback, link-local, metadata, multicast, and reserved IPv4 ranges", () => {
    const blockedIpv4 = [
      "0.0.0.0",
      "0.1.2.3",
      "10.0.0.1",
      "10.1.2.3",
      "100.64.0.1",
      "100.127.255.254",
      "127.0.0.1",
      "127.255.255.254",
      "169.254.169.254",
      "172.16.0.1",
      "172.20.0.1",
      "172.31.255.254",
      "192.0.0.1",
      "192.168.1.10",
      "198.18.0.1",
      "198.19.255.254",
      "224.0.0.1",
      "239.255.255.250",
      "240.0.0.1",
      "255.255.255.255",
    ];
    for (const ip of blockedIpv4) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("allows public IPv4 addresses including range boundaries", () => {
    const publicIpv4 = [
      "1.1.1.1",
      "8.8.8.8",
      "93.184.216.34",
      "100.63.255.255",
      "100.128.0.0",
      "172.15.255.255",
      "172.32.0.0",
      "192.0.1.1",
      "198.17.255.255",
      "198.20.0.0",
      "223.255.255.255",
    ];
    for (const ip of publicIpv4) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });

  it("blocks unspecified, loopback, link-local, ULA, and private IPv4-mapped IPv6 addresses", () => {
    const blockedIpv6 = [
      "::",
      "[::]",
      "::1",
      "[::1]",
      "0:0:0:0:0:0:0:1",
      "fe80::1",
      "fe80::1%eth0",
      "febf::1",
      "fc00::1",
      "fd00::1",
      "fd12:3456:789a::1",
      "ff02::1",
      "::ffff:127.0.0.1",
      "[::ffff:127.0.0.1]",
      "::ffff:7f00:1",
      "[::ffff:7f00:1]",
      "0:0:0:0:0:ffff:7f00:1",
      "::ffff:169.254.169.254",
      "::ffff:a9fe:a9fe",
      "::ffff:10.0.0.1",
    ];
    for (const ip of blockedIpv6) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("allows public IPv6 literals and public IPv4-mapped IPv6 addresses", () => {
    const publicIpv6 = [
      "2606:4700:4700::1111",
      "[2606:4700:4700::1111]",
      "2001:4860:4860::8888",
      "::ffff:8.8.8.8",
      "::ffff:808:808",
    ];
    for (const ip of publicIpv6) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });

  it("returns false for non-IP hostnames and malformed literals", () => {
    for (const value of ["example.com", "localhost", "999.0.0.1", "1:2::3::4", ""]) {
      expect(isPrivateAddress(value), value).toBe(false);
    }
  });
});

describe("isPrivateHostLiteral (issue #17)", () => {
  it("blocks all issue #17 bypass literals, deny-listed names, internal suffixes, and short names", () => {
    const blockedLiterals = [
      "",
      "localhost",
      "localhost.",
      "LOCALHOST.",
      "foo.localhost",
      "localhost.localdomain",
      "broadcasthost",
      "[::1]",
      "::1",
      "[::]",
      "::",
      "0.0.0.0",
      "printer.local",
      "svc.internal",
      "nas.home.arpa",
      "intranet",
      "127.0.0.1",
      "10.1.2.3",
      "172.20.0.1",
      "192.168.1.10",
      "169.254.169.254",
      "100.64.0.1",
      "255.255.255.255",
      "[::ffff:127.0.0.1]",
      "[::ffff:7f00:1]",
      new URL("http://[::ffff:127.0.0.1]/").hostname,
      "fe80::1",
      "fd00::1",
    ];
    for (const host of blockedLiterals) {
      expect(isPrivateHostLiteral(host), host).toBe(true);
    }
  });

  it("allows public hostnames and public IPv4/IPv6 literals", () => {
    for (const host of [
      "example.com",
      "8.8.8.8",
      "1.1.1.1",
      "2606:4700:4700::1111",
      "[2606:4700:4700::1111]",
    ]) {
      expect(isPrivateHostLiteral(host), host).toBe(false);
    }
  });
});

describe("isBlockedHostname (issue #17)", () => {
  it("short-circuits blocked literals without calling DNS lookup", async () => {
    const lookupSpy = vi.fn<LookupFn>(async () => []);
    for (const host of [
      "localhost",
      "localhost.",
      "LOCALHOST.",
      "foo.localhost",
      "[::1]",
      "[::ffff:127.0.0.1]",
      "[::ffff:7f00:1]",
      "169.254.169.254",
      "fe80::1",
      "fd00::1",
    ]) {
      expect(await isBlockedHostname(host, lookupSpy), host).toBe(true);
    }
    expect(lookupSpy).not.toHaveBeenCalled();
  });

  it("allows public domain names and public IPv4/IPv6 literals", async () => {
    const stub = makeStubLookup({
      "example.com": [{ address: "93.184.216.34", family: 4 }],
    });

    expect(await isBlockedHostname("example.com", stub)).toBe(false);
    expect(await isBlockedHostname("8.8.8.8", stub)).toBe(false);
    expect(await isBlockedHostname("1.1.1.1", stub)).toBe(false);
    expect(await isBlockedHostname("2606:4700:4700::1111", stub)).toBe(false);
    expect(await isBlockedHostname("[2606:4700:4700::1111]", stub)).toBe(false);
  });

  it("blocks wildcard-DNS names resolving to loopback or cloud metadata", async () => {
    const stub = makeStubLookup({
      "127.0.0.1.nip.io": [{ address: "127.0.0.1", family: 4 }],
      "169.254.169.254.nip.io": [{ address: "169.254.169.254", family: 4 }],
    });

    expect(await isBlockedHostname("127.0.0.1.nip.io", stub)).toBe(true);
    expect(await isBlockedHostname("169.254.169.254.nip.io", stub)).toBe(true);
  });

  it("checks every resolved A/AAAA record and blocks if any address is private", async () => {
    const publicOnly = makeStubLookup({
      "evil.example": [{ address: "93.184.216.34", family: 4 }],
    });
    const mixed = makeStubLookup({
      "evil.example": [
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.1", family: 4 },
      ],
    });
    const mixedV6 = makeStubLookup({
      "evil.example": [
        { address: "2606:4700:4700::1111", family: 6 },
        { address: "::ffff:127.0.0.1", family: 6 },
      ],
    });

    expect(await isBlockedHostname("evil.example", publicOnly)).toBe(false);
    expect(await isBlockedHostname("evil.example", mixed)).toBe(true);
    expect(await isBlockedHostname("evil.example", mixedV6)).toBe(true);
  });

  it("does not throw or block when DNS lookup fails, falling through to upstream 502", async () => {
    const failing = makeStubLookup({
      "flaky.example": new Error("EAI_AGAIN"),
    });

    await expect(isBlockedHostname("flaky.example", failing)).resolves.toBe(false);
  });
});
