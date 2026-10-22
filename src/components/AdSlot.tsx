"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { site } from "@/lib/site";

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

/**
 * One manual, clearly labelled in-content ad unit. Renders nothing unless NEXT_PUBLIC_ADS_ENABLED=true, the
 * publisher ID is set and a numeric slot ID is configured. The AdSense script is loaded only by this component,
 * so pages without an ad slot (the game, forms, sign-in, challenges) never load ad code — even if Auto ads are
 * switched on in the AdSense dashboard. Use only inside substantial content (guides, How to Play).
 */
export function AdSlot({ slot }: { slot: string }) {
  const ref = useRef<HTMLModElement>(null);
  const enabled = site.ads.enabled && /^\d{6,20}$/.test(slot);
  useEffect(() => {
    if (!enabled || !ref.current || ref.current.dataset.adsbygoogleStatus) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* blocked by an extension, or the script hasn't loaded yet (it processes queued units on load) */
    }
  }, [enabled]);
  if (!enabled) return null;
  return (
    <aside className="ad-slot" aria-label="Advertisement">
      <Script id="adsbygoogle-js" strategy="lazyOnload" crossOrigin="anonymous" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${site.ads.client}`} />
      <ins ref={ref} className="adsbygoogle" style={{ display: "block", minHeight: 250 }} data-ad-client={site.ads.client!} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
