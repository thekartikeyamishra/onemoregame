"use client";

import { AdsenseScript } from "./AdsenseScript";
import { useEffect, useRef } from "react";
import { site } from "@/lib/site";

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

/**
 * One manual, clearly labelled in-content ad unit. Renders nothing unless NEXT_PUBLIC_ADS_ENABLED=true and a numeric
 * slot ID is configured. Use only inside substantial content (guides, How to Play). Content pages also render
 * <AdsenseScript /> so Auto ads work there; the game, forms, sign-in and challenges never load ad code.
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
      <AdsenseScript />
      <ins ref={ref} className="adsbygoogle" style={{ display: "block", minHeight: 250 }} data-ad-client={site.ads.client!} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
