import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";
import { InquiryForm } from "@/components/InquiryForm";
import { JsonLd, PERSON_ID, breadcrumbSchema, faqSchema } from "@/components/JsonLd";

export const metadata = pageMeta({
  title: "Hire an app developer for your MVP or AI feature",
  description:
    "Work with Kartikeya Mishra on Flutter apps, PWAs, Next.js SaaS and cost-controlled AI features. Written scopes, milestone payments, weekly demo builds.",
  path: "/work-with-me",
});

const services = [
  {
    t: "MVP for a new product",
    d: "From idea to a store-ready first version: discovery, design, Flutter or web build, analytics and launch.",
  },
  {
    t: "AI features that pay for themselves",
    d: "Chat, search, summaries or agents added to an existing product, with caching, limits and per-user cost tracking built in.",
  },
  {
    t: "Rescue and hardening",
    d: "Take over a half-finished or unstable app: audit, fix the riskiest problems first, add tests, and get it shipping again.",
  },
  {
    t: "Privacy-ready data flows",
    d: "Consent, data export and deletion, retention rules and records that hold up under India's DPDP Act and the EU GDPR.",
  },
];

const fits = [
  "You have a clear problem and a person who'll use the app, even if the features are still fuzzy.",
  "You want one accountable engineer, not a rotating team.",
  "You care about what the app costs to run after launch, not just to build.",
];

const notFits = [
  "Fixed-price bids on a vague brief, or unpaid spec work.",
  "Gambling, adult content, or anything that misleads users.",
];

const options = [
  {
    name: "AI app builders and chatbots",
    good: "Clickable prototypes, internal tools, landing pages and testing an idea in an afternoon.",
    gap: "Security, payments, store review, privacy law and the bugs that only appear with real users are left to you. When something breaks, nobody is accountable.",
  },
  {
    name: "The cheapest freelancer you can find",
    good: "Small, well-defined tasks with a clear spec.",
    gap: "Low quotes often leave out testing, store release, documentation and support, and the risk of a stalled project sits entirely with you.",
  },
  {
    name: "A large agency",
    good: "Big programmes that need many people working in parallel.",
    gap: "Higher rates, account managers between you and the engineers, and often a junior team doing the build.",
  },
  {
    name: "Working with me",
    good: "MVPs, AI features and apps that must be secure, compliant and cheap to run, with one accountable engineer from scope to store.",
    gap: "I take a few projects at a time, so very large teams or same-week starts may not be possible.",
  },
];

const reasons = [
  {
    t: "AI speed, engineer's judgement",
    d: "AI tools are part of how I work, so routine code gets written fast. Architecture, security, data protection and every line that ships are reviewed by an engineer who is accountable for them.",
  },
  {
    t: "You talk to the person building it",
    d: "No account managers or hand-offs. The person on the call is the person writing the code and answering for it.",
  },
  {
    t: "Priced for where you are",
    d: "Indian clients are quoted in rupees, international clients in dollars, pounds or euros, with a fixed price per milestone after a written scope.",
  },
  {
    t: "Built to be cheap to run",
    d: "Hosting, store fees and AI token costs are planned per user before code is written, so the app makes money instead of quietly losing it.",
  },
  {
    t: "Privacy law designed in",
    d: "Consent, data export and deletion, and retention rules under India's DPDP Act and the EU GDPR are part of version one, not a retrofit.",
  },
  {
    t: "Yours from day one",
    d: "Repository, store accounts and cloud projects in your name, with documentation good enough for any developer to pick up.",
  },
];

const faqs = [
  {
    q: "How are projects priced?",
    a: "After a short discovery phase you get a written scope split into milestones, each with a fixed price and acceptance criteria. You pay per milestone, after you've seen it working.",
  },
  {
    q: "Can't I just build my app with ChatGPT or an AI app builder?",
    a: "For a prototype or an internal tool, often yes, and it's a great way to test an idea. A product that handles payments, personal data and real users also needs security review, store compliance, privacy law, monitoring and someone accountable when it breaks. That's the part I take on, and I use AI tools myself to make the routine parts faster and cheaper for you.",
  },
  {
    q: "Why not hire the cheapest freelancer?",
    a: "Compare what's included, not just the total: testing, store release, privacy work, documentation, ownership of accounts and support after launch. A low quote that leaves these out usually costs more by the end. Milestone payments mean you only pay for work you've seen working.",
  },
  {
    q: "Do you quote Indian clients in rupees?",
    a: "Yes. Indian clients are quoted and invoiced in rupees; international clients in USD, GBP or EUR. The free cost calculator shows both, so you can sanity-check any quote before we talk.",
  },
  {
    q: "Who owns the code?",
    a: "You do. The repository, store accounts and cloud projects are set up in your name from the start, and full IP transfers on payment of each milestone.",
  },
  {
    q: "Can you sign an NDA?",
    a: "Yes, a mutual NDA before you share anything confidential is normal and welcome.",
  },
  {
    q: "Which time zones do you work with?",
    a: "Based in India (IST, UTC+5:30), with overlap hours for the UK and Europe and early-morning or late-evening calls for the Americas.",
  },
];

