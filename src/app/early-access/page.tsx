import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { StoreBadges } from "@/components/StoreBadges";
import { WaitlistForm } from "@/components/WaitlistForm";
import { breadcrumbLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "/early-access",
  "Early Access: how invitations work",
  "How the ONE MORE open playtest works: free guest play, confirming your email to unlock the leaderboard and streaks, signing in on other devices, and optional updates.",
);

export default function EarlyAccess() {
  return (
    <>
      <JsonLd data={breadcrumbLd("/early-access", "Early Access")} />
      <PageHero eyebrow="Early access" title="Play it before anyone else">
        <p>ONE MORE is in an open playtest. Today&apos;s arena is free for everyone; confirming your email unlocks the rest.</p>
      </PageHero>
      <div className="section">
        <div className="container split">
          <div className="prose">
            <h2 style={{ marginTop: 0 }}>How it works</h2>
            <ol>
              <li><strong>Play today&apos;s Daily Arena</strong> as a guest. No sign-up needed.</li>
              <li><strong>Enter your email</strong> (from the results screen or this page). Tell us if you&apos;re a player, a campus organizer or both.</li>
              <li><strong>Confirm your email</strong> using the link we send (valid 48 hours). You&apos;re signed in, Quick Play, the leaderboard and streaks unlock, and the guest run you chose is saved.</li>
              <li><strong>Other devices:</strong> sign in with a one-time email link. Some upcoming features (like Campus Clash pilots) may open to invited players first.</li>
            </ol>
            <h2>What the playtest is, and isn&apos;t</h2>
            <ul>
              <li>It&apos;s an unfinished game in your browser. Expect bugs, changes and occasional score resets before launch.</li>
              <li>It doesn&apos;t include rewards, prizes, payments or guaranteed future access.</li>
              <li>Sharing your personal link is optional and doesn&apos;t change anything about your access.</li>
            </ul>
            <h2>Who can join</h2>
            <p>Anyone 18 or older, anywhere. Parents or guardians can request access for a child. Playtest feedback is voluntary.</p>
            <h2>What we&apos;ll email you</h2>
            <ul>
              <li><strong>Always:</strong> the confirmation email and, if selected, your invitation.</li>
              <li><strong>Only if you opt in:</strong> occasional development and launch updates, each with a one-click unsubscribe.</li>
            </ul>
            <h2>Mobile apps</h2>
            <p>Native apps are not available. Store links will appear here only once real listings exist.</p>
            <StoreBadges />
          </div>
          <div id="request" style={{ scrollMarginTop: 90 }}>
            <div className="form-card">
              <h2 style={{ fontSize: "var(--step-2)" }}>Unlock the full playtest</h2>
              <WaitlistForm />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
