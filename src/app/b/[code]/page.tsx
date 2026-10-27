import type { Metadata } from "next";
import { BattleRoomClient } from "@/components/battle/BattleRoomClient";
import { normalizeCode, roomPreview } from "@/lib/battle-service";
import { serverCtx } from "@/lib/server";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ code: string }> };

async function preview(raw: string) {
  try { return await roomPreview(await serverCtx(), raw); } catch { return null; }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const p = await preview(code);
  const title = p?.host ? `${p.host} invited you to a ONE MORE Battle` : "ONE MORE Battle invite";
  const description = "Team up or face off: attackers vs defenders, 3- or 5-minute rounds. Free, no sign-up, works on any phone.";
  return { title: { absolute: title }, description, robots: { index: false, follow: false }, openGraph: { title, description } };
}

export default async function BattleRoomPage({ params }: Params) {
  const { code: raw } = await params;
  const code = normalizeCode(raw) ?? raw.toUpperCase().slice(0, 6);
  const p = normalizeCode(raw) ? await preview(code) : null;
  return (
    <section className="section" style={{ paddingTop: "1.25rem" }}>
      <div className="container">
        <h1 className="sr-only">ONE MORE Battle room {code}</h1>
        <BattleRoomClient code={code} preview={p ? { status: p.status, host: p.host, players: p.players } : null} />
      </div>
    </section>
  );
}
