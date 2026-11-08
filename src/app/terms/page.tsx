import { ContactLink, LegalDraftBanner, Operator } from "@/components/Legal";
import { PageHero } from "@/components/PageHero";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { AdsenseScript } from "@/components/AdsenseScript";

export const metadata = pageMetadata("/terms", "Terms of Use", "Terms for using the ONE MORE website, early-access list and playtests, including limitations of an unfinished product.");

export default function Terms() {
  return (
    <>
      <AdsenseScript />
      <PageHero eyebrow="Legal" title="Terms of use" />
      <div className="section">
        <div className="container prose">
          <h2>1. Who we are</h2>
          <p>This website is operated by <Operator />. Contact: <ContactLink />.</p>
          <h2>2. What the service is today</h2>
          <p>The site provides ONE MORE, a game in an open playtest, information about it, an optional email sign-up and campus-event interest registration. Features described as &ldquo;planned&rdquo; or &ldquo;in development&rdquo; may change or never ship.</p>
          <h2>3. Early access</h2>
          <ul>
            <li>You must be 18 or older, or a parent or guardian requesting for a child.</li>
            <li>Signing up, sharing or referring doesn&apos;t entitle you to any reward, invitation to future features or launch date.</li>
            <li>Invitations are personal, single-use and time-limited. Don&apos;t share or sell them.</li>
            <li>Playtest builds are unfinished. They may contain bugs, change, be reset or be withdrawn, and are provided &ldquo;as is&rdquo;.</li>
          </ul>
          <h2>4. Acceptable use</h2>
          <p>Don&apos;t submit other people&apos;s details without permission, automate submissions, probe or disrupt the service, attempt to access data that isn&apos;t yours, or break the <a href="/fair-play">fair-play rules</a>.</p>
          <h3>Gamer tags and player conduct</h3>
          <p>Gamer tags and names are visible to other players. There is zero tolerance for abusive, hateful, sexual or threatening names or behaviour, and for impersonation. Names are filtered automatically; you can report a player from any Battle room (Report), hide them on your screen, and hosts can remove players. We review reports within 24 hours and may remove names, results or access without notice.</p>

          <h2>5. Feedback</h2>
          <p>If you send feedback or ideas, you allow us to use them to improve the game without obligation to you.</p>
          <h2>6. Intellectual property</h2>
          <p>The site&apos;s content, design and code belong to <Operator /> or its licensors. &ldquo;ONE MORE&rdquo; is a working product name.</p>
          <h2>7. Competitions and prizes</h2>
          <p>No competitions, prizes or paid entries are offered today (buying items never enters you into anything). Any future event will have its own rules, eligibility and terms, which apply in addition to these.</p>
          <h2 id="purchases">7a. Purchases</h2>
          <p>Optional items (skins, trails, Replay Studio and the Founder Pack) are cosmetic or convenience features. They never change scores, rules, hitboxes or leaderboard eligibility. Each is a one-time purchase of a licence to use the item in ONE MORE; there are no subscriptions and no random rewards. Prices are shown before you pay and include applicable taxes on the website. In-app purchases are made through Google Play or the App Store and refunds follow their policies; website purchases are processed by Razorpay and can be refunded within 7 days, as set out in our <a href="/refunds">Refunds, cancellations and delivery</a> policy. Refunded items are removed. The Founder Pack and its badge are sold only until 31 October 2027. Items stay available for as long as ONE MORE runs; if we ever shut down, we&apos;ll give at least 60 days&apos; notice. Accounts that break these terms may lose leaderboard access, but items you paid for are not taken away for that reason unless the law requires it.</p>
          <h2>8. Liability</h2>
          <p>To the extent the law allows, we aren&apos;t liable for indirect or consequential losses from using the site or playtest builds. Nothing in these terms limits rights you have under applicable consumer law.</p>
          <h2>9. Changes and ending access</h2>
          <p>We may update these terms and will change the date below. We may remove early-access requests or invitations that break these terms.</p>
          <h2>10. Governing law</h2>
          <p>The governing law and venue will be stated here once the operating entity is finalised.</p>
          <p className="updated">Last updated {site.contentUpdated}.</p>
          <LegalDraftBanner />
        </div>
      </div>
    </>
  );
}
