import { PageHero } from "@/components/PageHero";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { AdsDisclosure, AdsenseScript } from "@/components/AdsenseScript";

export const metadata = pageMetadata("/cookies", "Cookies and storage", site.ads.enabled ? "Which cookies and browser storage the ONE MORE website uses, including Google AdSense on content pages." : "Which cookies and browser storage the ONE MORE website uses. Currently: no analytics, advertising or tracking cookies.");

export default function Cookies() {
  return (
    <>
      <AdsenseScript />
      <PageHero eyebrow="Legal" title="Cookies and storage" />
      <div className="section">
        <div className="container prose">
          {site.ads.enabled ? (
            <p><strong>We set no analytics or tracking cookies of our own.</strong> Our only cookie is a strictly necessary sign-in cookie. Content pages show Google AdSense ads, and Google may set advertising cookies there (see <a href="#advertising">Advertising</a>). The game, forms and account pages load no ad code.</p>
          ) : (
            <p><strong>This site sets no analytics, advertising or tracking cookies.</strong> The only cookie is a strictly necessary sign-in cookie for confirmed players, so there&apos;s nothing to accept or decline.</p>
          )}
          <h2>What may be used</h2>
          <div className="table-wrap"><table>
            <thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Purpose</th><th scope="col">Duration</th></tr></thead>
            <tbody>
              <tr><td><code>om_session</code></td><td>Cookie (HttpOnly, first-party)</td><td>Keeps you signed in. Set only after you confirm your email, accept an invitation or use a sign-in link.</td><td>30 days, or until you sign out</td></tr>
              <tr><td><code>om_sound</code>, <code>om_reduced</code>, <code>om_community_dismissed_until</code></td><td>Local storage</td><td>Remembers your sound and reduce-effects settings, and that you dismissed the community prompt. Never sent to us.</td><td>Until you clear site data</td></tr>
              <tr><td><code>om_community_shown</code></td><td>Session storage</td><td>Makes sure the community prompt appears at most once per visit.</td><td>Until you close the tab</td></tr>
            </tbody>
          </table></div>
          <ul>
            <li>Strictly necessary technical storage that the hosting platform or framework needs to deliver pages and process forms securely.</li>
            <li>Self-hosted fonts and scripts served from this domain. We don&apos;t load third-party trackers{site.ads.enabled ? " (Google AdSense on content pages is the only third-party script)" : ""}.</li>
          </ul>
          <AdsDisclosure />
          <h2>If this changes</h2>
          <p>If we add analytics or advertising (for example Google AdSense on content pages), we&apos;ll update this page and the <a href="/privacy">privacy notice</a> first and, where required, ask for your consent before any non-essential cookie is set.</p>
          <p className="updated">Last updated {site.contentUpdated}.</p>
        </div>
      </div>
    </>
  );
}
