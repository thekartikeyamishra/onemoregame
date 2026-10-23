import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { lab, site } from "@/lib/site";
import { defaultInputs, estimate, formatRange, leanPhase } from "@/lib/cost-model";
import { getPosts, formatDate } from "@/lib/blog";
import { HeroMascot } from "@/components/mascot/HeroMascot";
import { Spotlight } from "@/components/Spotlight";
import { StoreButtons } from "@/components/StoreButtons";
import { JsonLd, faqSchema } from "@/components/JsonLd";

export const metadata = pageMeta({
  title: site.title,
  description: site.description,
  path: "/",
});

const faqs = [
  {
    q: "What does Kartikeya Mishra build?",
    a: "Mobile apps (Flutter, iOS and Android), progressive web apps and AI-powered SaaS, from first sketch to store release. Typical work: MVPs for founders, AI features with cost controls, and privacy-compliant data flows under India's DPDP Act and the EU GDPR.",
  },
  {
    q: "What is the early-access list?",
    a: "A free, invite-only list for the apps being built in the studio. Invites go out in small waves so feedback can be handled properly. Joining doesn't commit you to anything, and you can remove your email at any time.",
  },
  {
    q: "How much does it cost to build an app?",
    a: "It depends on features, platforms, design depth, compliance and who builds it. A small cross-platform MVP built by an Indian team often lands between a few thousand and twenty-five thousand US dollars. The free calculator on this site breaks your idea down line by line.",
  },
  {
    q: "Do you work with clients outside India?",
    a: "Yes. Projects run remotely with written scopes, milestone-based payments and weekly demos, and are priced in USD, GBP, EUR or INR.",
  },
];

