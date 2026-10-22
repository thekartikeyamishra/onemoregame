import { ImageResponse } from "next/og";
import { getChallengePublic } from "@/lib/game-service";
import { serverCtx } from "@/lib/server";

export const alt = "ONE MORE friend challenge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Per-challenge preview so links look like a dare in WhatsApp, Instagram DMs and X. Reveals score and name only. */
export default async function ChallengeImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let score: number | null = null, by: string | null = null;
  try {
    const c = await getChallengePublic((await serverCtx()).store, id);
    if (c) { score = c.score; by = c.displayName; }
  } catch { /* fall back to a generic card */ }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0f1f", color: "#eef1fa", padding: 72, fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ position: "absolute", right: -120, bottom: -160, width: 620, height: 620, borderRadius: 9999, border: "4px solid rgba(62,230,240,0.45)", display: "flex" }} />
        <div style={{ position: "absolute", right: 200, bottom: 120, width: 46, height: 46, background: "#ffbf47", transform: "rotate(45deg)", display: "flex" }} />
        <div style={{ position: "absolute", right: 330, bottom: 300, width: 60, height: 60, border: "5px solid #8b7bff", display: "flex" }} />
        <div style={{ display: "flex", fontSize: 32, letterSpacing: 8, color: "#3ee6f0", fontWeight: 700 }}>ONE MORE · CHALLENGE</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 44, color: "#a9b2cf" }}>{by ? `${by} scored` : "Your friend scored"}</div>
          <div style={{ display: "flex", fontSize: 180, fontWeight: 800, color: "#ffbf47", lineHeight: 1 }}>{score !== null ? score.toLocaleString("en-IN") : "???"}</div>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 700, marginTop: 18 }}>Same arena. 60 seconds. Beat it.</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#a9b2cf" }}>Free in your browser · no sign-up to try</div>
      </div>
    ),
    size,
  );
}
