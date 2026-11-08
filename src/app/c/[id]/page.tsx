import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayClient } from "@/game/PlayClient";
import { currentStreak, dayKey, getChallengePublic, getPlayer } from "@/lib/game-service";
import { ownershipOf } from "@/lib/shop/service";
import { serverCtx } from "@/lib/server";
import { currentPlayer } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const ctx = await serverCtx().catch(() => null);
  const c = ctx ? await getChallengePublic(ctx.store, id).catch(() => null) : null;
  const title = c ? `Beat ${c.score.toLocaleString("en-IN")} — ONE MORE challenge` : "ONE MORE challenge";
  // Challenge pages are personal and short-lived: shareable, but kept out of search indexes.
  return { title: { absolute: title }, description: "Same arena, sixty seconds. Can you beat this score?", robots: { index: false, follow: true }, openGraph: { title, description: "Same arena, sixty seconds. Can you beat this score?" } };
}

export default async function ChallengePage({ params }: Params) {
  const { id } = await params;
  const ctx = await serverCtx();
  const challenge = await getChallengePublic(ctx.store, id);
  if (!challenge) notFound();
  const signupId = await currentPlayer(ctx);
  const player = signupId ? await getPlayer(ctx.store, signupId) : null;
  return (
    <section className="section" style={{ paddingTop: "2rem" }}>
      <div className="container">
        <h1 className="sr-only">ONE MORE friend challenge</h1>
        <PlayClient
          look={player ? ownershipOf(player).equipped : null} owned={player ? ownershipOf(player).owned : []}
          player={player ? { displayName: player.displayName, bestScore: player.bestScore, streak: currentStreak(player, dayKey()) } : null}
          challenge={{ id, score: challenge.score, by: challenge.displayName, referralCode: challenge.referralCode, hasGhost: challenge.hasGhost, twist: challenge.twist }}
        />
      </div>
    </section>
  );
}
