"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SKINS, TRAILS, TrailFx, drawOrb, type Look, type SkinId, type TrailId } from "@/game/cosmetics";
import { FOUNDER_UNTIL, PRODUCTS, forSale, formatInr, founderValuePaise, product, type Product, type ProductId } from "@/lib/shop/catalog";
import { isNativeApp } from "@/lib/native";
import { storeStatus } from "@/lib/purchases";
import { track } from "@/lib/analytics";
import { buy, restore, saveLook, useShop } from "./checkout";

/** Small animated preview of a skin/trail (one canvas, paused when off screen or with reduced motion). */
function OrbPreview({ skin, trail, size = 120 }: { skin: SkinId; trail: TrailId; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!, ctx = cv.getContext("2d")!, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fx = new TrailFx(trail, skin, 16);
    let t = 0, raf = 0, visible = true;
    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      const a = t * 0.035, x = size / 2 + Math.cos(a) * size * 0.28, y = size / 2 + Math.sin(a * 2) * size * 0.16;
      fx.push(x, y); fx.draw(ctx, size * 0.09, t);
      drawOrb(ctx, x, y, size * 0.09, skin, t, { glow: 16 });
    };
    const loop = () => { t++; draw(); if (visible && !reduced) raf = requestAnimationFrame(loop); };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible && !reduced) raf = requestAnimationFrame(loop); });
    io.observe(cv);
    for (let i = 0; i < 20; i++) { t++; draw(); }
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [skin, trail, size]);
  return <canvas ref={ref} className="orb-preview" style={{ width: size, height: size }} aria-hidden="true" />;
}

function daysLeft(now: number) { return Math.max(0, Math.ceil((FOUNDER_UNTIL - now) / 864e5)); }

