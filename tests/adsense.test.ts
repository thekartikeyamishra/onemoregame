import { describe, expect, it } from "vitest";
import { ADSENSE_CLIENT, normalizeAdsenseClient } from "@/lib/site";

describe("normalizeAdsenseClient", () => {
  it("accepts every form AdSense shows the publisher ID in", () => {
    for (const v of ["ca-pub-4557897331416844", "pub-4557897331416844", ' "pub-4557897331416844" ', "CA-PUB-4557897331416844"])
      expect(normalizeAdsenseClient(v)).toBe("ca-pub-4557897331416844");
  });
  it("falls back to the built-in ID when empty or invalid, so ads.txt never disappears", () => {
    for (const v of [undefined, "", "pub-123", "google.com, pub-4557897331416844, DIRECT"]) expect(normalizeAdsenseClient(v)).toBe(ADSENSE_CLIENT);
  });
});
