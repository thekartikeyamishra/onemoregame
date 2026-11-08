import { createHmac } from "node:crypto";
import { allowedLook, type Look } from "@/game/cosmetics";
import { safeEqual } from "../crypto";
import { C, type Store } from "../store/types";
import { TtlCache } from "../ttl-cache";
import type { Ctx } from "../early-access";
import type { Player } from "../game-service";
import { FOUNDER_BADGE, forSale, isProductId, itemsFor, product, type ProductId } from "./catalog";

/**
 * Ownership of optional cosmetics. The server is the source of truth: store purchases arrive from RevenueCat
 * (Google Play Billing / Apple StoreKit underneath), website purchases from Razorpay. Both are merged on the
 * player document, so an item bought anywhere works everywhere once the player is signed in.
 */

export interface ShopConfig {
  razorpayKeyId: string | null;
  razorpayKeySecret: string | null;
  razorpayWebhookSecret: string | null;
  revenuecatSecret: string | null;
  revenuecatWebhookAuth: string | null;
}

export function shopConfig(env: Record<string, string | undefined> = process.env): ShopConfig {
  const v = (k: string) => env[k]?.trim() || null;
  return {
    razorpayKeyId: v("RAZORPAY_KEY_ID"), razorpayKeySecret: v("RAZORPAY_KEY_SECRET"), razorpayWebhookSecret: v("RAZORPAY_WEBHOOK_SECRET"),
    revenuecatSecret: v("REVENUECAT_SECRET_KEY"), revenuecatWebhookAuth: v("REVENUECAT_WEBHOOK_AUTH"),
  };
}
export const webCheckoutEnabled = (c: ShopConfig) => !!(c.razorpayKeyId && c.razorpayKeySecret);

export interface Deps { cfg: ShopConfig; fetch: typeof fetch }
const defaultDeps = (): Deps => ({ cfg: shopConfig(), fetch: globalThis.fetch.bind(globalThis) });

export interface Ownership { owned: string[]; equipped: Look; badge: string | null }

export interface PurchaseDoc extends Record<string, unknown> {
  signupId: string; productId: ProductId; amount: number; currency: "INR"; provider: "razorpay";
  status: "created" | "paid" | "refunded"; orderId: string; paymentId: string | null; createdAt: number; paidAt: number | null; refundedAt?: number | null;
}

/** Pure: derived fields after the bought product lists change. */
export function withOwnership(p: Player): Player {
  const owned = itemsFor([...((p.webOwned as string[] | undefined) ?? []), ...((p.storeOwned as string[] | undefined) ?? [])]);
  return { ...p, owned, badge: owned.includes(FOUNDER_BADGE) ? FOUNDER_BADGE : null, equipped: allowedLook(p.equipped as Partial<Look> | undefined, owned) };
}

export function ownershipOf(p: Player | null): Ownership {
  const owned = (p?.owned as string[] | undefined) ?? [];
  return { owned, equipped: allowedLook(p?.equipped as Partial<Look> | undefined, owned), badge: (p?.badge as string | null | undefined) ?? null };
}

async function updatePlayer(store: Store, signupId: string, fn: (p: Player) => Player): Promise<Player> {
  return store.transaction(async (tx) => {
    const cur = ((await tx.get<Player>(C.players, signupId)) ?? { displayName: null, runs: 0, bestScore: 0, firstRunAt: null, lastDay: null, days: 0, played: false, repeated: false, returned: false }) as Player;
    const next = withOwnership(fn(cur));
    tx.set(C.players, signupId, next);
    return next;
  });
}

export async function equip(ctx: Ctx, signupId: string, want: Partial<Look>): Promise<Look> {
  const next = await updatePlayer(ctx.store, signupId, (p) => ({ ...p, equipped: { ...((p.equipped as object) ?? {}), ...want } }));
  return ownershipOf(next).equipped;
}

// ---------------------------------------------------------------- website (Razorpay)

const RZP = "https://api.razorpay.com/v1";
const basic = (c: ShopConfig) => `Basic ${Buffer.from(`${c.razorpayKeyId}:${c.razorpayKeySecret}`).toString("base64")}`;

export type OrderResult = { ok: true; orderId: string; amount: number; keyId: string; productId: ProductId; name: string } | { ok: false; error: string; status: number };

