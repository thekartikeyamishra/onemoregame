import { afterEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdsDisclosure, AdsenseScript } from "@/components/AdsenseScript";

const prev = process.env.NEXT_PUBLIC_ADS_ENABLED;
afterEach(() => { process.env.NEXT_PUBLIC_ADS_ENABLED = prev; });

describe("AdSense tag", () => {
  it("renders nothing while ads are disabled", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "false";
    expect(renderToStaticMarkup(createElement(AdsenseScript))).toBe("");
    expect(renderToStaticMarkup(createElement(AdsDisclosure))).toBe("");
  });
  it("renders the exact AdSense head tag and Google's required disclosure when enabled", () => {
    process.env.NEXT_PUBLIC_ADS_ENABLED = "true";
    const tag = renderToStaticMarkup(createElement(AdsenseScript));
    expect(tag).toContain('src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4557897331416844"');
    expect(tag).toContain('crossorigin="anonymous"');
    expect(tag).toContain("async");
    const text = renderToStaticMarkup(createElement(AdsDisclosure));
    expect(text).toContain("Third-party vendors, including Google, use cookies");
    expect(text).toContain("policies.google.com/technologies/partner-sites");
  });
});
