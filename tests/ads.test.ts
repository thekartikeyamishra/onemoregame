import { afterEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ADSENSE_SRC, AdsDisclosure, AdsenseScript, loadAdsense } from "@/components/AdsenseScript";

const prev = process.env.NEXT_PUBLIC_ADS_ENABLED;
afterEach(() => { process.env.NEXT_PUBLIC_ADS_ENABLED = prev; });

describe("AdSense tag", () => {
  it("renders nothing while ads are disabled", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "false";
    expect(renderToStaticMarkup(createElement(AdsenseScript))).toBe("");
    expect(renderToStaticMarkup(createElement(AdsDisclosure))).toBe("");
  });
  it("uses the exact AdSense tag URL, loads it only in a browser (never on the server), and shows Google's disclosure", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    expect(ADSENSE_SRC("ca-pub-4557897331416844")).toBe("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4557897331416844");
    expect(renderToStaticMarkup(createElement(AdsenseScript))).toBe(""); // injected after load; skipped in the native apps
    expect(loadAdsense()).toBe(false); // no document on the server
    const text = renderToStaticMarkup(createElement(AdsDisclosure));
    expect(text).toContain("Third-party vendors, including Google, use cookies");
    expect(text).toContain("policies.google.com/technologies/partner-sites");
  });
});
