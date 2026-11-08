"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import { loadAdsense } from "./AdsenseScript";

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

/**
 * One manual, clearly labelled in-content ad unit. Renders nothing unless NEXT_PUBLIC_ADS_ENABLED=true and a numeric
 * slot ID is configured, and never inside the Android/iOS apps. Use only inside substantial content (guides, How to Play).
 */
export function AdSlot({ slot }: { slot: string }) {
  const ref = useRef<HTMLModElement>(null);
  const configured = site.ads.enabled && /^\d{6,20}$/.test(slot);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!configured) return;
    const id = requestAnimationFrame(() => setShow(loadAdsense()));
    return () => cancelAnimationFrame(id);
  }, [configured]);
  useEffect(() => {
    if (!show || !ref.current || ref.current.dataset.adsbygoogleStatus) return;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* script not loaded yet: it processes queued units on load */ }
  }, [show]);
  if (!configured || !show) return null;
  return (
    <aside className="ad-slot" aria-label="Advertisement">
      <ins ref={ref} className="adsbygoogle" style={{ display: "block", minHeight: 250 }} data-ad-client={site.ads.client!} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
