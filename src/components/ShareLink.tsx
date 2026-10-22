"use client";

import { useState } from "react";

export function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  async function share() {
    if (canShare) {
      try { await navigator.share({ title: "ONE MORE", text: "ONE MORE — a one-minute arcade challenge. Play free in your browser:", url }); return; } catch { /* cancelled */ }
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* clipboard blocked: user can copy manually */ }
  }
  return (
    <div>
      <div className="share-box">
        <label className="sr-only" htmlFor="share-url">Your personal share link</label>
        <input id="share-url" className="input" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn btn--primary" onClick={share}>{canShare ? "Share" : "Copy link"}</button>
      </div>
      <p role="status" className="small muted" style={{ minHeight: "1.5em", marginTop: ".5rem" }}>{copied ? "Link copied." : ""}</p>
    </div>
  );
}
