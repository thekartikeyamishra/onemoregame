import { site } from "@/lib/site";

export const ADSENSE_SRC = (client: string) => `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;

/**
 * The AdSense head tag, exactly as AdSense issues it. React hoists async scripts into <head> during server rendering
 * and de-duplicates them by src, so placing this on a page (and in AdSlot) loads the script once.
 * Rendered only on content pages and only when NEXT_PUBLIC_ADS_ENABLED=true: the game, challenge links, forms and
 * account pages never load ad code. Auto ads (if switched on in AdSense) can therefore only appear on content pages.
 */
export function AdsenseScript() {
  if (!site.ads.enabled || !site.ads.client) return null;
  return <script async src={ADSENSE_SRC(site.ads.client)} crossOrigin="anonymous" />;
}

/** Google's required advertising disclosure, shown on the privacy and cookie pages while ads are enabled. */
export function AdsDisclosure() {
  if (!site.ads.enabled) return null;
  return (
    <>
      <h2 id="advertising">Advertising (Google AdSense)</h2>
      <p>Content pages (guides, How to Play, FAQ and similar) show ads served by Google AdSense. The game, challenge links, sign-up forms and account pages show no ads.</p>
      <ul>
        <li>Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites.</li>
        <li>Google&apos;s use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet.</li>
        <li>You can opt out of personalised advertising in <a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">Google Ads Settings</a>, or opt out of some third-party vendors&apos; cookies at <a href="https://www.aboutads.info/choices/" rel="noopener noreferrer" target="_blank">aboutads.info</a>.</li>
        <li>How Google uses data from sites that use its services: <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer" target="_blank">policies.google.com/technologies/partner-sites</a>.</li>
      </ul>
      <p>Visitors in the EEA, the UK and Switzerland are asked for consent through Google&apos;s certified consent message before personalised ads are shown. Ad cookies are set by Google, not by us, and we never pass your email or game data to advertisers.</p>
    </>
  );
}
