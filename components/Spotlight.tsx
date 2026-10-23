"use client";

import { useEffect, useRef } from "react";

/** A soft light that follows the pointer inside its parent. Off for touch and reduced motion. */
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = parent.getBoundingClientRect();
        el.style.setProperty("--x", `${e.clientX - r.left}px`);
        el.style.setProperty("--y", `${e.clientY - r.top}px`);
        el.style.opacity = "1";
      });
    };
    const leave = () => (el.style.opacity = "0");
    parent.addEventListener("pointermove", move);
    parent.addEventListener("pointerleave", leave);
    return () => {
      parent.removeEventListener("pointermove", move);
      parent.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500"
      style={{ background: "radial-gradient(520px circle at var(--x, 50%) var(--y, 40%), var(--spot), transparent 70%)" }}
    />
  );
}
