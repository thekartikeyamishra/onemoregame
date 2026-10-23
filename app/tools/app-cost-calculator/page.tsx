import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";
import {
  MODEL_REVIEWED,
  complianceLevels,
  designLevels,
  estimate,
  features,
  formatRange,
  platforms,
  teams,
  type Inputs,
} from "@/lib/cost-model";
import { CostCalculator } from "@/components/CostCalculator";
import { AdSlot } from "@/components/AdSlot";
import { JsonLd, PERSON_ID, breadcrumbSchema, faqSchema } from "@/components/JsonLd";

const PATH = "/tools/app-cost-calculator";

export const metadata = pageMeta({
  title: "App development cost calculator (free, 4 currencies)",
  description:
    "Estimate your app's build cost feature by feature in USD, INR, GBP or EUR. Compare teams in India, Europe, the UK and the US, with every assumption shown.",
  path: PATH,
});

const examples: { name: string; summary: string; input: Inputs }[] = [
  {
    name: "Booking web app for a local business",
    summary: "PWA with sign-in, booking calendar, payments and a small admin panel, clean UI-kit design.",
    input: { platform: "pwa", features: ["auth", "booking", "payments", "admin", "push"], design: "kit", compliance: "basic", team: "in-freelance", currency: "USD" },
  },
  {
    name: "Two-sided marketplace MVP",
    summary: "iOS + Android in Flutter: profiles, search, chat, payments, media upload, admin, custom design.",
    input: { platform: "cross", features: ["auth", "profiles", "search", "chat", "payments", "media", "admin", "push", "analytics"], design: "custom", compliance: "strict", team: "in-agency", currency: "USD" },
  },
  {
    name: "AI assistant app",
    summary: "iOS + Android: sign-in, subscriptions, an LLM feature with cost controls, offline notes, polished motion design.",
    input: { platform: "cross", features: ["auth", "profiles", "payments", "ai", "offline", "push", "analytics"], design: "premium", compliance: "strict", team: "uk-agency", currency: "USD" },
  },
];

const faqs = [
  {
    q: "How accurate is this app cost calculator?",
    a: "It is designed to land within the range of honest quotes for a clearly scoped first version. It cannot see hidden complexity such as legacy integrations, unusual hardware or large data migrations, so treat the result as a budgeting range and a way to sanity-check quotes, not as a fixed price.",
  },
  {
    q: "Why is building for iOS and Android natively almost twice the cost?",
    a: "Native development means two codebases (Swift and Kotlin) and usually two specialists, so most engineering is done twice. Cross-platform frameworks such as Flutter or React Native share most code, which is why the calculator applies roughly 1.2–1.35× effort for both stores instead of about 1.9×.",
  },
  {
    q: "What costs come after launch?",
    a: "Plan for maintenance of roughly 15–20% of the build cost per year (OS updates, library upgrades, bug fixes), plus hosting, third-party services, AI usage if any, and store fees: Apple charges $99 a year and Google Play a one-time $25.",
  },
  {
    q: "Is it cheaper to hire a freelancer than an agency?",
    a: "Hourly rates are lower, but one person delivers fewer hours per week and carries all the risk. Freelancers suit small, well-defined scopes; agencies suit larger builds that need design, QA and project management in parallel. Either way, insist on milestone-based payments.",
  },
  {
    q: "Why is the rupee estimate so much lower than the dollar one?",
    a: "Indian teams charge Indian clients in rupees at domestic rates, which are far below the rates they charge clients abroad. When you choose ₹ with an Indian team, the calculator uses domestic rupee rates (about ₹600–₹1,500 an hour for experienced freelancers and ₹1,200–₹2,800 for agencies) instead of converting dollar prices.",
  },
  {
    q: "Can I build my app with AI instead and skip these costs?",
    a: "AI app builders are excellent for prototypes, demos and internal tools, and can save you the whole budget at the validation stage. A public product with accounts, payments and personal data still needs security review, privacy compliance, store approval and maintenance, which is where most of these hours go. An engineer who uses AI tools well can bring the cost down without skipping those parts.",
  },
  {
    q: "Does the calculator store my answers?",
    a: "No. Everything runs in your browser. Your choices are kept only in the page address so you can bookmark or share the estimate.",
  },
];

