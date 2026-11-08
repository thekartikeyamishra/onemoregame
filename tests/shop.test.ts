import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { C } from "@/lib/store/types";
import { FOUNDER_UNTIL, PRODUCTS, forSale, founderValuePaise, itemsFor, product } from "@/lib/shop/catalog";
import {
  createWebOrder, equip, handleRazorpayEvent, handleRevenuecatEvent, markOrderPaid, ownershipOf, restorePurchases, revenuecatUserIds,
  shopConfig, syncStore, validPaymentSignature, validRevenuecatAuth, validWebhookSignature, withOwnership, type Deps,
} from "@/lib/shop/service";
import { allowedLook } from "@/game/cosmetics";
import { board, finishRun, startRun, dayKey } from "@/lib/game-service";
import { ENGINE_VERSION, InputRecorder, createGame, dirIndex, step } from "@/game/engine";
import type { Player } from "@/lib/game-service";

const secret = "test-secret-test-secret-test-secret-123";
const T0 = Date.UTC(2026, 9, 28, 6, 0, 0);
const ID = "a".repeat(40);
const cfg = shopConfig({ RAZORPAY_KEY_ID: "rzp_test_x", RAZORPAY_KEY_SECRET: "keysecret", RAZORPAY_WEBHOOK_SECRET: "whsecret", REVENUECAT_SECRET_KEY: "sk_rc", REVENUECAT_WEBHOOK_AUTH: "rc-auth-123" });
const sig = (k: string, d: string) => createHmac("sha256", k).update(d).digest("hex");
let store: MemoryStore;

function deps(handler: (url: string, init?: RequestInit) => unknown, status = 200): Deps {
  return { cfg, fetch: (async (url: string, init?: RequestInit) => new Response(JSON.stringify(handler(String(url), init)), { status })) as unknown as typeof fetch };
}
const orderDeps = (amount?: number) => deps((url, init) => (url.endsWith("/orders") ? { id: "order_ABC123xyz", amount: amount ?? JSON.parse(String(init?.body)).amount } : {}));

beforeEach(() => { store = new MemoryStore(); });

describe("catalog", () => {
  it("is cosmetic-only and the Founder Pack contains every single item plus the badge", () => {
    for (const p of PRODUCTS) expect(["skin", "trail", "feature", "pack"]).toContain(p.kind);
    const founder = product("founder_pack");
    for (const p of PRODUCTS.filter((x) => x.id !== "founder_pack")) expect(founder.grants).toEqual(expect.arrayContaining([...p.grants]));
    expect(founder.grants).toContain("founder");
    expect(founderValuePaise()).toBeGreaterThan(founder.pricePaise);
    expect(itemsFor(["skin_ember", "nope"])).toEqual(["skin_ember"]);
  });
  it("stops selling the Founder Pack after the published date", () => {
    expect(forSale("founder_pack", FOUNDER_UNTIL)).toBe(true);
    expect(forSale("founder_pack", FOUNDER_UNTIL + 1)).toBe(false);
    expect(forSale("skin_gold", FOUNDER_UNTIL + 1)).toBe(true);
  });
  it("only lets owned items be equipped", () => {
    expect(allowedLook({ skin: "skin_gold", trail: "trail_comet" }, ["trail_comet"])).toEqual({ skin: "classic", trail: "trail_comet" });
  });
});

describe("website checkout (Razorpay)", () => {
  it("creates an order at the catalog price, verifies the signature and grants once", async () => {
    const ctx = { store, secret, now: T0 };
    const o = await createWebOrder(ctx, ID, "founder_pack", orderDeps());
    expect(o).toMatchObject({ ok: true, orderId: "order_ABC123xyz", amount: 29900 });
    expect(validPaymentSignature(cfg, "order_ABC123xyz", "pay_P1234567", sig("keysecret", "order_ABC123xyz|pay_P1234567"))).toBe(true);
    expect(validPaymentSignature(cfg, "order_ABC123xyz", "pay_P1234567", sig("wrong", "order_ABC123xyz|pay_P1234567"))).toBe(false);
    expect(await markOrderPaid(ctx, "order_ABC123xyz", "pay_P1234567", { signupId: "b".repeat(40) })).toBeNull(); // someone else's order
    const p = await markOrderPaid(ctx, "order_ABC123xyz", "pay_P1234567", { signupId: ID });
    expect(ownershipOf(p).badge).toBe("founder");
    expect(ownershipOf(p).owned).toContain("replay_studio");
    // webhook duplicate: idempotent
    await handleRazorpayEvent(ctx, { event: "order.paid", payload: { payment: { entity: { id: "pay_P1234567", order_id: "order_ABC123xyz", amount: 29900, status: "captured" } } } });
    const pl = await store.get<Player>(C.players, ID);
    expect(pl!.webOwned).toEqual(["founder_pack"]);
    expect((await store.get(C.purchases, "ord_order_ABC123xyz"))!.status).toBe("paid");
  });
  it("refuses a second purchase of something already owned and a mismatched order amount", async () => {
    const ctx = { store, secret, now: T0 };
    expect((await createWebOrder(ctx, ID, "skin_gold", orderDeps(1))).ok).toBe(false);
    await store.transaction(async (tx) => tx.set(C.players, ID, withOwnership({ webOwned: ["skin_gold"] } as unknown as Player)));
    expect(await createWebOrder(ctx, ID, "skin_gold", orderDeps())).toMatchObject({ ok: false, status: 409 });
    expect(await createWebOrder(ctx, ID, "nope", orderDeps())).toMatchObject({ ok: false, status: 400 });
    expect(await createWebOrder(ctx, ID, "skin_neon", { ...orderDeps(), cfg: shopConfig({}) })).toMatchObject({ ok: false, status: 503 });
  });
  it("verifies webhook signatures and takes items back on a full refund", async () => {
    const ctx = { store, secret, now: T0 };
    await createWebOrder(ctx, ID, "skin_neon", orderDeps());
    const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_Q1234567", order_id: "order_ABC123xyz", amount: 4900, status: "captured" } } } });
    expect(validWebhookSignature(cfg, body, sig("whsecret", body))).toBe(true);
    expect(validWebhookSignature(cfg, body, sig("whsecret", body + " "))).toBe(false);
    expect(await handleRazorpayEvent(ctx, JSON.parse(body))).toBe("granted");
    expect(ownershipOf(await store.get<Player>(C.players, ID)).owned).toEqual(["skin_neon"]);
    expect(await handleRazorpayEvent(ctx, { event: "refund.processed", payload: { payment: { entity: { id: "pay_Q1234567", order_id: "order_ABC123xyz", amount: 4900, amount_refunded: 4900 } } } })).toBe("refunded");
    expect(ownershipOf(await store.get<Player>(C.players, ID)).owned).toEqual([]);
    // a late duplicate "paid" event never re-grants a refunded order
    await handleRazorpayEvent(ctx, JSON.parse(body));
    expect(ownershipOf(await store.get<Player>(C.players, ID)).owned).toEqual([]);
  });
  it("restores website purchases from the ledger (e.g. after re-creating a deleted account)", async () => {
    const ctx = { store, secret, now: T0 };
    await createWebOrder(ctx, ID, "trail_comet", orderDeps());
    await markOrderPaid(ctx, "order_ABC123xyz", "pay_R1234567", { signupId: ID });
    await store.delete(C.players, ID);
    const p = await restorePurchases(ctx, ID, deps(() => ({ subscriber: { entitlements: {} } })));
    expect(ownershipOf(p).owned).toEqual(["trail_comet"]);
  });
});