export async function createWebOrder(ctx: Ctx, signupId: string, productId: unknown, deps: Deps = defaultDeps()): Promise<OrderResult> {
  const { cfg } = deps;
  if (!webCheckoutEnabled(cfg)) return { ok: false, error: "Website checkout isn't open yet.", status: 503 };
  if (!isProductId(productId) || !forSale(productId, ctx.now)) return { ok: false, error: "That item isn't on sale.", status: 400 };
  const p = product(productId);
  const pl = ownershipOf(await ctx.store.get<Player>(C.players, signupId));
  if (p.grants.every((g) => pl.owned.includes(g))) return { ok: false, error: "You already own this.", status: 409 };
  const res = await deps.fetch(`${RZP}/orders`, {
    method: "POST", headers: { Authorization: basic(cfg), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: p.pricePaise, currency: "INR", receipt: `om_${Date.now().toString(36)}`, notes: { productId, signupId: signupId.slice(0, 12) } }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { ok: false, error: "Checkout is unavailable right now. Please try again.", status: 502 };
  const order = (await res.json()) as { id?: string; amount?: number };
  if (!order.id || order.amount !== p.pricePaise) return { ok: false, error: "Checkout is unavailable right now. Please try again.", status: 502 };
  const now = ctx.now ?? Date.now();
  await ctx.store.transaction(async (tx) => {
    tx.set(C.purchases, `ord_${order.id}`, {
      signupId, productId, amount: p.pricePaise, currency: "INR", provider: "razorpay", status: "created", orderId: order.id!, paymentId: null, createdAt: now, paidAt: null,
    } satisfies PurchaseDoc);
  });
  return { ok: true, orderId: order.id, amount: p.pricePaise, keyId: cfg.razorpayKeyId!, productId, name: p.name };
}

const hex = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");
export function validPaymentSignature(cfg: ShopConfig, orderId: string, paymentId: string, signature: string): boolean {
  return !!cfg.razorpayKeySecret && /^[a-f0-9]{64}$/.test(signature) && safeEqual(hex(cfg.razorpayKeySecret, `${orderId}|${paymentId}`), signature);
}
export function validWebhookSignature(cfg: ShopConfig, rawBody: string, signature: string | null): boolean {
  return !!cfg.razorpayWebhookSecret && !!signature && /^[a-f0-9]{64}$/.test(signature) && safeEqual(hex(cfg.razorpayWebhookSecret, rawBody), signature);
}

/** Mark an order paid and grant its product. Idempotent (checkout callback and webhook may both arrive). */
export async function markOrderPaid(ctx: Ctx, orderId: string, paymentId: string, expect?: { signupId?: string; amount?: number }): Promise<Player | null> {
  if (!/^order_[A-Za-z0-9]{6,40}$/.test(orderId) || !/^pay_[A-Za-z0-9]{6,40}$/.test(paymentId)) return null;
  const now = ctx.now ?? Date.now();
  return ctx.store.transaction(async (tx) => {
    const o = await tx.get<PurchaseDoc>(C.purchases, `ord_${orderId}`);
    if (!o || (expect?.signupId && o.signupId !== expect.signupId) || (expect?.amount !== undefined && expect.amount !== o.amount)) return null;
    const cur = (await tx.get<Player>(C.players, o.signupId)) ?? ({ displayName: null, runs: 0, bestScore: 0, firstRunAt: null, lastDay: null, days: 0, played: false, repeated: false, returned: false } as Player);
    if (o.status === "refunded") return withOwnership(cur);
    const web = new Set((cur.webOwned as string[] | undefined) ?? []);
    web.add(o.productId);
    const next = withOwnership({ ...cur, webOwned: [...web].sort() });
    tx.set(C.players, o.signupId, next);
    if (o.status !== "paid") tx.update(C.purchases, `ord_${orderId}`, { status: "paid", paymentId, paidAt: now });
    return next;
  });
}

/** Full refund (from the Razorpay dashboard): take the product back. */
export async function markOrderRefunded(ctx: Ctx, orderId: string): Promise<boolean> {
  if (!/^order_[A-Za-z0-9]{6,40}$/.test(orderId)) return false;
  const now = ctx.now ?? Date.now();
  return ctx.store.transaction(async (tx) => {
    const o = await tx.get<PurchaseDoc>(C.purchases, `ord_${orderId}`);
    if (!o || o.status === "refunded") return false;
    const cur = await tx.get<Player>(C.players, o.signupId);
    tx.update(C.purchases, `ord_${orderId}`, { status: "refunded", refundedAt: now });
    if (cur) tx.set(C.players, o.signupId, withOwnership({ ...cur, webOwned: ((cur.webOwned as string[] | undefined) ?? []).filter((id) => id !== o.productId) }));
    return true;
  });
}

/** Handle one verified Razorpay webhook event. */
export async function handleRazorpayEvent(ctx: Ctx, evt: unknown): Promise<"granted" | "refunded" | "ignored"> {
  const e = evt as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; amount_refunded?: number; status?: string } } } };
  const pay = e.payload?.payment?.entity;
  if (!pay?.order_id) return "ignored";
  if ((e.event === "order.paid" || e.event === "payment.captured") && pay.id && pay.status === "captured") {
    return (await markOrderPaid(ctx, pay.order_id, pay.id, { amount: pay.amount })) ? "granted" : "ignored";
  }
  if ((e.event === "refund.processed" || e.event === "payment.refunded") && pay.amount !== undefined && (pay.amount_refunded ?? 0) >= pay.amount) {
    return (await markOrderRefunded(ctx, pay.order_id)) ? "refunded" : "ignored";
  }
  return "ignored";
}

