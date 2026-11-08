"use client";

import { isNativeApp } from "./native";

/** Browser side of the daily reminder (Web Push). Never asks on page load: only after a run, when it's useful. */
const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const ASKED = "om_push_asked";
const DAYS = "om_play_days";

export function pushSupported(): boolean {
  return typeof window !== "undefined" && !!KEY && !isNativeApp() && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
export function pushPermission(): NotificationPermission | "unsupported" {
  return pushSupported() ? Notification.permission : "unsupported";
}

function keyBytes(b64: string) {
  const s = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
async function registration() { return navigator.serviceWorker.register("/sw.js", { scope: "/" }); }

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try { const reg = await navigator.serviceWorker.getRegistration("/"); return (await reg?.pushManager.getSubscription()) ?? null; } catch { return null; }
}

/** Streak for reminders (guests have no account, so it's counted on this device). */
export function localStreak(day: string): number {
  let days: string[] = [];
  try { days = JSON.parse(localStorage.getItem(DAYS) ?? "[]"); } catch { /* empty */ }
  if (!days.includes(day)) days = [...days, day].slice(-60);
  try { localStorage.setItem(DAYS, JSON.stringify(days)); } catch { /* storage blocked */ }
  // Count consecutive days back from today; one missed day is forgiven (same rule as the server's streak).
  const set = new Set(days), prev = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) - 864e5).toISOString().slice(0, 10);
  let n = 0, misses = 0, cur = day;
  for (let i = 0; i < 60; i++, cur = prev(cur)) {
    if (set.has(cur)) { n++; misses = 0; } else if (n === 0 || ++misses > 1) break;
  }
  return n;
}

/** Ask for permission and subscribe. `hourLocal` is when the reminder should arrive (default 7 pm local time). */
export async function enablePush(day: string, streak: number, hourLocal = 19): Promise<"on" | "denied" | "failed"> {
  if (!pushSupported()) return "failed";
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";
    const reg = await registration();
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
    const at = new Date(); at.setHours(hourLocal, 0, 0, 0);
    const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "subscribe", subscription: sub.toJSON(), hourUtc: at.getUTCHours(), day, streak }) });
    return r.ok ? "on" : "failed";
  } catch { return "failed"; }
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  try { await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unsubscribe", endpoint: sub.endpoint }) }); } catch { /* offline */ }
  try { await sub.unsubscribe(); } catch { /* already gone */ }
}

/** After a Daily run: skip today's reminder. Silent no-op when reminders are off. */
export async function touchPush(day: string, streak: number) {
  const sub = await currentSubscription();
  if (!sub) return;
  try { await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "touch", endpoint: sub.endpoint, day, streak }), keepalive: true }); } catch { /* offline */ }
}

/** Offer at most once every 4 days, and never again after "Never". */
export function shouldOfferPush(): boolean {
  if (pushPermission() !== "default") return false;
  try {
    const v = localStorage.getItem(ASKED);
    if (v === "never") return false;
    return !v || Date.now() - Number(v) > 4 * 864e5;
  } catch { return true; }
}
export function markPushAsked(never = false) { try { localStorage.setItem(ASKED, never ? "never" : String(Date.now())); } catch { /* storage blocked */ } }