export default function CostCalculatorPage() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "App development cost calculator",
            url: absoluteUrl(PATH),
            applicationCategory: "BusinessApplication",
            operatingSystem: "Any (runs in the browser)",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            creator: { "@id": PERSON_ID },
            description: metadata.description,
            dateModified: "2026-10-21",
          },
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "App cost calculator", path: PATH },
          ]),
          faqSchema(faqs),
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 md:pt-16">
        <nav aria-label="Breadcrumb" className="text-sm text-slate">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span aria-hidden="true"> / </span>
          <span>App cost calculator</span>
        </nav>
        <h1 className="mt-4 max-w-4xl text-[clamp(2.3rem,1.6rem+3vw,4rem)] font-extrabold">App development cost calculator</h1>
        <p className="mt-5 max-w-3xl text-lg text-slate">
          Choose your platform, features, design and team, and see a realistic budget range in dollars, rupees, pounds or
          euros, with the hours behind it. Built by an engineer who scopes apps for a living; assumptions reviewed{" "}
          {MODEL_REVIEWED}.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
        <CostCalculator />
        <AdSlot placement="toolResult" />
      </div>

      <article className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <div className="prose">
          <h2>How this estimate is calculated</h2>
          <p>
            Most online calculators multiply a number of screens by a flat price. Real projects are scoped differently: each
            feature carries engineering effort, the platform choice multiplies that effort, design is mostly fixed, and
            testing, project management and compliance scale with everything else. This tool follows that order.
          </p>
          <ol>
            <li>
              <strong>Foundation.</strong> Every project needs architecture, environments, CI/CD and store setup: 40–64 hours
              before any feature exists.
            </li>
            <li>
              <strong>Features.</strong> Each feature has a low and high effort range for one experienced engineer (see the
              table below).
            </li>
            <li>
              <strong>Platform multiplier.</strong> Engineering hours are multiplied by the platform factor. Design is not,
              because one design system serves every platform.
            </li>
            <li>
              <strong>Testing and management.</strong> QA adds 18–25% and project management 8–12% of the build effort.
            </li>
            <li>
              <strong>Compliance.</strong> Privacy work (consent, data export and deletion, audit logs, DPDP Act or GDPR
              processes) adds 4–35% depending on how sensitive the data is.
            </li>
            <li>
              <strong>Price and time.</strong> Hours are multiplied by the team&apos;s hourly range; calendar time assumes 30
              productive hours per person per week.
            </li>
          </ol>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface p-5">
            <h3 className="text-xl font-bold">Feature effort (hours, one engineer)</h3>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-slate">
                  <th className="py-2 font-medium">Feature</th>
                  <th className="py-2 text-right font-medium">Hours</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f) => (
                  <tr key={f.id} className="border-t border-line">
                    <td className="py-2 pe-3">{f.label}</td>
                    <td className="py-2 text-right tabular-nums">
                      {f.hours[0]}–{f.hours[1]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-8">
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface p-5">
              <h3 className="text-xl font-bold">Hourly rates by team</h3>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-slate">
                    <th className="py-2 font-medium">Team</th>
                    <th className="py-2 text-right font-medium">Clients abroad</th>
                    <th className="py-2 text-right font-medium">Clients in India</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t.id} className="border-t border-line">
                      <td className="py-2 pe-3">{t.label}</td>
                      <td className="py-2 text-right tabular-nums">
                        ${t.rate[0]}–${t.rate[1]}
                      </td>
                      <td className="py-2 ps-3 text-right tabular-nums">
                        {t.rateInr ? `₹${t.rateInr[0].toLocaleString("en-IN")}–${t.rateInr[1].toLocaleString("en-IN")}` : "converted"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-slate">
                Rounded from published 2026 rate cards and agency pricing guides. Indian teams charge Indian clients in rupees at
                domestic rates, which are well below their export rates, so rupee estimates for Indian teams use domestic rates.
                Very junior freelancers (below about ₹600/hr) are excluded because their quotes rarely include testing, store
                release or support. Other conversions use approximate rates (₹95, £0.75, €0.86 per $1).
              </p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface p-5">
              <h3 className="text-xl font-bold">Multipliers</h3>
              <table className="mt-4 w-full text-sm">
                <tbody>
                  {platforms.map((p) => (
                    <tr key={p.id} className="border-t border-line first:border-0">
                      <td className="py-2 pe-3">{p.label}</td>
                      <td className="py-2 text-right tabular-nums">
                        ×{p.factor[0]}–{p.factor[1]}
                      </td>
                    </tr>
                  ))}
                  {complianceLevels.map((c) => (
                    <tr key={c.id} className="border-t border-line">
                      <td className="py-2 pe-3">{c.label}</td>
                      <td className="py-2 text-right tabular-nums">
                        ×{c.factor[0]}–{c.factor[1]}
                      </td>
                    </tr>
                  ))}
                  {designLevels.map((d) => (
                    <tr key={d.id} className="border-t border-line">
                      <td className="py-2 pe-3">Design: {d.label.toLowerCase()}</td>
                      <td className="py-2 text-right tabular-nums">
                        +{d.hours[0]}–{d.hours[1]} h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="prose mt-16">
          <h2>Three worked examples</h2>
          <p>These run through the same model as the calculator above, so you can compare your own idea against them.</p>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {examples.map((ex) => {
            const r = estimate(ex.input);
            const ri = estimate({ ...ex.input, currency: "INR" });
            const team = teams.find((t) => t.id === ex.input.team)!;
            return (
              <div key={ex.name} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
                <h3 className="text-xl font-bold">{ex.name}</h3>
                <p className="mt-2 flex-1 text-sm text-slate">
                  {ex.summary} Built by: {team.label}.
                </p>
                <p className="mt-4 font-display text-2xl font-extrabold">{formatRange(ri.cost, "INR")}</p>
                <p className="text-sm font-semibold">{formatRange(r.cost, "USD")} for a client abroad</p>
                <p className="text-sm text-slate">
                  {r.hours[0]}–{r.hours[1]} hours, {r.weeks[0]}–{r.weeks[1]} weeks
                </p>
              </div>
            );
          })}
        </div>

        <div className="prose mt-16">
          <h2>Five ways to bring the number down without hurting the product</h2>
          <ul>
            <li>
              <strong>Ship one platform or a PWA first.</strong> Validate demand with the audience that pays most, then add
              the second store.
            </li>
            <li>
              <strong>Choose cross-platform for two stores.</strong> Flutter and React Native share most code; that is the
              biggest single saving in the model.
            </li>
            <li>
              <strong>Buy commodity features.</strong> Use managed sign-in, payments and chat services instead of building
              them, and spend engineering time on what makes your app different.
            </li>
            <li>
              <strong>Cut version one ruthlessly.</strong> Admin panels, social feeds and offline sync are expensive and rarely
              needed on day one. Read{" "}
              <Link href="/blog/mvp-scope-what-to-cut-from-version-one">how to scope an MVP</Link> for a method.
            </li>
            <li>
              <strong>Pay by milestone.</strong> It doesn&apos;t lower the price, but it caps your risk. The{" "}
              <Link href="/blog/freelance-app-project-contract-milestones">milestone contract guide</Link> explains how.
            </li>
          </ul>
          <p>
            For a deeper breakdown with real-world ranges, read{" "}
            <Link href="/blog/how-much-does-it-cost-to-build-an-app">how much it costs to build an app in 2026</Link>.
          </p>

          <h2>Frequently asked questions</h2>
        </div>
        <div className="mt-4 max-w-[68ch] divide-y divide-line border-y border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                {f.q}
                <span aria-hidden="true" className="text-2xl text-indigo transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-slate">{f.a}</p>
            </details>
          ))}
        </div>

        <aside className="mt-16 rounded-3xl bg-indigo-soft p-8">
          <h2 className="text-2xl font-bold">Want a number you can sign?</h2>
          <p className="mt-2 max-w-2xl text-slate">
            Send your estimate and a few lines about the idea. {site.name} replies with questions or a written scope, usually
            within two working days.
          </p>
          <Link href="/work-with-me" className="btn btn-primary mt-6">
            Start a project conversation
          </Link>
        </aside>
      </article>
    </>
  );
}
