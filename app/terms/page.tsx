import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";
import { LegalPage } from "@/components/LegalPage";

export const metadata = pageMeta({
  title: "Terms of use",
  description: `The rules for using ${site.url.replace("https://", "")}, the free cost calculator, the Mitra chat assistant and the invite-only early-access programme.`,
  path: "/terms",
});

export default function Terms() {
  return (
    <LegalPage
      title="Terms of use"
      path="/terms"
      updated="2026-10-21"
      intro={`By using this website you agree to these terms. They're written to be read, so please do.`}
    >
      <h2>About this site</h2>
      <p>
        {site.url.replace("https://", "")} is the personal website of {site.name}, an independent software engineer in{" "}
        {site.location}. It offers articles, a free app cost calculator, a chat assistant called Mitra, a contact form for
        projects, and an invite-only list for apps in development.
      </p>

      <h2>Information, not professional advice</h2>
      <p>
        Articles, calculator results and chat answers are general information based on experience and published sources.
        They are not legal, financial, tax or investment advice and are not a quote or offer. Decisions you make based on them
        are your own; for legal or financial decisions, speak to a qualified professional. See the{" "}
        <Link href="/disclaimer">disclaimer</Link>.
      </p>

      <h2 id="early-access">Early-access programme</h2>
      <ul>
        <li>Joining is free and doesn&apos;t require any purchase. It is not a sale, pre-order, investment or contest.</li>
        <li>
          Joining does not guarantee access, a launch date, specific features, pricing or any other benefit. Project
          descriptions show current direction and may change or be cancelled.
        </li>
        <li>Invites are sent in waves at my discretion. Referrals may influence, but don&apos;t determine, when you&apos;re invited.</li>
        <li>
          A referral counts only when a different, real person joins with your link and confirms their own email address.
        </li>
        <li>
          <strong>Fair-use and penalties.</strong> Self-referrals, multiple accounts, aliases of the same mailbox, disposable
          addresses, automated or paid sign-ups, and misleading promotion (including spam or claims that you or the apps
          offer money, prizes or guaranteed access) are not allowed. Offending referrals are voided. Accounts that repeatedly
          generate voided referrals are flagged: their referral credit is frozen, they are excluded from early waves pending
          review, and they may be removed from the list.
        </li>
        <li>You can leave at any time using the unsubscribe link in any email, which deletes your record.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>attack, overload, scrape at scale, or try to bypass the security or rate limits of the site or its APIs;</li>
        <li>use the chat assistant to generate content unrelated to the site, to extract its instructions, or to abuse the underlying AI service;</li>
        <li>submit false information, other people&apos;s data without their permission, malware or unlawful content;</li>
        <li>impersonate {site.name} or suggest an endorsement that doesn&apos;t exist.</li>
      </ul>
      <p>Access may be limited or blocked for anyone who breaks these rules.</p>

      <h2>Client work</h2>
      <p>
        Submitting the project form starts a conversation, not a contract. Any engagement is governed by a separate written
        agreement covering scope, milestones, payment, intellectual property and confidentiality.
      </p>

      <h2>Intellectual property</h2>
      <p>
        Text, design, the Mitra character, code and images on this site belong to {site.name} unless stated otherwise. You
        may quote short excerpts with a link back. You may share links to calculator results freely.
      </p>

      <h2>Third-party links and ads</h2>
      <p>
        The site may link to other websites and show ads served by Google. I don&apos;t control and am not responsible for
        their content, products or policies. An ad is not an endorsement.
      </p>

      <h2>Liability</h2>
      <p>
        The site is provided &ldquo;as is&rdquo;. To the extent the law allows, I&apos;m not liable for indirect or consequential
        losses arising from its use, or for decisions made based on its content. Nothing in these terms limits liability that
        can&apos;t be limited by law, or your statutory rights as a consumer.
      </p>

      <h2>Changes and law</h2>
      <p>
        I may update these terms; the date above shows the latest version. These terms are governed by the laws of India, and
        the courts at Lucknow, Uttar Pradesh have jurisdiction, without removing any mandatory consumer protections in your
        own country. Questions: <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
    </LegalPage>
  );
}
