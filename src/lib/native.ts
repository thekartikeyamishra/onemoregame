"use client";

/**
 * Bridge to the Android/iOS app shells (Capacitor). The apps load this website; when they do, Capacitor injects
 * `window.Capacitor` with the native plugins registered in the app (Haptics, Share, StatusBar, App…).
 * Every helper here degrades gracefully in a normal browser.
 */
type Plugin = Record<string, (opts?: unknown) => Promise<unknown>>;
interface CapacitorGlobal { isNativePlatform?: () => boolean; getPlatform?: () => string; Plugins?: Record<string, Plugin | undefined> }
declare global { interface Window { Capacitor?: CapacitorGlobal } }

const cap = () => (typeof window === "undefined" ? undefined : window.Capacitor);

/** "android" | "ios" inside the store apps, otherwise null. */
export function nativePlatform(): "android" | "ios" | null {
  const c = cap();
  if (!c?.isNativePlatform?.()) return null;
  const p = c.getPlatform?.();
  return p === "android" || p === "ios" ? p : null;
}
export const isNativeApp = () => nativePlatform() !== null;

function plugin(name: string): Plugin | undefined {
  return cap()?.Plugins?.[name];
}

function hapticsOn(): boolean {
  try { return localStorage.getItem("om_haptics") !== "0"; } catch { return true; }
}
export function setHaptics(on: boolean) {
  try { localStorage.setItem("om_haptics", on ? "1" : "0"); } catch { /* storage blocked */ }
}
export function hapticsEnabled() { return hapticsOn(); }

export type HapticKind = "tap" | "light" | "medium" | "heavy" | "success" | "warning" | "error";
const VIBRATE: Record<HapticKind, number | number[]> = { tap: 8, light: 12, medium: 22, heavy: 40, success: [12, 40, 18], warning: [20, 30, 20], error: [35, 25, 45] };
let lastBuzz = 0;

/** Short vibration feedback. Native haptics in the apps; navigator.vibrate on Android browsers; nothing elsewhere. */
export function haptic(kind: HapticKind) {
  if (typeof window === "undefined" || !hapticsOn()) return;
  const now = performance.now();
  if (kind === "tap" || kind === "light") { if (now - lastBuzz < 60) return; }
  lastBuzz = now;
  const h = plugin("Haptics");
  try {
    if (h) {
      if (kind === "success" || kind === "warning" || kind === "error") void h.notification?.({ type: kind.toUpperCase() });
      else if (kind === "tap") void h.selectionChanged?.();
      else void h.impact?.({ style: kind === "heavy" ? "HEAVY" : kind === "medium" ? "MEDIUM" : "LIGHT" });
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate?.(VIBRATE[kind]);
  } catch { /* unsupported */ }
}

/** Native share sheet in the apps, Web Share API in browsers, clipboard as the fallback. Returns how it was shared. */
export async function shareContent(o: { title: string; text: string; url?: string }): Promise<"shared" | "copied" | "failed"> {
  const s = plugin("Share");
  try {
    if (s) { await s.share?.({ title: o.title, text: o.text, url: o.url, dialogTitle: o.title }); return "shared"; }
    if (typeof navigator !== "undefined" && navigator.share) { await navigator.share({ title: o.title, text: o.text, url: o.url }); return "shared"; }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return "failed";
    if (typeof e === "object" && e && "message" in e && String((e as { message: unknown }).message).toLowerCase().includes("cancel")) return "failed";
  }
  try { await navigator.clipboard.writeText([o.text, o.url].filter(Boolean).join(" ")); return "copied"; } catch { return "failed"; }
}
