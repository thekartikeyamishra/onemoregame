import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata("/refunds", "Refunds, cancellations and delivery", "How refunds, cancellations and delivery work for optional ONE MORE purchases on the website, Google Play and the App Store.");

const UPDATED = "8 November 2026";

export default function Refunds() {
  const mail = site.contactEmail;
  return (
    <>
      <JsonLd data={breadcrumbLd("/refunds", "Refunds")} />
      <PageHero eyebrow="Legal" title="Refunds, cancellations and delivery"><p>Last updated {UPDATED}.</p></PageHero>
      <div className="section">
        <div className="container prose">
          <p><strong>ONE MORE is free to play.</strong> Every game mode, leaderboard and update is free. The optional <a href="/shop">Shop</a> sells cosmetic items (skins, trails, Replay Studio and the Founder Pack) that never affect scores. This page explains what happens after you buy one. It is part of our <a href="/terms#purchases">Terms</a>.</p>

          <h2 id="delivery">Delivery</h2>
          <ul>
            <li>All items are digital. Nothing is shipped.</li>
            <li>Items unlock automatically, usually within seconds of a successful payment, on the account or app you bought them with.</li>
            <li>If an item hasn&apos;t appeared after 15 minutes, open the Shop and tap <strong>Restore purchases</strong>. If it still isn&apos;t there, write to us (below) and we&apos;ll fix it or refund you.</li>
          </ul>

          <h2 id="cancellation">Cancellation</h2>
          <p>All items are one-time purchases. There are no subscriptions, renewals or automatic charges, so there is nothing to cancel. You can close the checkout at any point before paying, and you won&apos;t be charged.</p>

          <h2 id="website">Refunds for website purchases (Razorpay)</h2>
          <ul>
            <li><strong>7-day refund:</strong> if you change your mind or an item doesn&apos;t work for you, ask within 7 days of purchase and we&apos;ll refund it in full. The item (and, for the Founder Pack, the Founder badge) is removed from your account.</li>
            <li><strong>Charged but nothing unlocked, or charged twice:</strong> we refund in full at any time. Payments that fail after money leaves your account are reversed automatically by the bank or Razorpay, usually within 5–7 working days.</li>
            <li>Approved refunds go back to the original payment method (UPI, card, netbanking or wallet). Razorpay processes them within 5–7 working days. Your bank may take longer to show it.</li>
            <li>We may refuse refunds that are clearly abusive, for example repeated buy-and-refund of the same item.</li>
          </ul>

          <h2 id="stores">Refunds for app purchases (Google Play and the App Store)</h2>
          <p>Purchases inside the Android and iOS apps are processed by Google or Apple, and their refund policies apply. We can&apos;t issue those refunds ourselves.</p>
          <ul>
            <li><strong>Google Play:</strong> request a refund from your Google Play order history or <a href="https://support.google.com/googleplay/answer/2479637" target="_blank" rel="noopener noreferrer">Google&apos;s refund page</a>.</li>
            <li><strong>App Store:</strong> request a refund at <a href="https://reportaproblem.apple.com" target="_blank" rel="noopener noreferrer">reportaproblem.apple.com</a>.</li>
          </ul>
          <p>When Google or Apple refunds a purchase, the item is removed automatically.</p>

          <h2 id="rights">Your legal rights</h2>
          <p>Nothing here limits rights you have under consumer law where you live, including the Consumer Protection Act, 2019 in India. If you are in the EU, UK or a similar country, you agree at checkout that a digital item is delivered immediately, which ends the statutory withdrawal period once delivery has happened. Our voluntary 7-day refund for website purchases still applies.</p>

          <h2 id="contact">How to ask for a refund or report a problem</h2>
          <p>Email <a href={`mailto:${mail}?subject=Refund%20request`}><strong>{mail}</strong></a> with the subject &ldquo;Refund request&rdquo;. Include the email you sign in with and the Razorpay payment ID or order ID from your receipt. Never send card numbers, UPI PINs or passwords: we will never ask for them.</p>
          <p><strong>Grievance contact:</strong> {site.operatorName}, {mail}. We acknowledge every request within 48 hours and resolve it within 7 working days.</p>
        </div>
      </div>
    </>
  );
}
