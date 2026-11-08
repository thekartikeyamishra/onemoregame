"use client";

import { nativePlatform } from "./native";

/**
 * In-app purchases inside the Android/iOS apps via RevenueCat (@revenuecat/purchases-capacitor), which uses Google
 * Play Billing and Apple StoreKit. Prices, payment sheets, receipts and refunds are handled by the stores.
 * Works for guests too (anonymous RevenueCat id); signing in moves purchases onto the account.
 */
type Fn = (opts?: unknown) => Promise<unknown>;
export interface StoreProduct { identifier: string; priceString: string; title?: string }
interface CustomerInfo { entitlements?: { active?: Record<string, { productIdentifier?: string }> } }

const KEYS = { ios: process.env.NEXT_PUBLIC_RC_IOS_KEY ?? "", android: process.env.NEXT_PUBLIC_RC_ANDROID_KEY ?? "" };
const LOCAL = "om_store_owned";

function rc(): Record<string, Fn> | null {
  const p = nativePlatform();
  if (!p || !KEYS[p]) return null;
  return (window.Capacitor?.Plugins?.Purchases as Record<string, Fn> | undefined) ?? null;
}

/** "ready" | "update" (app build without the purchases plugin) | "off" (website, or keys not configured). */
export function storeStatus(): "ready" | "update" | "off" {
  const p = nativePlatform();
  if (!p || !KEYS[p]) return "off";
  return window.Capacitor?.Plugins?.Purchases ? "ready" : "update";
}

export function ownedFromInfo(info: CustomerInfo | undefined): string[] {
  const out = new Set<string>();
  for (const [k, e] of Object.entries(info?.entitlements?.active ?? {})) { out.add(k); if (e.productIdentifier) out.add(e.productIdentifier); }
  return [...out].sort();
}

function remember(ids: string[]) { try { localStorage.setItem(LOCAL, JSON.stringify(ids)); } catch { /* storage blocked */ } }
/** Product ids bought in the app on this device (for guests; signed-in players get them from the server). */
export function localStoreOwned(): string[] {
  try { const v = JSON.parse(localStorage.getItem(LOCAL) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}

let ready: Promise<boolean> | null = null;
/** Configure once per page, then make sure the RevenueCat user matches the signed-in account. */
export function initStore(appUserId: string | null): Promise<boolean> {
  const p = rc();
  if (!p) return Promise.resolve(false);
  ready ??= (async () => {
    try {
      const conf = (await p.isConfigured()) as { isConfigured?: boolean };
      if (!conf?.isConfigured) await p.configure({ apiKey: KEYS[nativePlatform()!], ...(appUserId ? { appUserID: appUserId } : {}) });
      else if (appUserId) {
        const cur = (await p.getAppUserID()) as { appUserID?: string };
        if (cur?.appUserID !== appUserId) await p.logIn({ appUserID: appUserId });
      }
      const info = (await p.getCustomerInfo()) as { customerInfo?: CustomerInfo };
      remember(ownedFromInfo(info?.customerInfo));
      return true;
    } catch { ready = null; return false; }
  })();
  return ready;
}

export async function storeProducts(ids: string[]): Promise<Record<string, StoreProduct>> {
  const p = rc();
  if (!p || !(await initStore(null))) return {};
  try {
    const r = (await p.getProducts({ productIdentifiers: ids, type: "NON_SUBSCRIPTION" })) as { products?: StoreProduct[] };
    return Object.fromEntries((r?.products ?? []).map((x) => [x.identifier, x]));
  } catch { return {}; }
}

export type StoreResult = { ok: true; owned: string[] } | { ok: false; cancelled: boolean; error: string };

function failure(e: unknown): StoreResult {
  const err = e as { code?: string | number; message?: string; userCancelled?: boolean; data?: { userCancelled?: boolean } };
  const cancelled = !!(err?.userCancelled || err?.data?.userCancelled || String(err?.code) === "1" || /cancel/i.test(err?.message ?? ""));
  return { ok: false, cancelled, error: cancelled ? "Purchase cancelled." : "The store couldn't complete the purchase. You haven't been charged." };
}

export async function storeBuy(product: StoreProduct): Promise<StoreResult> {
  const p = rc();
  if (!p) return { ok: false, cancelled: false, error: "Purchases aren't available in this version of the app. Update it from the store." };
  try {
    const r = (await p.purchaseStoreProduct({ product })) as { customerInfo?: CustomerInfo };
    const owned = ownedFromInfo(r?.customerInfo);
    remember(owned);
    return { ok: true, owned };
  } catch (e) { return failure(e); }
}

export async function storeRestore(): Promise<StoreResult> {
  const p = rc();
  if (!p) return { ok: false, cancelled: false, error: "Restore isn't available in this version of the app." };
  try {
    await initStore(null);
    const r = (await p.restorePurchases()) as { customerInfo?: CustomerInfo };
    const owned = ownedFromInfo(r?.customerInfo);
    remember(owned);
    return { ok: true, owned };
  } catch (e) { return failure(e); }
}
