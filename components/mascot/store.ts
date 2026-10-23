"use client";

import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import { clickCycle, type Mood } from "./expressions";

/* ---------- Tiny shared store: one Mitra mood + chat open state for the whole page ---------- */

type State = { mood: Mood; open: boolean };
let state: State = { mood: "neutral", open: false };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
let revertTimer: ReturnType<typeof setTimeout> | undefined;

export const mitra = {
  get: () => state,
  subscribe(cb: () => void) {
    subs.add(cb);
    return () => subs.delete(cb);
  },
  /** Show a mood; it relaxes back to `neutral` after `ms` unless ms is 0. */
  feel(mood: Mood, ms = 2600) {
    clearTimeout(revertTimer);
    state = { ...state, mood };
    emit();
    if (ms > 0) revertTimer = setTimeout(() => mitra.feel(state.open ? "happy" : "neutral", 0), ms);
  },
  setOpen(open: boolean) {
    state = { ...state, open };
    emit();
  },
};

const serverState: State = { mood: "neutral", open: false };
export function useMitra() {
  return useSyncExternalStore(mitra.subscribe, mitra.get, () => serverState);
}

/* ---------- Behaviour: eyes follow the pointer, naps when idle, reacts to clicks ---------- */

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useLivingMitra(ref: RefObject<HTMLElement | null>) {
  const clicks = useRef<number[]>([]);
  const cycle = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let idle: ReturnType<typeof setTimeout>;
    const IDLE_MS = 45_000;

    const wakeUp = () => {
      clearTimeout(idle);
      if (mitra.get().mood === "sleepy") mitra.feel("surprised", 1400);
      idle = setTimeout(() => mitra.feel("sleepy", 0), IDLE_MS);
    };

    const onMove = (e: PointerEvent) => {
      wakeUp();
      if (reducedMotion() || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, dist / 260);
        el.style.setProperty("--lx", ((dx / dist) * k).toFixed(3));
        el.style.setProperty("--ly", ((dy / dist) * k).toFixed(3));
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("keydown", wakeUp);
    window.addEventListener("scroll", wakeUp, { passive: true });
    idle = setTimeout(() => mitra.feel("sleepy", 0), IDLE_MS);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", wakeUp);
      window.removeEventListener("scroll", wakeUp);
      cancelAnimationFrame(frame);
      clearTimeout(idle);
    };
  }, [ref]);

  /** Click-for-fun: cycles through expressions; frantic clicking makes Mitra dizzy. */
  return function poke() {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 1500), now];
    const el = ref.current;
    if (el && !reducedMotion()) {
      el.classList.remove("mitra-squash");
      void el.offsetWidth; // restart the animation
      el.classList.add("mitra-squash");
    }
    if (clicks.current.length >= 5) {
      clicks.current = [];
      mitra.feel("dizzy", 2200);
      return;
    }
    mitra.feel(clickCycle[cycle.current++ % clickCycle.length]);
  };
}