// ---------------------------------------------------------------- Google Play / App Store (RevenueCat)

/** Product ids the store says this player owns right now (refunds and revocations drop out). */
export async function fetchStoreOwned(appUserId: string, deps: Deps = defaultDeps(), now = Date.now()): Promise<string[] | null> {
  if (!deps.cfg.revenuecatSecret) return null;
  const res = await deps.fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${deps.cfg.revenuecatSecret}`, Accept: "application/json" }, signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`revenuecat ${res.status}`);
  const j = (await res.json()) as { subscriber?: { entitlements?: Record<string, { expires_date?: string | null; product_identifier?: string }> } };
  const out = new Set<string>();
  for (const [key, e] of Object.entries(j.subscriber?.entitlements ?? {})) {
    if (e.expires_date && Date.parse(e.expires_date) <= now) continue;
    if (isProductId(key)) out.add(key);
    if (isProductId(e.product_identifier)) out.add(e.product_identifier);
  }
  return [...out].sort();
}

export async function syncStore(ctx: Ctx, signupId: string, deps: Deps = defaultDeps()): Promise<Player | null> {
  const ids = await fetchStoreOwned(signupId, deps, ctx.now);
  if (ids === null) return null;
  return updatePlayer(ctx.store, signupId, (p) => ({ ...p, storeOwned: ids }));
}

/** Web "Restore purchases": rebuild website ownership from the payment ledger, then re-check the stores. */
export async function restorePurchases(ctx: Ctx, signupId: string, deps: Deps = defaultDeps()): Promise<Player> {
  const rows = await ctx.store.query<PurchaseDoc>(C.purchases, { where: [["signupId", signupId], ["status", "paid"]], limit: 100 });
  const web = [...new Set(rows.map((r) => r.data.productId).filter(isProductId))].sort();
  let store: string[] | null = null;
  try { store = await fetchStoreOwned(signupId, deps, ctx.now); } catch { store = null; }
  return updatePlayer(ctx.store, signupId, (p) => ({ ...p, webOwned: web, ...(store ? { storeOwned: store } : {}) }));
}

export function validRevenuecatAuth(cfg: ShopConfig, header: string | null): boolean {
  if (!cfg.revenuecatWebhookAuth || !header) return false;
  const v = header.replace(/^Bearer\s+/i, "");
  return safeEqual(v, cfg.revenuecatWebhookAuth.replace(/^Bearer\s+/i, ""));
}

/** Account ids touched by a RevenueCat webhook event (anonymous ids are skipped: they aren't accounts). */
export function revenuecatUserIds(body: unknown): string[] {
  const e = (body as { event?: Record<string, unknown> })?.event ?? {};
  const raw = [e.app_user_id, e.original_app_user_id, ...((e.aliases as unknown[]) ?? []), ...((e.transferred_from as unknown[]) ?? []), ...((e.transferred_to as unknown[]) ?? [])];
  return [...new Set(raw.filter((v): v is string => typeof v === "string" && /^[a-f0-9]{40}$/.test(v)))].slice(0, 10);
}

export async function handleRevenuecatEvent(ctx: Ctx, body: unknown, deps: Deps = defaultDeps()): Promise<number> {
  let n = 0;
  for (const id of revenuecatUserIds(body)) {
    // Only real accounts: never create player documents for unknown ids.
    if (!(await ctx.store.get(C.signups, id))) continue;
    if (await syncStore(ctx, id, deps)) n++;
  }
  return n;
}

// ---------------------------------------------------------------- Founders Wall

const wallCaches = new WeakMap<Store, TtlCache<{ count: number; names: string[] }>>();
/** Founder count and the most recent named founders, cached 10 minutes per instance (one count + one small query). */
export async function foundersWall(store: Store): Promise<{ count: number; names: string[] }> {
  let c = wallCaches.get(store);
  if (!c) wallCaches.set(store, (c = new TtlCache(600_000, 2)));
  return c.getOrLoad("wall", async () => {
    const [count, rows] = await Promise.all([
      store.count(C.players, [["badge", FOUNDER_BADGE]]),
      store.query<Player>(C.players, { where: [["badge", FOUNDER_BADGE]], limit: 60 }),
    ]);
    return { count, names: rows.map((r) => r.data.displayName).filter((n): n is string => !!n).slice(0, 48) };
  });
}