export default function Home() {
  const example = estimate({ ...defaultInputs, currency: "USD" });
  const exampleInr = estimate({ ...defaultInputs, currency: "INR" });
  const leanInr = leanPhase({ ...defaultInputs, currency: "INR" });
  const leanUsd = leanPhase({ ...defaultInputs, currency: "USD" });
  const posts = getPosts().slice(0, 3);

  return (
    <>
      <JsonLd data={faqSchema(faqs)} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <Spotlight />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-28">
          <div className="rise-in">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm text-slate">
              <span className="h-2 w-2 rounded-full bg-mint" aria-hidden="true" />
              {site.availability}
            </p>
            <h1 className="text-[clamp(2.6rem,1.6rem+4.6vw,5.2rem)] font-extrabold">{site.tagline}</h1>
            <p className="mt-6 max-w-[34rem] text-lg text-slate sm:text-xl">
              I&apos;m Kartikeya Mishra, an independent engineer in Lucknow. I design and ship mobile apps, PWAs and AI features
              for founders, and I&apos;m building a few apps of my own.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/early-access" className="btn btn-primary">
                Request an invite
              </Link>
              <Link href="/tools/app-cost-calculator" className="btn btn-ghost">
                Estimate your app&apos;s cost
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate">Works in Flutter, Firebase, Next.js, Node and LLM APIs.</p>
          </div>
          <HeroMascot />
        </div>
      </section>

      {/* Lab */}
      <section aria-labelledby="lab-title" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 id="lab-title" className="text-[clamp(2rem,1.5rem+2vw,3rem)] font-bold">
                In the lab, by invitation
              </h2>
              <p className="mt-4 max-w-md text-slate">
                Three apps are in private development. Invites go out in small waves, so every early user gets a real
                conversation, not a ticket number.
              </p>
              <div className="mt-8 flex flex-col gap-5">
                <Link href="/early-access" className="btn btn-primary self-start">
                  Request an invite
                </Link>
                <StoreButtons />
              </div>
            </div>
            <ul className="divide-y divide-line border-y border-line">
              {lab.map((p) => (
                <li key={p.id} className="grid gap-2 py-6 sm:grid-cols-[9rem_1fr] sm:gap-6">
                  <div>
                    <p className="font-display text-xl font-bold">{p.codename}</p>
                    <p className="mt-1 inline-block rounded-full bg-indigo-soft px-2.5 py-0.5 text-xs font-semibold text-indigo">{p.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate">{p.kind}</p>
                    <p className="mt-1 text-lg">{p.line}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-8 max-w-3xl text-sm text-slate">
            Early access is free. Descriptions show current direction only; features, timing and pricing may change before
            release, and joining the list doesn&apos;t create any obligation for you or a guarantee of access.
          </p>
        </div>
      </section>

      {/* Tool teaser */}
      <section aria-labelledby="tool-title" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 id="tool-title" className="text-[clamp(2rem,1.5rem+2vw,3rem)] font-bold">
              Know the number before you ask for quotes
            </h2>
            <p className="mt-4 max-w-lg text-slate">
              The free calculator prices an app the way engineers actually scope one: feature by feature, then testing,
              project management and compliance, for five kinds of teams. Every assumption is on the page.
            </p>
            <Link href="/tools/app-cost-calculator" className="btn btn-primary mt-8">
              Open the calculator
            </Link>
          </div>
          <figure className="rounded-3xl border border-line bg-surface p-7">
            <figcaption className="text-sm text-slate">
              Example: iOS + Android app with sign-in, profiles, push, payments and analytics, custom design, built by an
              agency in India.
            </figcaption>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-slate">Client in India</dt>
                <dd className="font-display text-[clamp(1.5rem,1.2rem+1vw,1.95rem)] font-extrabold leading-tight">{formatRange(exampleInr.cost, "INR")}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate">Client abroad</dt>
                <dd className="font-display text-[clamp(1.5rem,1.2rem+1vw,1.95rem)] font-extrabold leading-tight">{formatRange(example.cost, "USD")}</dd>
              </div>
            </dl>
            {leanInr ? (
              <p className="mt-4 rounded-2xl bg-indigo-soft px-4 py-3 text-sm">
                <span className="font-semibold">Phase 1 on one platform: from {formatRange(leanInr.estimate.cost, "INR")}</span>
                <span className="text-slate"> ({leanUsd ? formatRange(leanUsd.estimate.cost, "USD") : ""}), about {leanInr.estimate.weeks[0]}–{leanInr.estimate.weeks[1]} weeks.</span>
              </p>
            ) : null}
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm">
              <div>
                <dt className="text-slate">Effort</dt>
                <dd className="font-semibold">
                  {example.hours[0]}–{example.hours[1]} hours
                </dd>
              </div>
              <div>
                <dt className="text-slate">Calendar time</dt>
                <dd className="font-semibold">
                  {example.weeks[0]}–{example.weeks[1]} weeks
                </dd>
              </div>
            </dl>
          </figure>
        </div>
      </section>

      {/* Work */}
      <section aria-labelledby="work-title" className="bg-band text-band-ink">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <h2 id="work-title" className="max-w-2xl text-[clamp(2rem,1.5rem+2vw,3rem)] font-bold">
            Have an app to build? Here&apos;s how we&apos;d work
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              ["Scope in writing", "A short discovery phase turns your idea into screens, a feature list, a milestone plan and a cost you can compare with other quotes."],
              ["Build in the open", "Weekly demo builds on your phone, a shared board, and payment only when each milestone is delivered and accepted."],
              ["Launch and hand over", "Store listings, analytics, privacy pages and a clean repository you own, plus a bug-fix window agreed in the contract."],
            ].map(([t, d], i) => (
              <li key={t}>
                <span className="font-display text-5xl font-extrabold text-marigold">{i + 1}</span>
                <h3 className="mt-3 text-xl font-bold">{t}</h3>
                <p className="mt-2 opacity-75">{d}</p>
              </li>
            ))}
          </ol>
          <Link href="/work-with-me" className="btn mt-12 bg-marigold text-[#131a33]">
            Tell me about your project
          </Link>
        </div>
      </section>

      {/* Writing */}
      {posts.length > 0 && (
        <section aria-labelledby="writing-title" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="flex items-end justify-between gap-6">
            <h2 id="writing-title" className="text-[clamp(2rem,1.5rem+2vw,3rem)] font-bold">
              Recent writing
            </h2>
            <Link href="/blog" className="shrink-0 font-semibold text-indigo hover:underline">
              All articles
            </Link>
          </div>
          <ul className="mt-10 divide-y divide-line border-y border-line">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="group grid gap-2 py-7 md:grid-cols-[1fr_12rem] md:gap-8">
                  <div>
                    <h3 className="text-2xl font-bold group-hover:text-indigo">{p.title}</h3>
                    <p className="mt-2 max-w-2xl text-slate">{p.description}</p>
                  </div>
                  <p className="text-sm text-slate md:text-right">
                    <time dateTime={p.date}>{formatDate(p.date)}</time>
                    <br />
                    {p.readingMinutes} min read
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="mx-auto max-w-3xl px-4 pb-8 sm:px-6">
        <h2 id="faq-title" className="text-[clamp(1.8rem,1.4rem+1.6vw,2.6rem)] font-bold">
          Questions people ask
        </h2>
        <div className="mt-8 divide-y divide-line border-y border-line">
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
      </section>
    </>
  );
}
