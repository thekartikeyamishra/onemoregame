import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";
import { JsonLd, PERSON_ID, breadcrumbSchema } from "@/components/JsonLd";

export const metadata = pageMeta({
  title: "About Kartikeya Mishra",
  description:
    "Kartikeya Mishra is an independent full-stack and AI product engineer in Lucknow, India, building Flutter, Firebase and Next.js apps for clients worldwide.",
  path: "/about",
});

const principles = [
  {
    t: "Every element earns its place",
    d: "If a screen, a field or a feature can't say why it exists, it goes. Smaller apps are faster to build, cheaper to run and easier to love.",
  },
  {
    t: "Costs are a design input",
    d: "Hosting, AI tokens and store fees are decided at the whiteboard, not discovered on the invoice. Each feature gets a per-user cost before it gets code.",
  },
  {
    t: "Privacy by default",
    d: "Collect less, keep it shorter, and make deletion one tap. It's what India's DPDP Act and the GDPR require, and it's what users expect anyway.",
  },
  {
    t: "Ship, measure, then polish",
    d: "Get a working version into real hands quickly, watch what people actually do, and spend design effort where it changes behaviour.",
  },
];

const stack = [
  ["Mobile", "Flutter, Dart, native platform channels, Play Store and App Store release"],
  ["Web", "Next.js, React, TypeScript, Tailwind CSS, PWAs"],
  ["Backend", "Node.js, Firebase (Firestore, Auth, Functions), PostgreSQL, Redis"],
  ["AI", "LLM APIs, retrieval-augmented generation, evals, caching and cost controls"],
  ["Ops", "Vercel, Google Cloud, CI/CD, monitoring, Core Web Vitals"],
];

export default function About() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6 md:pt-20">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            url: absoluteUrl("/about"),
            mainEntity: { "@id": PERSON_ID },
            dateModified: "2026-10-21",
          },
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
          ]),
        ]}
      />
      <h1 className="text-[clamp(2.4rem,1.6rem+3vw,4rem)] font-extrabold">Hi, I&apos;m Kartikeya</h1>
      <div className="prose mt-8">
        <p>
          I&apos;m an independent full-stack and AI product engineer based in {site.location}. I work alone on purpose: one
          person who understands the product, the code and the bill end to end makes better trade-offs than a relay of
          specialists.
        </p>
        <p>
          Most of my time goes into two things. The first is client work: founders and small teams come to me with an idea
          or a half-built app, and I take it through scoping, design, a Flutter or web build, and release. The second is my
          own studio, where I build products for people in India and abroad, a few of which are{" "}
          <Link href="/early-access">open for early access</Link>.
        </p>
        <p>
          I care a lot about the unglamorous parts: whether an AI feature makes or loses money per user, whether a consent
          screen would satisfy the DPDP Act, whether the app still feels fast on a ₹10,000 Android phone on a patchy network.
          The <Link href="/blog">writing on this site</Link> is where I share what I learn, with real numbers.
        </p>
      </div>

      <section aria-labelledby="principles" className="mt-16">
        <h2 id="principles" className="text-3xl font-bold">
          How I work
        </h2>
        <dl className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {principles.map((p) => (
            <div key={p.t} className="border-t-2 border-ink pt-4">
              <dt className="text-xl font-bold">{p.t}</dt>
              <dd className="mt-2 text-slate">{p.d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="stack" className="mt-16">
        <h2 id="stack" className="text-3xl font-bold">
          Tools I use daily
        </h2>
        <table className="mt-6 w-full text-left">
          <tbody>
            {stack.map(([k, v]) => (
              <tr key={k} className="border-t border-line">
                <th scope="row" className="w-32 py-3 pe-4 align-top font-semibold">
                  {k}
                </th>
                <td className="py-3 text-slate">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-16 grid gap-5 md:grid-cols-3">
        <Link href="/work-with-me" className="rounded-3xl bg-band p-6 text-band-ink transition-transform hover:-translate-y-0.5">
          <p className="text-xl font-bold">Hire me for a project</p>
          <p className="mt-1 opacity-75">MVPs, AI features, rescues.</p>
        </Link>
        <Link href="/early-access" className="rounded-3xl bg-marigold p-6 text-[#131a33] transition-transform hover:-translate-y-0.5">
          <p className="text-xl font-bold">Try what I&apos;m building</p>
          <p className="mt-1 opacity-80">Free, invite-only early access.</p>
        </Link>
        <a href={site.social.github} rel="me noopener" target="_blank" className="rounded-3xl border border-line bg-surface p-6 transition-transform hover:-translate-y-0.5">
          <p className="text-xl font-bold">Read my code</p>
          <p className="mt-1 text-slate">Open-source work on GitHub.</p>
        </a>
      </section>
    </div>
  );
}
