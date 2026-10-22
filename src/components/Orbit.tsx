"use client";

import { useEffect, useRef } from "react";

/** Restrained pointer-reactive decoration: desktop + fine pointer only, throttled to animation frames. */
export function Orbit() {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!mq.matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 18;
        const y = (e.clientY / window.innerHeight - 0.5) * 18;
        if (ref.current) ref.current.style.transform = `translate(${x}px, ${y}px)`;
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);
  return (
    <svg ref={ref} className="orbit" viewBox="0 0 520 520" aria-hidden="true">
      <circle cx="260" cy="260" r="250" fill="none" stroke="rgba(139,123,255,0.25)" />
      <circle cx="260" cy="260" r="180" fill="none" stroke="rgba(62,230,240,0.2)" strokeDasharray="3 9" />
      <circle cx="430" cy="120" r="6" fill="#ffbf47" />
    </svg>
  );
}