describe("store purchases (RevenueCat)", () => {
  const rc = deps(() => ({ subscriber: { entitlements: {
    skin_gold: { expires_date: null, product_identifier: "skin_gold" },
    old: { expires_date: "2020-01-01T00:00:00Z", product_identifier: "skin_ember" },
    replay: { expires_date: null, product_identifier: "replay_studio" },
  } } }));
  it("syncs active entitlements and merges them with website purchases", async () => {
    const ctx = { store, secret, now: T0 };
    await store.transaction(async (tx) => tx.set(C.players, ID, withOwnership({ webOwned: ["trail_pixel"], equipped: { skin: "skin_gold" } } as unknown as Player)));
    expect(ownershipOf(await store.get<Player>(C.players, ID)).equipped.skin).toBe("classic"); // not owned yet
    const p = await syncStore(ctx, ID, rc);
    expect(ownershipOf(p).owned).toEqual(["replay_studio", "skin_gold", "trail_pixel"]);
    expect(await equip(ctx, ID, { skin: "skin_gold", trail: "trail_lightning" })).toEqual({ skin: "skin_gold", trail: "none" });
  });
  it("authenticates webhooks, skips anonymous ids and never creates unknown accounts", async () => {
    expect(validRevenuecatAuth(cfg, "Bearer rc-auth-123")).toBe(true);
    expect(validRevenuecatAuth(cfg, "rc-auth-124")).toBe(false);
    expect(revenuecatUserIds({ event: { app_user_id: "$RCAnonymousID:abc", transferred_to: [ID], aliases: ["x"] } })).toEqual([ID]);
    const ctx = { store, secret, now: T0 };
    expect(await handleRevenuecatEvent(ctx, { event: { app_user_id: ID } }, rc)).toBe(0);
    expect(await store.get(C.players, ID)).toBeNull();
    await store.transaction(async (tx) => tx.set(C.signups, ID, { email: "x@example.com" }));
    expect(await handleRevenuecatEvent(ctx, { event: { app_user_id: ID } }, rc)).toBe(1);
  });
});

describe("leaderboard flair", () => {
  it("copies the Founder badge and equipped skin onto the public board when a score is written", async () => {
    const now = T0 + 10_000;
    await store.transaction(async (tx) => tx.set(C.players, ID, withOwnership({ displayName: "Kart", webOwned: ["founder_pack"], equipped: { skin: "skin_gold" } } as unknown as Player)));
    const start = await startRun({ store, secret, now }, ID, "daily");
    if ("error" in start) throw new Error("start failed");
    const g = createGame(start.seed, start.twist.id), rec = new InputRecorder();
    while (!g.over) {
      const b = g.shards.reduce((a, c) => ((c.x - g.x) ** 2 + (c.y - g.y) ** 2 < (a.x - g.x) ** 2 + (a.y - g.y) ** 2 ? c : a), g.shards[0]);
      const input = { dir: dirIndex(b.x - g.x, b.y - g.y), dash: false };
      rec.record(g.tick, input); step(g, input);
    }
    const res = await finishRun({ store, secret, now: now + 70_000 }, ID, { runId: start.runId, ticket: start.ticket, inputs: rec.log, score: g.score, version: ENGINE_VERSION });
    expect(res.status).toBe("ok");
    const b = await board(store, "day", dayKey(now), now + 70_000);
    expect(b.entries[0]).toMatchObject({ name: "Kart", badge: "founder", skin: "skin_gold" });
  });
});