export function ShopClient() {
  const { state, setState, prices } = useShop();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; signIn?: boolean } | null>(null);
  const [now, setNow] = useState(0);
  const [native, setNative] = useState(false);
  const [appState, setAppState] = useState<"ready" | "update" | "off">("off");
  useEffect(() => {
    const id = requestAnimationFrame(() => { setNow(Date.now()); setNative(isNativeApp()); setAppState(storeStatus()); });
    track("shop_viewed", {});
    return () => cancelAnimationFrame(id);
  }, []);

  const owns = (p: Product) => p.grants.every((g) => state.owned.includes(g));
  const price = (id: ProductId) => prices[id]?.priceString ?? (native ? "" : formatInr(product(id).pricePaise));
  const look = state.equipped;

  async function onBuy(id: ProductId) {
    setBusy(id); setMsg(null);
    const r = await buy(id, state, prices, "shop");
    setBusy(null);
    if (r.ok) {
      setState((s) => ({ ...s, owned: r.owned }));
      setMsg({ ok: true, text: id === "founder_pack" ? "Welcome, Founder. Thank you for backing ONE MORE. Everything is unlocked." : "Unlocked! Equip it below." });
    } else if (!r.cancelled) setMsg({ ok: false, text: r.error, signIn: r.needSignIn });
  }
  async function onEquip(next: Partial<Look>) {
    const l = { ...look, ...next };
    setState((s) => ({ ...s, equipped: l }));
    await saveLook(l, state);
  }
  async function onRestore() {
    setBusy("restore"); setMsg(null);
    const r = await restore(state);
    setBusy(null);
    if (r.ok) { setState((s) => ({ ...s, owned: r.owned })); setMsg({ ok: true, text: r.owned.length ? "Purchases restored." : "No purchases found for this account." }); }
    else setMsg({ ok: false, text: r.error, signIn: r.needSignIn });
  }

  const founder = product("founder_pack");
  const founderOpen = now === 0 || forSale("founder_pack", now);
  const cantBuy = native ? appState !== "ready" : !state.webCheckout;
  const buyBtn = (p: Product, primary = false) => owns(p) ? <span className="pill pill--live">Owned ✓</span> : (
    <button type="button" className={`btn btn--sm${primary ? " btn--primary" : ""}`} disabled={busy !== null || cantBuy || (now > 0 && !forSale(p.id, now))} onClick={() => void onBuy(p.id)}>
      {busy === p.id ? <><span className="spinner" aria-hidden="true" /> Opening…</> : `Buy${price(p.id) ? ` · ${price(p.id)}` : ""}`}
    </button>
  );

  return (
    <div className="shop">
      {msg ? (
        <div className={`notice ${msg.ok ? "notice--ok" : "notice--err"}`} role={msg.ok ? "status" : "alert"}>
          {msg.text}{msg.signIn ? <> <Link href="/play/sign-in">Sign in</Link></> : null}
        </div>
      ) : null}
      {cantBuy && state.loaded ? (
        <p className="notice small">{native ? (appState === "update" ? "Update ONE MORE from the store to unlock purchases." : "Purchases open soon in the app.") : "Website checkout opens soon. You can already buy in the Android and iOS apps."}</p>
      ) : null}

      <section className="form-card founder-card" aria-labelledby="founder-h">
        <div className="founder-copy">
          <p className="eyebrow">Limited · first year only</p>
          <h2 id="founder-h">Founder Pack</h2>
          <p>ONE MORE is made by one indie developer in India. No investors, no ads in the app, no pay-to-win. Founders are the players who keep it that way, and they&apos;re remembered for it.</p>
          <ul className="founder-list">
            <li>★ Permanent <b>Founder badge</b> next to your name on every leaderboard</li>
            <li>Your name on the <b>Founders Wall</b> below</li>
            <li>All 5 skins and all 3 trails, plus <b>Replay Studio</b></li>
            <li>Every future update stays free. This badge is never sold again after {new Date(FOUNDER_UNTIL).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.</li>
          </ul>
          <div className="founder-buy">
            {!native ? <span className="founder-price"><s>{formatInr(founderValuePaise())}</s> <b>{formatInr(founder.pricePaise)}</b></span> : null}
            {founderOpen ? buyBtn(founder, true) : <span className="pill">Founder sales have closed</span>}
            {now && founderOpen ? <span className="small muted">{daysLeft(now)} days left</span> : null}
          </div>
        </div>
        <div className="founder-wall" aria-label="Founders Wall">
          <p className="eyebrow">Founders Wall · {state.founders.count.toLocaleString("en-IN")}</p>
          {state.founders.names.length ? <p className="founder-names">{state.founders.names.map((n) => <span key={n}>★ {n}</span>)}</p> : <p className="small muted">Be the first name here.</p>}
        </div>
      </section>

      <section aria-labelledby="look-h">
        <div className="help-row"><h2 id="look-h" style={{ margin: 0 }}>Your look</h2><span className="small muted">Seen in your runs, replays and next to your name on the leaderboard.</span></div>
        <div className="shop-grid">
          {(["classic", "skin_ember", "skin_glacier", "skin_neon", "skin_gold", "skin_glitch"] as SkinId[]).map((id) => {
            const p = id === "classic" ? null : PRODUCTS.find((x) => x.id === id)!;
            const has = !p || owns(p), on = look.skin === id;
            return (
              <article key={id} className="shop-item" data-on={on || undefined}>
                <OrbPreview skin={id} trail={look.trail} />
                <h3>{SKINS[id].name}</h3>
                <p className="small muted">{p?.blurb ?? "The original. Always free."}</p>
                <div className="btn-row">{has ? <button type="button" className="btn btn--sm" aria-pressed={on} onClick={() => void onEquip({ skin: id })}>{on ? "Equipped" : "Equip"}</button> : buyBtn(p!)}</div>
              </article>
            );
          })}
        </div>
        <h3 style={{ marginTop: "2rem" }}>Trails</h3>
        <div className="shop-grid">
          {(["none", "trail_comet", "trail_pixel", "trail_lightning"] as TrailId[]).map((id) => {
            const p = id === "none" ? null : PRODUCTS.find((x) => x.id === id)!;
            const has = !p || owns(p), on = look.trail === id;
            return (
              <article key={id} className="shop-item" data-on={on || undefined}>
                <OrbPreview skin={look.skin} trail={id} />
                <h3>{TRAILS[id].name}</h3>
                <p className="small muted">{p?.blurb ?? "Clean and simple."}</p>
                <div className="btn-row">{has ? <button type="button" className="btn btn--sm" aria-pressed={on} onClick={() => void onEquip({ trail: id })}>{on ? "Equipped" : "Equip"}</button> : buyBtn(p!)}</div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="form-card replay-card" aria-labelledby="rs-h" id="replay_studio">
        <div>
          <p className="eyebrow">Replay Studio</p>
          <h2 id="rs-h">Your best runs, as videos</h2>
          <p>After any run, tap <b>Watch replay</b> (free). With Replay Studio you can save it as a 30-second vertical clip with your name and score, ready for Instagram Stories, Reels, Shorts and WhatsApp.</p>
        </div>
        {buyBtn(product("replay_studio"), true)}
      </section>

      <section className="shop-legal small muted">
        <div className="btn-row"><button type="button" className="btn btn--sm" disabled={busy !== null} onClick={() => void onRestore()}>{busy === "restore" ? "Restoring…" : "Restore purchases"}</button></div>
        <p><b>Cosmetic only.</b> Nothing here changes scores, hitboxes, rules or leaderboard eligibility. Everything that affects play is free for everyone.</p>
        <p>
          One-time purchases, no subscriptions, no random boxes. {native ? "Payment is handled by Google Play or the App Store; refunds follow their policies." : "Prices include GST. Payments are processed by Razorpay (UPI, cards, netbanking, wallets)."}
          {" "}{state.signedIn ? "Purchases are saved to your account and work on the website and in the apps." : native ? "Sign in to keep purchases across devices and show your badge on leaderboards." : "Sign in to buy; purchases are saved to your account."}
          {" "}See the <Link href="/terms#purchases">Terms</Link>, <Link href="/refunds">Refunds</Link> and <Link href="/privacy#purchases">Privacy Policy</Link>.
        </p>
        {!native ? <p>By buying you ask us to deliver the item immediately, and you agree that this ends any statutory withdrawal period once it is delivered (our 7-day refund on website purchases still applies).</p> : null}
        {/*
          PayPal (international buyers) — switched off for now. Squarespace / PayPal hosted payment link.
          To enable: paste your PayPal link below and uncomment. Never show this inside the apps (store rules):
          keep the `!native` check. PayPal payments are NOT unlocked automatically: fulfil them by hand
          (add the product id to the player's `webOwned` in Firestore) or move them to Razorpay International.

        {!native ? (
          <p>
            Outside India? <a href="https://www.paypal.com/ncp/payment/REPLACE_WITH_YOUR_LINK" target="_blank" rel="noopener noreferrer">Pay with PayPal</a>{" "}
            and email us your gamer tag; we unlock it within 24 hours.
          </p>
        ) : null}
        */}
      </section>
    </div>
  );
}
