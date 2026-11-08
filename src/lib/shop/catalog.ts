import { SKINS, TRAILS, type SkinId, type TrailId } from "@/game/cosmetics";

/**
 * Everything ONE MORE sells. All of it is optional and cosmetic or convenience: nothing changes scores, rules,
 * hitboxes or leaderboard eligibility. Product ids are identical in Google Play, the App Store, RevenueCat
 * (one entitlement per product, same identifier) and the website, so ownership merges across platforms.
 */

export type ProductId = Exclude<SkinId, "classic"> | Exclude<TrailId, "none"> | "replay_studio" | "founder_pack";
export type Kind = "skin" | "trail" | "feature" | "pack";

export interface Product {
  id: ProductId;
  kind: Kind;
  name: string;
  /** Website price in paise (INR, GST included). The apps show the store's localized price. */
  pricePaise: number;
  blurb: string;
  /** Item ids this product unlocks (always includes its own id). */
  grants: readonly string[];
}

/** Sold during the first year only; the date is shown publicly so the scarcity is real. */
export const FOUNDER_UNTIL = Date.parse("2027-10-31T18:29:59Z"); // 31 Oct 2027, 23:59 IST
export const FOUNDER_BADGE = "founder";

const skin = (id: Exclude<SkinId, "classic">, pricePaise: number, blurb: string): Product => ({ id, kind: "skin", name: SKINS[id].name, pricePaise, blurb, grants: [id] });
const trail = (id: Exclude<TrailId, "none">, pricePaise: number, blurb: string): Product => ({ id, kind: "trail", name: TRAILS[id].name, pricePaise, blurb, grants: [id] });

const SINGLES: Product[] = [
  skin("skin_ember", 4900, "Burns hot. Two-tone fire core that spins as you move."),
  skin("skin_glacier", 4900, "Ice-white orb with a cold rotating halo."),
  skin("skin_neon", 4900, "Pink-violet neon ring. Impossible to miss in Battle."),
  skin("skin_gold", 7900, "Polished gold with a travelling shine. For the top of the board."),
  skin("skin_glitch", 7900, "Corrupted-signal orb that flickers between frames."),
  trail("trail_comet", 4900, "A soft comet tail in your skin's colour."),
  trail("trail_pixel", 4900, "Retro pixel dust that scatters behind you."),
  trail("trail_lightning", 7900, "A crackling bolt that follows every dash."),
  { id: "replay_studio", kind: "feature", name: "Replay Studio", pricePaise: 9900, grants: ["replay_studio"],
    blurb: "Turn any verified run into a vertical video clip with your name and score, ready for Instagram, WhatsApp and Shorts." },
];

export const PRODUCTS: readonly Product[] = [
  {
    id: "founder_pack", kind: "pack", name: "Founder Pack", pricePaise: 29900,
    blurb: "Every launch skin and trail, Replay Studio, a permanent ★ Founder badge on leaderboards and your name on the Founders Wall. Sold only until 31 Oct 2027.",
    grants: [...SINGLES.flatMap((p) => p.grants), FOUNDER_BADGE, "founder_pack"],
  },
  ...SINGLES,
];

export const PRODUCT_IDS = PRODUCTS.map((p) => p.id);
export function isProductId(v: unknown): v is ProductId { return typeof v === "string" && (PRODUCT_IDS as string[]).includes(v); }
export function product(id: ProductId): Product { return PRODUCTS.find((p) => p.id === id)!; }

/** Expand bought product ids into the item ids they unlock (unknown ids are ignored). */
export function itemsFor(productIds: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const id of productIds) if (isProductId(id)) for (const g of product(id).grants) out.add(g);
  return [...out].sort();
}

/** Sum of the individual items in the Founder Pack (shown as the saving). */
export function founderValuePaise(): number {
  return SINGLES.reduce((n, p) => n + p.pricePaise, 0);
}

export function forSale(id: ProductId, now = Date.now()): boolean {
  return id !== "founder_pack" || now <= FOUNDER_UNTIL;
}

export function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
