import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "@/lib/ttl-cache";

describe("TtlCache", () => {
  it("serves cached values until they expire and loads once", async () => {
    const c = new TtlCache<number>(1000);
    const load = vi.fn(async () => 42);
    expect(await c.getOrLoad("k", load, 0)).toBe(42);
    expect(await c.getOrLoad("k", load, 500)).toBe(42);
    expect(load).toHaveBeenCalledTimes(1);
    expect(c.get("k", 1001)).toBeUndefined();
  });
  it("evicts the oldest entry when full", () => {
    const c = new TtlCache<number>(1000, 2);
    c.set("a", 1, 0); c.set("b", 2, 0); c.set("c", 3, 0);
    expect(c.get("a", 1)).toBeUndefined();
    expect(c.get("c", 1)).toBe(3);
  });
});
