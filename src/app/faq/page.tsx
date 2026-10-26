import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { faqs, type FaqItem } from "@/lib/content";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { AdsenseScript } from "@/components/AdsenseScript";

export const metadata = pageMetadata(
  "/faq",
  "FAQ",
  "Answers about ONE MORE: whether it's playable, early access and invitations, Campus Clash, devices, accessibility, pricing, ads and privacy.",
);

const groups: FaqItem["group"][] = ["Game", "Early access", "Campus Clash", "Devices & accessibility", "Privacy"];

export default function FaqPage() {
  return (
    <>
      <AdsenseScript />
      <JsonLd data={breadcrumbLd("/faq", "FAQ")} />
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }} />
      <PageHero eyebrow="Help" title="Frequently asked questions" />
      <div className="section">
        <div className="container" style={{ maxWidth: 820 }}>
          {groups.map((g) => (
            <section key={g} aria-labelledby={`g-${g}`} style={{ marginBottom: "3rem" }}>
              <h2 id={`g-${g}`} style={{ fontSize: "var(--step-2)" }}>{g}</h2>
              <Faq items={faqs.filter((f) => f.group === g)} />
            </section>
          ))}
          <p className="muted">Didn&apos;t find your answer? <a href="/contact">Contact us</a>.</p>
        </div>
      </div>
    </>
  );
}
