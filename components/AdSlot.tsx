"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ads } from "@/lib/site";

type Placement = keyof typeof ads.slots;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * One AdSense unit, matching the code generated in the AdSense dashboard.
 * - The AdSense loader script is included once, in the root layout <head>.
 * - Space is reserved before the ad fills so the page never jumps (CLS 0).
 * - Requested only when it's close to the viewport, and re-created on client-side
 *   navigation so each article gets a fresh ad.
 * - Labelled "Advertisement" and kept clear of buttons and forms (policy).
 * - Previews and local builds send data-adtest="on" so no invalid impressions are recorded.
 */
export function AdSlot({ placement, className = "" }: { placement: Placement; className?: string }) {
  const pathname = usePathname();
  const { id, format } = ads.slots[placement];
  if (!ads.client || !id) return null;
  return <AdUnit key={`${pathname}-${placement}`} slot={id} format={format} className={className} />;
}

function AdUnit({ slot, format, className }: { slot: string; format: "in-article" | "responsive"; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // A blocked or not-yet-loaded script is fine: the reserved space simply stays empty.
    }
  }, [near]);

  return (
    <aside aria-label="Advertisement" className={`my-12 ${className}`}>
      <p className="mb-2 text-xs text-slate">Advertisement</p>
      <div ref={ref} className={format === "in-article" ? "ad-slot ad-slot-article" : "ad-slot"}>
        {near ? (
          format === "in-article" ? (
            <ins
              className="adsbygoogle"
              style={{ display: "block", textAlign: "center" }}
              data-ad-layout="in-article"
              data-ad-format="fluid"
              data-ad-client={ads.client}
              data-ad-slot={slot}
              data-adtest={ads.test ? "on" : undefined}
            />
          ) : (
            <ins
              className="adsbygoogle"
              style={{ display: "block" }}
              data-ad-client={ads.client}
              data-ad-slot={slot}
              data-ad-format="auto"
              data-full-width-responsive="true"
              data-adtest={ads.test ? "on" : undefined}
            />
          )
        ) : null}
      </div>
    </aside>
  );
}
