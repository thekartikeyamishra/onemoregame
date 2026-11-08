"use client";

import { useState } from "react";
import { api, getSeat } from "./net";

const KEY = "om_battle_hidden";
export function readHidden(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]); } catch { return new Set(); }
}
function saveHidden(s: Set<string>) {
  try { localStorage.setItem(KEY, JSON.stringify([...s].slice(-200))); } catch { /* ignore */ }
}

/** Report a player and hide their name on this device (App Store / Play user-generated-content requirements). */
export function ReportButton({ code, playerId, name, onHidden }: { code: string; playerId: string; name: string; onHidden: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("name");
  const [msg, setMsg] = useState<string | null>(null);
  if (!open) return <button type="button" className="chip-x report-btn" aria-label={`Report or hide ${name}`} title="Report or hide" onClick={() => setOpen(true)}>⚑</button>;
  return (
    <div className="report-pop" role="dialog" aria-label={`Report ${name}`}>
      {msg ? <p className="small" role="status">{msg}</p> : (
        <>
          <label className="small" htmlFor={`rr-${playerId}`}>Report {name} for</label>
          <select id={`rr-${playerId}`} className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="name">Offensive name</option>
            <option value="behaviour">Abusive behaviour</option>
            <option value="cheating">Cheating</option>
            <option value="other">Something else</option>
          </select>
          <div className="btn-row">
            <button type="button" className="btn btn--sm btn--primary" onClick={async () => {
              const seat = getSeat(code);
              const r = await api(`/api/battle/${code}`, { action: "report", playerId, reason }, seat?.token);
              const hidden = readHidden(); hidden.add(playerId); saveHidden(hidden); onHidden();
              setMsg(r.ok ? "Thanks. We review reports within 24 hours. Their name is hidden on your screen." : `${r.error} Their name is hidden on your screen.`);
            }}>Report & hide</button>
            <button type="button" className="btn btn--sm" onClick={() => { const h = readHidden(); h.add(playerId); saveHidden(h); onHidden(); setOpen(false); }}>Just hide</button>
            <button type="button" className="btn btn--sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </>
      )}
    </div>
  );
}
