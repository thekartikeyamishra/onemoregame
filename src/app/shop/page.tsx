import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { ShopClient } from "@/components/shop/ShopClient";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata("/shop", "Shop: skins, trails and the Founder Pack", "Optional cosmetics for ONE MORE: orb skins, trails, Replay Studio videos and the limited Founder Pack. Cosmetic only, never pay-to-win."),
};

export default function ShopPage() {
  return (
    <>
      <PageHero eyebrow="Shop" title="Make it yours"><p>Optional skins, trails and highlight videos. Every one is cosmetic: scores stay skill-only, for everyone.</p></PageHero>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <ShopClient />
        </div>
      </section>
    </>
  );
}
