import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { STUDIO } from "@/lib/socials";

export const metadata = pageMetadata("/editorial-policy", "Editorial policy", "How ONE MORE guides are researched, tested, written and corrected, and how advertising is kept separate from content.");

export default function EditorialPolicy() {
  return (
    <>
      <JsonLd data={breadcrumbLd("/editorial-policy", "Editorial policy")} />
      <PageHero eyebrow="Editorial policy" title="How we write our guides" />
      <div className="section">
        <div className="container prose">
          <h2 style={{ marginTop: 0 }}>Who writes them</h2>
          <p>Guides are written by {STUDIO.creator}, who builds ONE MORE at {STUDIO.name}. They cover the game we make, so we can check every claim against its source code.</p>
          <h2>How claims are tested</h2>
          <ul>
            <li>Rules (durations, points, limits) are read directly from the game engine, so a guide can&apos;t quote a number the game doesn&apos;t use.</li>
            <li>Statistics come from running the real engine over fixed arenas, as described in our <Link href="/guides/methodology">methodology</Link>. We say when a number is from a scripted test player rather than real players.</li>
            <li>Features that aren&apos;t live are labelled as planned.</li>
          </ul>
          <h2>Updates and corrections</h2>
          <p>Every guide shows when it was published and last updated. When game rules change, affected guides and numbers are updated and the change is listed in the <Link href="/changelog">changelog</Link>. Report a mistake via the <Link href="/contact">contact page</Link> or {site.contactEmail}; corrections are made promptly and noted in the guide&apos;s updated date.</p>
          <h2>Advertising and independence</h2>
          <p>Some content pages may show clearly labelled ads. Advertisers have no influence on what we write, ads never appear inside the game, on forms or on sign-in pages, and we never ask anyone to click ads.</p>
          <h2>What we don&apos;t publish</h2>
          <p>We don&apos;t publish pages written only to rank for search terms, mass-generated articles, fake reviews or testimonials, or claims we can&apos;t check.</p>
        </div>
      </div>
    </>
  );
}
