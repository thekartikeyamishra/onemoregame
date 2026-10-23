import { pageMeta } from "@/lib/seo";
import { lab, site } from "@/lib/site";
import { waitlistTotal } from "@/lib/server/waitlist";
import { WaitlistForm } from "@/components/WaitlistForm";
import { StoreButtons } from "@/components/StoreButtons";
import { JsonLd, breadcrumbSchema } from "@/components/JsonLd";

export const revalidate = 600;

export const metadata = pageMeta({
  title: "Early access to upcoming apps",
  description:
    "Free, invite-only early access to the apps Kartikeya Mishra is building: an AI-native assistant, a planning tool for small teams and an AI cost tool.",
  path: "/early-access",
});

const SOCIAL_PROOF_MIN = 100; // only show the count once it's meaningful

export default async function EarlyAccess() {
  const total = await waitlistTotal().catch(() => null);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 md:pt-20">
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Early access", path: "/early-access" }])} />
      <div className="grid gap-14 lg:grid-cols-[1fr_440px]">
        <div>
          <h1 className="text-[clamp(2.4rem,1.6rem+3.4vw,4.4rem)] font-extrabold">Get in before everyone else</h1>
          <p className="mt-5 max-w-xl text-lg text-slate">
            The studio&apos;s next apps open to a small group first. Early members shape what gets built, get direct access to
            the person building it, and hear about each release before the public.
          </p>
          <a href="#request" className="btn btn-primary mt-7 lg:hidden">
            Request your invite
          </a>
          {total !== null && total >= SOCIAL_PROOF_MIN ? (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-indigo-soft px-4 py-2 font-semibold">
              {total.toLocaleString("en-IN")} people have requested an invite
            </p>
          ) : null}

          <h2 className="mt-14 text-2xl font-bold">What&apos;s being built</h2>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {lab.map((p) => (
              <li key={p.id} className="py-5">
                <p className="font-display text-lg font-bold">
                  {p.codename} <span className="ms-2 align-middle text-xs font-semibold text-indigo">{p.status}</span>
                </p>
                <p className="text-sm text-slate">{p.kind}</p>
                <p className="mt-1">{p.line}</p>
              </li>
            ))}
          </ul>

          <h2 className="mt-14 text-2xl font-bold">How invites work</h2>
          <ol className="mt-5 space-y-5">
            {[
              ["Request", "Leave your email and, if you like, which project interests you. It takes ten seconds."],
              ["Confirm", "Tap the link in the confirmation email so I know the address is really yours."],
              ["Get your wave", "Invites go out in small groups as each app is ready. Referrals from confirmed friends can move you to an earlier wave."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-marigold font-display font-extrabold text-[#131a33]">{i + 1}</span>
                <div>
                  <h3 className="font-bold">{t}</h3>
                  <p className="text-slate">{d}</p>
                </div>
              </li>
            ))}
          </ol>

          <h2 className="mt-14 text-2xl font-bold">When the apps launch</h2>
          <p className="mt-3 max-w-xl text-slate">
            These buttons will link to the store listings on release day. Until then they stay switched off.
          </p>
          <div className="mt-5">
            <StoreButtons />
          </div>

          <div className="mt-14 max-w-xl rounded-2xl border border-line p-5 text-sm text-slate">
            <h2 className="font-sans text-base font-bold text-ink" style={{ letterSpacing: 0 }}>
              The fine print, in plain words
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 ps-5">
              <li>Early access is free. Nothing is sold through this list and no payment details are ever requested.</li>
              <li>Features, timelines and any future pricing may change. Joining doesn&apos;t guarantee access or any benefit.</li>
              <li>Your email is used only for invites and launch news, is never sold, and can be deleted at any time.</li>
              <li>Fake, duplicate or automated sign-ups and self-referrals are removed without notice.</li>
            </ul>
          </div>
        </div>

        <div id="request" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-[0_24px_60px_-30px_rgba(19,26,51,.35)] sm:p-8">
            <h2 className="mb-6 text-2xl font-bold">Request your invite</h2>
            <WaitlistForm siteUrl={site.url} />
          </div>
        </div>
      </div>
    </div>
  );
}
