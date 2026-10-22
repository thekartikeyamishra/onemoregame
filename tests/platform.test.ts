import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { consume } from "@/lib/rate-limit";
import { safeHttpsUrl, publicRoutes, privateRoutePrefixes } from "@/lib/site";
import { splitToken } from "@/lib/validation";

describe("rate limiting", () => {
  it("blocks after the limit and resets in the next window", async () => {
    const store = new MemoryStore();
    const lim = { name: "t", max: 2, windowMs: 1000 };
    expect(await consume(store, lim, "abc", 0)).toBe(true);
    expect(await consume(store, lim, "abc", 1)).toBe(true);
    expect(await consume(store, lim, "abc", 2)).toBe(false);
    expect(await consume(store, lim, "abc", 1001)).toBe(true);
  });
});

describe("store URLs", () => {
  it("accepts only https URLs on the official store hosts", () => {
    expect(safeHttpsUrl("https://play.google.com/store/apps/details?id=x", ["play.google.com"])).toBeTruthy();
    expect(safeHttpsUrl("http://play.google.com/x", ["play.google.com"])).toBeNull();
    expect(safeHttpsUrl("https://evil.example/x", ["play.google.com"])).toBeNull();
    expect(safeHttpsUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpsUrl("")).toBeNull();
  });
});

describe("routing policy", () => {
  it("never lists private routes in the sitemap source", () => {
    for (const r of publicRoutes) for (const p of privateRoutePrefixes) expect(r.path.startsWith(p)).toBe(false);
  });
});

describe("tokens", () => {
  it("parses only well-formed tokens", () => {
    expect(splitToken("abcdefgh.abcdefghijabcdefghijabc")).toEqual({ id: "abcdefgh", secret: "abcdefghijabcdefghijabc" });
    expect(splitToken("a.b")).toBeNull();
    expect(splitToken("../../etc.passwdpasswdpasswdpasswd")).toBeNull();
    expect(splitToken(42)).toBeNull();
  });
});

describe("memory store", () => {
  it("rolls back a transaction whose create collides", async () => {
    const s = new MemoryStore();
    await s.transaction(async (tx) => tx.create("c", "1", { v: 1 }));
    await expect(s.transaction(async (tx) => { tx.set("c", "2", { v: 2 }); tx.create("c", "1", { v: 3 }); })).rejects.toThrow();
    expect(await s.get("c", "2")).toBeNull();
    expect(await s.get("c", "1")).toEqual({ v: 1 });
  });
});

import { clientIp } from "@/lib/request";
describe("client IP behind a load balancer", () => {
  it("ignores client-supplied X-Forwarded-For entries", () => {
    const h = (v: string) => new Headers({ "x-forwarded-for": v });
    expect(clientIp(h("1.1.1.1, 203.0.113.9, 34.1.1.1"))).toBe("203.0.113.9");
    expect(clientIp(h("203.0.113.9, 34.1.1.1"))).toBe("203.0.113.9");
    expect(clientIp(h("203.0.113.9"))).toBe("203.0.113.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
