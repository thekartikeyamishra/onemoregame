"use client";

import { useEffect, useRef } from "react";
import { Face } from "./Face";
import { mitra, useLivingMitra, useMitra } from "./store";
import { expressions } from "./expressions";

/** The big Mitra in the hero. While it's on screen, the small chat dock hides. */
export function HeroMascot() {
  const ref = useRef<HTMLDivElement>(null);
  const poke = useLivingMitra(ref);
  const { mood } = useMitra();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      document.documentElement.dataset.heroMitra = e.isIntersecting ? "1" : "0";
    });
    io.observe(el);
    const hello = setTimeout(() => mitra.feel("wink", 1800), 900);
    return () => {
      io.disconnect();
      clearTimeout(hello);
      delete document.documentElement.dataset.heroMitra;
    };
  }, []);

  return (
    <div ref={ref} className="mitra relative mx-auto flex w-full max-w-[420px] flex-col items-center">
      <button
        type="button"
        onClick={poke}
        onMouseEnter={() => mitra.feel("happy", 1600)}
        className="relative aspect-square w-[min(72vw,340px)] cursor-pointer rounded-full"
        aria-label={`Mitra, the site guide, is feeling ${expressions[mood].label.toLowerCase()}. Click to play.`}
      >
        <Face mood={mood} className="h-full w-full" title="Mitra, the site guide" />
      </button>
      <div className="mt-4 flex items-center gap-3 rounded-full border border-line bg-surface py-1.5 pe-1.5 ps-4 text-[0.95rem] shadow-sm">
        <span className="text-slate">
          <span aria-hidden="true">{expressions[mood].emoji}</span> Mitra is {expressions[mood].label.toLowerCase()}
        </span>
        <button
          type="button"
          className="rounded-full bg-indigo px-3.5 py-1.5 font-semibold text-indigo-ink"
          onClick={() => {
            mitra.setOpen(true);
            mitra.feel("starstruck");
          }}
        >
          Say hi
        </button>
      </div>
    </div>
  );
}