export default function WorkWithMe() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 md:pt-20">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            name: `${site.name}: app and AI product engineering`,
            url: absoluteUrl("/work-with-me"),
            provider: { "@id": PERSON_ID },
            areaServed: ["IN", "GB", "US", "EU", "AE"],
            serviceType: services.map((s) => s.t),
          },
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Work with me", path: "/work-with-me" },
          ]),
          faqSchema(faqs),
        ]}
      />
      <h1 className="max-w-4xl text-[clamp(2.4rem,1.6rem+3.4vw,4.4rem)] font-extrabold">Let&apos;s build the app you keep describing</h1>
      <p className="mt-5 max-w-2xl text-lg text-slate">
        I&apos;m an independent engineer, so you work with me directly from the first call to the store release. A few projects
        at a time, done properly.
      </p>

      <section aria-labelledby="services" className="mt-16">
        <h2 id="services" className="text-3xl font-bold">
          What I can take on
        </h2>
        <dl className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {services.map((s) => (
            <div key={s.t} className="border-t-2 border-ink pt-4">
              <dt className="text-xl font-bold">{s.t}</dt>
              <dd className="mt-2 text-slate">{s.d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="why-ai" className="mt-20">
        <h2 id="why-ai" className="max-w-3xl text-3xl font-bold">
          Why not just build it with AI?
        </h2>
        <p className="mt-3 max-w-2xl text-slate">
          AI tools have made prototypes nearly free, and you should use them. The hard part of a real product is everything
          after the demo works. Here&apos;s an honest comparison.
        </p>
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[640px] text-left text-[0.97rem]">
            <thead className="bg-surface">
              <tr>
                <th scope="col" className="w-1/4 px-5 py-3 font-semibold">Option</th>
                <th scope="col" className="px-5 py-3 font-semibold">Great for</th>
                <th scope="col" className="px-5 py-3 font-semibold">Where it falls short</th>
              </tr>
            </thead>
            <tbody>
              {options.map((o, i) => (
                <tr key={o.name} className={`border-t border-line align-top ${i === options.length - 1 ? "bg-indigo-soft" : ""}`}>
                  <th scope="row" className="px-5 py-4 font-semibold">{o.name}</th>
                  <td className="px-5 py-4">{o.good}</td>
                  <td className="px-5 py-4 text-slate">{o.gap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate">
          More detail in{" "}
          <Link href="/blog/can-ai-build-my-app" className="text-indigo underline">
            what AI app builders can and can&apos;t do
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="why-me" className="mt-20">
        <h2 id="why-me" className="text-3xl font-bold">
          Why founders work with me
        </h2>
        <dl className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r) => (
            <div key={r.t} className="border-t-2 border-ink pt-4">
              <dt className="text-lg font-bold">{r.t}</dt>
              <dd className="mt-2 text-slate">{r.d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="fit" className="mt-20 grid gap-10 md:grid-cols-2">
        <div>
          <h2 id="fit" className="text-2xl font-bold">
            A good fit when
          </h2>
          <ul className="mt-4 space-y-3">
            {fits.map((f) => (
              <li key={f} className="flex gap-3">
                <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-mint" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-bold">Not a fit for</h2>
          <ul className="mt-4 space-y-3">
            {notFits.map((f) => (
              <li key={f} className="flex gap-3">
                <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-danger" />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-slate">
            Not sure about budget yet? Start with the{" "}
            <Link href="/tools/app-cost-calculator" className="text-indigo underline">
              cost calculator
            </Link>{" "}
            and attach the result.
          </p>
        </div>
      </section>

      <section aria-labelledby="start" className="mt-20 grid gap-12 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 id="start" className="text-3xl font-bold">
            Tell me about it
          </h2>
          <p className="mt-3 text-slate">
            A few honest sentences are enough. You&apos;ll get a written reply with questions or next steps, usually within two
            working days.
          </p>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.q}
                  <span aria-hidden="true" className="text-xl text-indigo transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-slate">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <InquiryForm kind="project" />
        </div>
      </section>
    </div>
  );
}
