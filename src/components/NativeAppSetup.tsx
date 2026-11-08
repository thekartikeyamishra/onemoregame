"use client";

import { useEffect } from "react";
import { nativePlatform } from "@/lib/native";

type Listener = { remove?: () => void };

/**
 * Runs only inside the Android/iOS apps: marks <html> for app-specific styling, matches the system bars to the
 * game's colours, hides the native splash once the page is ready, and makes the Android back button navigate
 * back through pages (exiting from the home screen) instead of closing the app.
 */
export function NativeAppSetup() {
  useEffect(() => {
    const platform = nativePlatform();
    if (!platform) return;
    const P = window.Capacitor?.Plugins ?? {};
    document.documentElement.classList.add("is-native-app", `is-${platform}`);
    void P.StatusBar?.setStyle?.({ style: "DARK" }).catch(() => undefined);
    if (platform === "android") void P.StatusBar?.setBackgroundColor?.({ color: "#0a0f1f" }).catch(() => undefined);
    void P.SplashScreen?.hide?.().catch(() => undefined);
    let sub: Listener | null = null;
    const add = P.App?.addListener as unknown as ((e: string, cb: (d: { canGoBack: boolean }) => void) => Promise<Listener>) | undefined;
    if (platform === "android" && add) {
      void add("backButton", ({ canGoBack }) => {
        if (canGoBack && window.history.length > 1) window.history.back();
        else void P.App?.exitApp?.();
      }).then((l) => { sub = l; }).catch(() => undefined);
    }
    return () => { sub?.remove?.(); };
  }, []);
  return null;
}
