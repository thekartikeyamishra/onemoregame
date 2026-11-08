"use client";

import { useState } from "react";
import { TEAMS, type TeamId } from "@/game/battle/config";
import { track } from "@/lib/analytics";
import { shareContent } from "@/lib/native";

/** Frictionless invites: one link per team, native share sheet, WhatsApp, copy. Links carry only the room code. */
export function InvitePanel({ code }: { code: string }) {
  const [status, setStatus] = useState("");
  const link = (team?: TeamId) => `${typeof window === "undefined" ? "" : window.location.origin}/b/${code}${team ? `?team=${team}` : ""}`;
  const text = (team?: TeamId) => `Battle me in ONE MORE${team ? ` and join ${TEAMS[team].name}` : ""}: room ${code}. Free, no sign-up, works on your phone.`;
  async function share(team?: TeamId) {
    const url = link(team);
    track("battle_invite_shared", { team: team ?? "any" });
    const how = await shareContent({ title: "ONE MORE Battle", text: text(team), url });
    if (how === "copied") setStatus("Invite copied.");
    else if (how === "failed") setStatus(url);
  }
  return (
    <div className="form-card battle-invite">
      <p className="eyebrow">Invite friends</p>
      <p className="battle-code" aria-label={`Room code ${code.split("").join(" ")}`}>{code}</p>
      <div className="btn-row">
        <button type="button" className="btn btn--primary btn--sm" onClick={() => void share()}>Share invite</button>
        <a className="btn btn--sm" href={`https://wa.me/?text=${encodeURIComponent(`${text()} ${link()}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => track("battle_invite_shared", { via: "whatsapp" })}>WhatsApp</a>
      </div>
      <div className="btn-row">
        {(["A", "B"] as TeamId[]).map((t) => <button key={t} type="button" className="btn btn--sm" style={{ borderColor: TEAMS[t].color }} onClick={() => void share(t)}>Invite to {TEAMS[t].name}</button>)}
      </div>
      <p className="small muted" role="status">{status || "Friends join from any phone or computer with just a gamer tag."}</p>
    </div>
  );
}
