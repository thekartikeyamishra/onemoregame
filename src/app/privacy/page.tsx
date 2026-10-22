import { ContactLink, LegalDraftBanner, Operator } from "@/components/Legal";
import { PageHero } from "@/components/PageHero";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata("/privacy", "Privacy Notice", "What personal data ONE MORE collects for early access and Campus Clash interest, why, who processes it, how long it's kept and how to delete it.");

export default function Privacy() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy notice" />
      <div className="section">
        <div className="container prose">
          <p>This notice explains what <Operator /> (&ldquo;we&rdquo;) collects through this website and why. We collect as little as we can.</p>

          <h2>What we collect</h2>
          <div className="table-wrap"><table>
            <thead><tr><th scope="col">When</th><th scope="col">Data</th><th scope="col">Why</th></tr></thead>
            <tbody>
              <tr><td>Early-access request</td><td>Email address; player/organizer preference; whether you opted in to updates and when; your age confirmation; a referral code if you arrived through one; a campaign source tag if the link had one; request, confirmation and invitation timestamps</td><td>To confirm your address, manage invitations, honour your email choices and measure whether the game is wanted</td></tr>
              <tr><td>After confirming</td><td>A random referral code linked to your request; a count of confirmed sign-ups that used it</td><td>To understand word of mouth. Other people never see your email or account</td></tr>
              <tr><td>Playing (confirmed players)</td><td>Each run&apos;s mode, arena seed, score and statistics (shards, combo, hits, duration); totals such as personal best, number of runs and days played; your optional leaderboard name; a sign-in session record. We don&apos;t keep your keystrokes or pointer movements after a run is verified</td><td>To verify scores, run leaderboards, and learn whether people enjoy the game enough to come back</td></tr>
              <tr><td>Playing as a guest</td><td>Each run&apos;s mode, seed, score and statistics with no identifier attached. If you enter your email on the results screen, we store that run&apos;s ID with your sign-up and attach the run to your profile when you confirm</td><td>To verify scores and let you keep a run you played before signing up</td></tr>
              <tr><td>Friend challenge links</td><td>The arena seed and twist, the score to beat, the recording of your movements in that run (shown to the people you share it with as a &ldquo;ghost&rdquo;, and only saved when you choose to share), your leaderboard name and your referral code (used only to credit sign-ups). People who play a challenge without an account have their run stored without any identifier</td><td>To let friends play the same arena</td></tr>
              <tr><td>Optional playtest feedback</td><td>Your yes/no answer and any note you write</td><td>To improve the game</td></tr>
              <tr><td>Campus Clash interest</td><td>Name, email, institution or club, role, expected size and your message</td><td>To contact you about pilot events</td></tr>
              <tr><td>Any form submission</td><td>A one-way keyed hash of your IP address, kept for about two hours</td><td>Rate limiting and abuse prevention. We don&apos;t store raw IP addresses in our database</td></tr>
              <tr><td>Emails we send</td><td>Delivery status (sent/failed) and the provider&apos;s message ID</td><td>To avoid duplicate emails and fix delivery problems</td></tr>
            </tbody>
          </table></div>
          <p>We don&apos;t ask for your date of birth, phone number, location, government ID or school identity for early access. Our hosting provider may keep standard server logs (such as IP address and browser type) for security and operations.</p>

          <h2>Legal basis and consent</h2>
          <p>We process your email to handle the access request you made. Product updates are sent only if you tick the optional box, and you can withdraw that consent any time using the link in any email. Withdrawing doesn&apos;t affect processing that already happened.</p>

          <h2>Who processes it</h2>
          <ul>
            <li><strong>Google (Firebase / Google Cloud)</strong>: hosting and database (Cloud Firestore).</li>
            <li><strong>Our transactional email provider (Resend)</strong>: delivering confirmation, invitation and optional update emails.</li>
          </ul>
          <p>These providers may process data outside India, including in the United States, under their own safeguards. We don&apos;t sell personal data or share it with advertisers.</p>

          <h2>Analytics, cookies and ads</h2>
          <p>The site uses one strictly necessary sign-in cookie for confirmed players and no analytics, advertising or tracking cookies. See the <a href="/cookies">cookie notice</a>. If that changes, we&apos;ll update this notice and ask for consent where required before anything non-essential runs.</p>

          <h2>How long we keep it</h2>
          <ul>
            <li>Unconfirmed early-access requests: deleted automatically after 90 days.</li>
            <li>Confirmed requests: until 24 months after public launch, or sooner if you ask us to delete them.</li>
            <li>Campus Clash interest: up to 24 months, or sooner on request.</li>
            <li>Email delivery records: 90 days. Rate-limit records: about two hours.</li>
            <li>Sign-in sessions: 30 days. One-time sign-in links: 15 minutes.</li>
            <li>Gameplay data and feedback: deleted with your early-access record, or when playtest data is reset before public launch.</li>
          </ul>

          <h2 id="rights">Your rights</h2>
          <p>You can ask to access, correct or delete your data, withdraw consent, or raise a grievance. Email <ContactLink /> from the address concerned with &ldquo;Privacy request&rdquo; in the subject. We&apos;ll respond within 30 days. You may also have the right to complain to your data protection authority, such as the Data Protection Board of India.</p>

          <h2>Children</h2>
          <p>Early access is for people aged 18 and over, or a parent or guardian requesting for a child. We don&apos;t knowingly collect data from children without parental involvement. If you think a child has submitted data, contact us and we&apos;ll delete it.</p>

          <h2>Security</h2>
          <p>Data is stored in a database that browsers can&apos;t read directly; all access goes through our server. Confirmation and invitation links are random, single-purpose and stored only as one-way hashes. No system is perfectly secure, and we&apos;ll notify affected people and authorities of a breach as the law requires.</p>

          <h2>Changes</h2>
          <p>We&apos;ll update this page when our practices change and note the date below.</p>
          <p className="updated">Last updated {site.contentUpdated}.</p>
          <LegalDraftBanner />
        </div>
      </div>
    </>
  );
}
