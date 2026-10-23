"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { mitra } from "./store";

// The chat dock isn't needed for first paint, so its code loads only after the
// visitor interacts (or after a few quiet seconds). This keeps the main thread free on load.
const ChatDock = dynamic(() => import("./ChatDock").then((m) => m.ChatDock), { ssr: false });

const EVENTS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;

export function MascotLoader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Remember a referral code from ?ref=… so it survives navigation to the sign-up form.
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[a-z0-9]{8}$/i.test(ref)) localStorage.setItem("ea_ref", ref.toLowerCase());
    } catch {}

    let done = false;
    const start = () => {
      if (done) return;
      done = true;
      setReady(true);
      cleanup();
    };
    const timer = setTimeout(start, 6000);
    const unsub = mitra.subscribe(() => mitra.get().open && start());
    EVENTS.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }));
    function cleanup() {
      clearTimeout(timer);
      unsub();
      EVENTS.forEach((e) => window.removeEventListener(e, start));
    }
    return cleanup;
  }, []);

  return ready ? <ChatDock /> : null;
}
