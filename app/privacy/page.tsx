import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";
import { LegalPage } from "@/components/LegalPage";

export const metadata = pageMeta({
  title: "Privacy policy",
  description: `How ${site.name} collects, uses and protects personal data on ${site.url.replace("https://", "")}, and how to exercise your rights under India's DPDP Act and the EU/UK GDPR.`,
  path: "/privacy",
});

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      path="/privacy"
      updated="2026-10-21"
      intro="Short version: I collect as little as possible, never sell your data, and delete it when you ask. The details are below."
    >
      <h2>Who is responsible</h2>
      <p>
        This website is run by {site.name}, an individual based in {site.location} (&ldquo;I&rdquo;, &ldquo;me&rdquo;). I am the data
        fiduciary under India&apos;s Digital Personal Data Protection Act, 2023 (DPDP Act) and the controller under the EU and UK
        General Data Protection Regulation (GDPR). Contact for all privacy matters, including grievances:{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>

      <h2>What I collect and why</h2>
      <table>
        <thead>
          <tr>
            <th>Where</th>
            <th>Data</th>
            <th>Purpose</th>
            <th>Legal basis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Early-access list</td>
            <td>Email, optional role and interests, approximate country, a one-way hash of your IP address</td>
            <td>Send invites and launch news; prevent fake and duplicate sign-ups; measure interest in each project</td>
            <td>Your consent (DPDP s.6; GDPR art. 6(1)(a)); fraud prevention as a legitimate interest</td>
          </tr>
          <tr>
            <td>Project and contact forms</td>
            <td>Name, email, optional company, budget and timeline, your message</td>
            <td>Reply to you and, if we work together, prepare a proposal</td>
            <td>Your consent; steps before a contract (GDPR art. 6(1)(b))</td>
          </tr>
          <tr>
            <td>Mitra chat</td>
            <td>The messages you type</td>
            <td>Answer your question. Unanswered questions are stored as text only, without any identifier, to improve the answers</td>
            <td>Legitimate interest in running the site</td>
          </tr>
          <tr>
            <td>Cost calculator</td>
            <td>Nothing. It runs in your browser</td>
            <td>—</td>
            <td>—</td>
          </tr>
          <tr>
            <td>Server logs</td>
            <td>IP address, browser type, pages requested</td>
            <td>Security, abuse prevention and debugging; kept by the hosting provider for as long as security needs and the law require</td>
            <td>Legitimate interest</td>
          </tr>
        </tbody>
      </table>
      <p>Please don&apos;t send passwords, payment details or government ID numbers through any form or the chat.</p>

      <h2>Storage on your device</h2>
      <p>The site itself uses browser storage only for things you&apos;d expect it to remember:</p>
      <ul>
        <li>
          <code>theme</code>: light or dark mode, if you choose one
        </li>
        <li>
          <code>mitra_lang</code>: the language you picked in the chat
        </li>
        <li>
          <code>ea_ref</code> and <code>ea_code</code>: the invite code that referred you, and your own code after you join
        </li>
      </ul>
      <p>
        These never leave your device unless you submit a form. Clearing your browser data removes them.
      </p>

      <h2>Advertising</h2>
      <p>
        Some articles and the calculator page may show ads served by Google AdSense. Google and its partners may use cookies
        or similar technologies to show ads based on your visits to this and other sites. In the EEA, the UK and Switzerland
        you will be asked for consent first through a Google-certified consent message, and you can change your choice at
        any time from the privacy link it provides. Elsewhere you can manage personalised advertising at{" "}
        <a href="https://adssettings.google.com">Google Ad Settings</a> and learn more at{" "}
        <a href="https://policies.google.com/technologies/partner-sites">how Google uses information from sites that use its services</a>.
        No ads appear on the early-access, contact or project pages, and no personal data from forms is shared with
        advertisers.
      </p>

      <h2>Service providers</h2>
      <p>I use a small number of processors, each bound by its own data-protection terms:</p>
      <ul>
        <li>Vercel: website hosting and delivery</li>
        <li>Google Firebase (Firestore): storage of sign-ups and messages</li>
        <li>Resend: sending confirmation and notification emails</li>
        <li>Upstash: short-lived counters used for rate limiting</li>
        <li>An AI model provider (such as Anthropic or OpenAI): generating chat answers when Mitra&apos;s built-in answers don&apos;t cover a question. Only the conversation text is sent</li>
        <li>Google AdSense: advertising, as described above</li>
      </ul>
      <p>
        Some of these providers process data outside India and the EU. Where that happens, transfers rely on the
        provider&apos;s safeguards such as standard contractual clauses, and on the transfer rules of the DPDP Act.
      </p>

      <h2>How long I keep it</h2>
      <ul>
        <li>Early-access records: until you unsubscribe or ask for deletion, or 12 months after the last related launch, whichever comes first.</li>
        <li>Unconfirmed sign-ups: deleted after 30 days.</li>
        <li>Project and contact messages: up to 24 months, or longer if they become part of a contract and the law requires it.</li>
        <li>Anonymous chat questions: up to 24 months.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        Under the DPDP Act and the GDPR you can ask to access, correct, update or erase your data, withdraw consent at any
        time (this doesn&apos;t affect what happened before), nominate someone to act for you, and raise a grievance. Under the
        GDPR you can also object to processing, ask for restriction or portability, and complain to your local supervisory
        authority. In India, if you&apos;re not satisfied with my response you may approach the Data Protection Board of
        India.
      </p>
      <p>
        Every email has a one-click unsubscribe link that deletes your early-access record. For anything else, email{" "}
        <a href={`mailto:${site.email}?subject=Privacy%20request`}>{site.email}</a> with the subject &ldquo;Privacy
        request&rdquo;. I reply within 30 days, usually much sooner.
      </p>

      <h2>Children</h2>
      <p>
        This site is intended for adults. I don&apos;t knowingly collect data from anyone under 18. If you believe a child has
        signed up, contact me and I&apos;ll delete it.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit (HTTPS with HSTS) and at rest by the storage provider. The database can&apos;t be reached
        from browsers at all; only the site&apos;s server can read it. IP addresses are stored only as salted one-way hashes.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a meaningful way, the date at the top will change and, for material changes affecting
        early-access members, I&apos;ll email you. See also the <Link href="/terms">terms of use</Link>.
      </p>
    </LegalPage>
  );
}
