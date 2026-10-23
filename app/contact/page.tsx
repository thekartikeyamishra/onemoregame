import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";
import { InquiryForm } from "@/components/InquiryForm";
import { JsonLd, PERSON_ID, breadcrumbSchema } from "@/components/JsonLd";

export const metadata = pageMeta({
  title: "Contact",
  description: `Contact ${site.name}: questions, collaborations, press, or privacy requests. Replies usually within two working days.`,
  path: "/contact",
});

export default function Contact() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 sm:px-6 md:pt-20">
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "ContactPage", name: "Contact", about: { "@id": PERSON_ID } },
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
          ]),
        ]}
      />
      <div className="grid gap-12 md:grid-cols-[1fr_1.3fr]">
        <div>
          <h1 className="text-[clamp(2.4rem,1.6rem+3vw,4rem)] font-extrabold">Say hello</h1>
          <p className="mt-4 text-lg text-slate">
            Questions about an article, a collaboration, press, or your data. I read everything myself.
          </p>
          <dl className="mt-10 space-y-6">
            <div>
              <dt className="text-sm text-slate">Email</dt>
              <dd>
                <a href={`mailto:${site.email}`} className="text-lg font-semibold text-indigo hover:underline">
                  {site.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate">Based in</dt>
              <dd className="text-lg font-semibold">{site.location} (IST, UTC+5:30)</dd>
            </div>
            <div>
              <dt className="text-sm text-slate">Planning an app?</dt>
              <dd>
                <Link href="/work-with-me" className="text-lg font-semibold text-indigo hover:underline">
                  Use the project form instead
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate">Privacy requests</dt>
              <dd className="text-slate">
                To access, correct or delete your data, email with the subject &ldquo;Privacy request&rdquo;. See the{" "}
                <Link href="/privacy" className="text-indigo underline">
                  privacy policy
                </Link>
                .
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <InquiryForm kind="contact" />
        </div>
      </div>
    </div>
  );
}
