"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { socials } from "@/lib/socials";

/** Spoiler-free result line, Wordle-style: score, shards, best combo, power-ups, streak. No arena layout is revealed. */
export function shareText(o: { mode: "quick" | "daily" | "challenge"; day: string | null; twist?: string | null; score: number; pickups: number; maxCombo: number; powerUps: number; streak: number | null; beat: boolean | null; target: number | null }) {
  const head = (o.mode === "daily" && o.day ? `ONE MORE · Daily ${o.day}` : o.mode === "challenge" ? "ONE MORE · Challenge" : "ONE MORE") + (o.twist ? ` · ${o.twist}` : "");
  const stats = [`${o.score.toLocaleString("en-IN")} pts`, `◆${o.pickups}`, `×${o.maxCombo}`, ...(o.powerUps ? [`⬡${o.powerUps}`] : []), ...(o.streak && o.streak > 1 ? [`🔥${o.streak}`] : [])].join(" · ");
  const hook = o.beat === true ? `Beat a friend's ${o.target!.toLocaleString("en-IN")}. Your turn:` : "Can you beat it?";
  return `${head}\n${stats}\n${hook}`;
}

export function ShareResult({ text, url, onNeedUrl }: { text: string; url: string | null; onNeedUrl: () => Promise<string | null> }) {
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function link() {
    if (url) return url;
    setBusy(true);
    const u = await onNeedUrl();
    setBusy(false);
    if (!u) setStatus("Couldn't create a link. Try again.");
    return u;
  }

  async function nativeShare() {
    const u = await link(); if (!u) return;
    track("share_clicked", { method: "native" });
    if ("share" in navigator) {
      try { await navigator.share({ text: `${text}\n${u}` }); return; } catch { /* cancelled or unsupported */ }
    }
    try { await navigator.clipboard.writeText(`${text}\n${u}`); setStatus("Copied — paste it anywhere."); } catch { setStatus("Copy blocked by the browser."); }
  }

  async function open(kind: "whatsapp" | "x") {
    // Open the window synchronously (popup blockers), then point it at the share URL once the link exists.
    const w = window.open("about:blank", "_blank");
    if (w) w.opener = null;
    const u = await link();
    if (!u) { w?.close(); return; }
    track("share_clicked", { method: kind });
    const msg = `${text}\n${u}`;
    const target = kind === "whatsapp"
      ? `https://wa.me/?text=${encodeURIComponent(msg)}`
      : `https://x.com/intent/post?text=${encodeURIComponent(`${text}\n`)}&url=${encodeURIComponent(u)}&via=${socials.x.handle.replace("@", "")}`;
    if (w) w.location.href = target;
    else { try { await navigator.clipboard.writeText(msg); setStatus("Pop-up blocked — result copied instead."); } catch { setStatus("Pop-up blocked by the browser."); } }
  }

  return (
    <div className="share-result">
      <pre className="share-preview" aria-label="Share text preview">{text}</pre>
      <div className="btn-row">
        <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={nativeShare}>Share result</button>
        <button type="button" className="btn btn--sm" disabled={busy} onClick={() => void open("whatsapp")}>WhatsApp</button>
        <button type="button" className="btn btn--sm" disabled={busy} onClick={() => void open("x")}>Post on X</button>
      </div>
      <p className="small muted" role="status" style={{ minHeight: "1.4em", margin: ".4rem 0 0" }}>{status}</p>
    </div>
  );
}
