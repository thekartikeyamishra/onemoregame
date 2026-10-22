import { describe, expect, it } from "vitest";
import { shareText } from "@/components/ShareResult";
import { shouldShowCommunity } from "@/components/CommunityPrompt";
import { socialOrder, socials } from "@/lib/socials";

describe("share text", () => {
  it("is spoiler-free and compact", () => {
    const t = shareText({ mode: "daily", day: "2026-10-22", score: 2385, pickups: 74, maxCombo: 9, powerUps: 2, streak: 3, beat: null, target: null });
    expect(t).toBe("ONE MORE · Daily 2026-10-22\n2,385 pts · ◆74 · ×9 · ⬡2 · 🔥3\nCan you beat it?");
    expect(t.split("\n")).toHaveLength(3);
  });
  it("brags when you beat a friend and omits empty stats", () => {
    const t = shareText({ mode: "challenge", day: null, score: 900, pickups: 20, maxCombo: 4, powerUps: 0, streak: 1, beat: true, target: 850 });
    expect(t).toContain("Beat a friend's 850");
    expect(t).not.toContain("⬡");
    expect(t).not.toContain("🔥");
  });
});

describe("community prompt rules", () => {
  it("never shows on the first run, shows after a high moment or on the 3rd run", () => {
    expect(shouldShowCommunity({ runsThisVisit: 1, highMoment: true })).toBe(false);
    expect(shouldShowCommunity({ runsThisVisit: 2, highMoment: false })).toBe(false);
    expect(shouldShowCommunity({ runsThisVisit: 2, highMoment: true })).toBe(true);
    expect(shouldShowCommunity({ runsThisVisit: 3, highMoment: false })).toBe(true);
    expect(shouldShowCommunity({ runsThisVisit: 4, highMoment: false })).toBe(false);
  });
});

describe("socials", () => {
  it("are all https and every channel has a pitch", () => {
    for (const id of socialOrder) {
      expect(new URL(socials[id].href).protocol).toBe("https:");
      expect(socials[id].pitch.length).toBeGreaterThan(20);
    }
  });
});
