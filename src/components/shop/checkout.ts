"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LOOK, allowedLook, isSkinId, isTrailId, type Look } from "@/game/cosmetics";
import { itemsFor, type ProductId } from "@/lib/shop/catalog";
import { isNativeApp } from "@/lib/native";
import { initStore, localStoreOwned, storeBuy, storeProducts, storeRestore, storeStatus, type StoreProduct } from "@/lib/purchases";
import { track } from "@/lib/analytics";

/** Shared shop state and checkout for the Shop page and the Replay Studio offer. */

export interface ShopState {
  loaded: boolean; signedIn: boolean; appUserId: string | null; displayName: string | null;
  owned: string[]; equipped: Look; badge: string | null; webCheckout: boolean;
  founders: { count: number; names: string[] };
}
const EMPTY: ShopState = { loaded: false, signedIn: false, appUserId: null, displayName: null, owned: [], equipped: DEFAULT_LOOK, badge: null, webCheckout: false, founders: { count: 0, names: [] } };

const LOOK_KEY = "om_look";
export function readLocalLook(): Partial<Look> {
  try { const v = JSON.parse(localStorage.getItem(LOOK_KEY) ?? "{}"); return { ...(isSkinId(v.skin) ? { skin: v.skin } : {}), ...(isTrailId(v.trail) ? { trail: v.trail } : {}) }; } catch { return {}; }
}
export function writeLocalLook(l: Look) { try { localStorage.setItem(LOOK_KEY, JSON.stringify(l)); } catch { /* storage blocked */ } }

/** Owned items: the account's (server) plus, in the apps, store purchases made on this device as a guest. */
export function mergedOwned(server: string[]): string[] {
  return isNativeApp() ? [...new Set([...server, ...itemsFor(localStoreOwned())])].sort() : server;
}

/** The look to draw in game: the account's choice when signed in, otherwise this device's, limited to owned items. */
export function effectiveLook(signedIn: boolean, serverLook: Look | null, owned: string[]): Look {
  return allowedLook(signedIn && serverLook ? serverLook : readLocalLook(), owned);
}

export function useShop() {
  const [s, setS] = useState<ShopState>(EMPTY);
  const [prices, setPrices] = useState<Record<string, StoreProduct>>({});
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/shop", { cache: "no-store" });
      const d = r.ok ? ((await r.json()) as Omit<ShopState, "loaded">) : null;
      const owned = mergedOwned(d?.owned ?? []);
      setS({ ...EMPTY, ...(d ?? {}), owned, equipped: effectiveLook(!!d?.signedIn, d?.equipped ?? null, owned), loaded: true });
      if (storeStatus() === "ready") {
        await initStore(d?.appUserId ?? null);
        setPrices(await storeProducts(["founder_pack", "replay_studio", "skin_ember", "skin_glacier", "skin_neon", "skin_gold", "skin_glitch", "trail_comet", "trail_pixel", "trail_lightning"]));
        const again = mergedOwned(d?.owned ?? []);
        setS((cur) => ({ ...cur, owned: again, equipped: effectiveLook(cur.signedIn, d?.equipped ?? null, again) }));
      }
    } catch { setS((cur) => ({ ...cur, loaded: true })); }
  }, []);
  useEffect(() => { const id = requestAnimationFrame(() => void refresh()); return () => cancelAnimationFrame(id); }, [refresh]);
  return { state: s, setState: setS, prices, refresh };
}

export type BuyResult = { ok: true; owned: string[] } | { ok: false; error: string; cancelled?: boolean; needSignIn?: boolean };

async function postJson<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, data: d as T } : { ok: false, error: (d as { error?: string }).error ?? "Something went wrong.", status: r.status };
  } catch { return { ok: false, error: "You're offline. Try again when you're connected.", status: 0 }; }
}

interface RazorpayResponse { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, f: (r: unknown) => void) => void } } }

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const el = document.createElement("script");
    el.src = "https://checkout.razorpay.com/v1/checkout.js"; el.async = true;
    el.onload = () => resolve(!!window.Razorpay); el.onerror = () => resolve(false);
    document.head.appendChild(el);
  });
}

