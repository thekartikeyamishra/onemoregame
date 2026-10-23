import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";
import { LegalPage } from "@/components/LegalPage";
import { MODEL_REVIEWED } from "@/lib/cost-model";

export const metadata = pageMeta({
  title: "Disclaimer",
  description: "How to read the cost estimates, articles, chat answers and ads on this site, and what they are not.",
  path: "/disclaimer",
});

export default function Disclaimer() {
  return (
    <LegalPage
      title="Disclaimer"
      path="/disclaimer"
      updated="2026-10-21"
      intro="What you can rely on here, and where you should get a professional opinion."
    >
      <h2>Cost estimates</h2>
      <p>
        The <Link href="/tools/app-cost-calculator">app cost calculator</Link> produces indicative ranges from a published
        effort model and rounded market hourly rates (last reviewed {MODEL_REVIEWED}). Currency conversions use approximate
        rates. Results are not quotes, offers or financial advice, and real costs can be higher or lower depending on detailed
        scope, existing systems, team and timing.
      </p>

      <h2>Articles</h2>
      <p>
        Articles reflect {site.name}&apos;s professional experience and the sources linked in them at the date shown. Laws,
        platform rules and prices change. Articles that discuss the DPDP Act, GDPR or other regulations explain how they
        typically affect app projects; they are not legal advice. Ask a qualified lawyer about your specific situation.
      </p>

      <h2>Mitra, the chat assistant</h2>
      <p>
        Mitra answers most questions from a fixed set of reviewed replies. Some answers are written by an AI model and can be
        wrong or incomplete. Don&apos;t rely on chat answers for important decisions, and never share passwords, payment details
        or ID numbers in the chat.
      </p>

      <h2>Apps in development</h2>
      <p>
        Descriptions of unreleased apps describe current intentions only. Features, availability, timing and pricing may
        change, and an app may not be released at all.
      </p>

      <h2>Advertising and affiliations</h2>
      <p>
        Some pages show ads served by Google AdSense, clearly labelled &ldquo;Advertisement&rdquo;. {site.name} doesn&apos;t
        choose individual ads and doesn&apos;t endorse the advertisers. Articles are not sponsored and contain no affiliate
        links; if that ever changes, the article will say so at the top.
      </p>
    </LegalPage>
  );
}
