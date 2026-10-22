import type { Metadata } from "next";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { PlayClient } from "@/game/PlayClient";
import { currentStreak, dailyTwist, dayKey, getPlayer, twistInfo } from "@/lib/game-service";
import { pageMetadata, videoGameLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";

export const metadata: Metadata = {
  ...pageMetadata("/play", "Play today's Daily Arena", "Play ONE MORE in your browser: today's Daily Arena is free, no sign-up. Sixty seconds, one shared arena, beat your friends."),
};
export const dynamic = "force-dynamic";

export default async function PlayPage() {
  let signupId: string | null = null;
  let player: Awaited<ReturnType<typeof getPlayer>> | null = null;
  let unavailable = false;
  try {
    const ctx = await serverCtx();
    signupId = await currentPlayer(ctx);
    if (signupId) player = await getPlayer(ctx.store, signupId);
  } catch {
    unavailable = true;
  }

  return (
    <section className="section" style={{ paddingTop: "2rem" }}>
      <JsonLd data={{ "@context": "https://schema.org", ...videoGameLd() }} />
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "var(--step-3)", margin: 0 }}>Play ONE MORE</h1>
          {signupId ? (
            <form action={signOutAction}><button className="btn btn--sm" type="submit">Sign out</button></form>
          ) : (
            <Link className="btn btn--sm" href="/play/sign-in">Already confirmed? Sign in</Link>
          )}
        </div>
        {unavailable ? (
          <div className="notice notice--err" role="alert"><strong>Temporarily unavailable</strong>Please try again in a few minutes.</div>
        ) : (
          <PlayClient dailyTwist={twistInfo(dailyTwist(dayKey()))} player={player ? { displayName: player.displayName, bestScore: player.bestScore, streak: currentStreak(player, dayKey()) } : null} />
        )}
      </div>
    </section>
  );
}