async function buyOnWeb(productId: ProductId, s: ShopState): Promise<BuyResult> {
  if (!s.signedIn) return { ok: false, needSignIn: true, error: "Sign in first so your purchase is saved to your account and works on every device." };
  const o = await postJson<{ orderId: string; amount: number; keyId: string; name: string; email: string | null }>("/api/shop/order", { productId });
  if (!o.ok) return { ok: false, error: o.error };
  if (!(await loadRazorpay())) return { ok: false, error: "Checkout couldn't load. Check your connection or disable blockers and try again." };
  const paid = await new Promise<RazorpayResponse | null>((resolve) => {
    const rz = new window.Razorpay!({
      key: o.data.keyId, amount: o.data.amount, currency: "INR", order_id: o.data.orderId,
      name: "ONE MORE", description: o.data.name, theme: { color: "#3ee6f0" },
      prefill: o.data.email ? { email: o.data.email } : {},
      notes: { productId },
      handler: (r: RazorpayResponse) => resolve(r),
      modal: { ondismiss: () => resolve(null), confirm_close: true },
    });
    rz.on("payment.failed", () => undefined); // Razorpay shows the failure and lets the player retry inside checkout
    rz.open();
  });
  if (!paid) return { ok: false, cancelled: true, error: "Payment cancelled." };
  const v = await postJson<{ owned: string[] }>("/api/shop/verify", { orderId: paid.razorpay_order_id, paymentId: paid.razorpay_payment_id, signature: paid.razorpay_signature });
  return v.ok ? { ok: true, owned: v.data.owned } : { ok: false, error: v.error };
}

async function buyInApp(productId: ProductId, s: ShopState, prices: Record<string, StoreProduct>): Promise<BuyResult> {
  await initStore(s.appUserId);
  const p = prices[productId] ?? (await storeProducts([productId]))[productId];
  if (!p) return { ok: false, error: "This item isn't available in your store yet. Please try again later." };
  const r = await storeBuy(p);
  if (!r.ok) return { ok: false, error: r.error, cancelled: r.cancelled };
  if (s.signedIn) {
    const sync = await postJson<{ owned: string[] }>("/api/shop/sync", {});
    if (sync.ok) return { ok: true, owned: mergedOwned(sync.data.owned) };
  }
  return { ok: true, owned: mergedOwned(s.owned) };
}

/** Buy one product: Google Play / App Store inside the apps, Razorpay (UPI, cards, netbanking) on the website. */
export async function buy(productId: ProductId, s: ShopState, prices: Record<string, StoreProduct>, from: string): Promise<BuyResult> {
  track("shop_buy_started", { productId, from });
  const status = storeStatus();
  const r = isNativeApp()
    ? status === "ready" ? await buyInApp(productId, s, prices) : { ok: false as const, error: "Update ONE MORE from the store to unlock purchases." }
    : s.webCheckout ? await buyOnWeb(productId, s) : { ok: false as const, error: "Website checkout opens soon. You can already buy in the Android and iOS apps." };
  if (r.ok) track("shop_purchased", { productId, from });
  return r;
}

export async function restore(s: ShopState): Promise<BuyResult> {
  if (isNativeApp()) {
    const r = await storeRestore();
    if (!r.ok) return { ok: false, error: r.error };
  }
  if (!s.signedIn) return isNativeApp() ? { ok: true, owned: mergedOwned([]) } : { ok: false, needSignIn: true, error: "Sign in to restore purchases made with your account." };
  const sync = await postJson<{ owned: string[] }>("/api/shop/sync", { restore: true });
  return sync.ok ? { ok: true, owned: mergedOwned(sync.data.owned) } : { ok: false, error: sync.error };
}

/** Save the equipped look: on the account when signed in (shown on leaderboards), always on this device. */
export async function saveLook(look: Look, s: ShopState): Promise<void> {
  writeLocalLook(look);
  if (s.signedIn) await postJson("/api/shop/equip", look);
}
