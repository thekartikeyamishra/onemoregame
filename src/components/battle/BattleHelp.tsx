"use client";

import { useEffect, useRef, useState } from "react";
import { ATTACK_ABILITIES, DEFENDER_ABILITIES, DEFENDER_ENERGY, DEFENDER_LEVELS, TEAMS, TIEBREAK_SECONDS, attackCost } from "@/game/battle/config";

type Tab = "rules" | "defend" | "attack" | "controls";
const TABS: Array<[Tab, string]> = [["rules", "Rules"], ["defend", "Defender powers"], ["attack", "Attacker powers"], ["controls", "Controls"]];

/**
 * Small "?" button that opens the Battle rulebook. Opens on the tab that matches your current role.
 * The match keeps running while it's open (it's multiplayer), so it says so.
 */
export function BattleHelp({ role = "rules", live = false }: { role?: "defend" | "attack" | "rules"; live?: boolean }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("rules");
  const dialogRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape" && open) { setOpen(false); buttonRef.current?.focus(); }
      else if ((e.key === "?" || e.key === "h" || e.key === "H") && !e.ctrlKey && !e.metaKey) { setTab(role === "rules" ? "rules" : role); setOpen((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, role]);
  useEffect(() => { if (open) dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus(); }, [open, tab]);

  const close = () => { setOpen(false); buttonRef.current?.focus(); };

  return (
    <>
      <button ref={buttonRef} type="button" className="help-btn" aria-haspopup="dialog" aria-expanded={open} aria-label="How Battle works (H)" title="How Battle works (H)"
        onClick={() => { setTab(role === "rules" ? "rules" : role); setOpen(true); }}>?</button>
      {open ? (
        <div className="help-backdrop" onClick={close}>
          <div ref={dialogRef} className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={(e) => e.stopPropagation()}>
            <div className="help-head">
              <h2 id="help-title">How Battle works</h2>
              <button type="button" className="chip-x" aria-label="Close help" onClick={close} data-autofocus>×</button>
            </div>
            {live ? <p className="small help-live">The match keeps running while this is open.</p> : null}
            <div className="mode-tabs help-tabs" role="tablist" aria-label="Help topics">
              {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className="btn btn--sm" onClick={() => setTab(id)}>{label}</button>)}
            </div>
            <div className="help-body" role="tabpanel">
              {tab === "rules" ? (
                <>
                  <ul>
                    <li><b>Two rounds.</b> Round 1: <b style={{ color: TEAMS.A.color }}>{TEAMS.A.name}</b> defends, <b style={{ color: TEAMS.B.color }}>{TEAMS.B.name}</b> attacks. Round 2: swap.</li>
                    <li><b>Defenders</b> collect amber shards. Chaining shards quickly builds a combo (up to ×9).</li>
                    <li><b>Attackers</b> watch every defender live and sabotage them, one player at a time or the whole team.</li>
                    <li><b>Winner:</b> the higher <b>average</b> defending score per defender, so uneven teams stay fair.</li>
                    <li><b>Tie?</b> A {TIEBREAK_SECONDS}-second Sudden Surge: both teams collect while the arena attacks everyone.</li>
                    <li><b>Knock-down (KO):</b> touching a hazard costs your combo and a 1-second respawn at the centre. The clock never stops.</li>
                    <li><b>Fair warning:</b> every attack shows up on the defender&apos;s screen 3 seconds before it lands. Dodge it, dash through it, or Purge it.</li>
                    <li><b>Dropped connection?</b> Your moves are saved; after 8 seconds offline the AI finishes the round for you.</li>
                    <li>Every result is verified by the server replaying everyone&apos;s inputs.</li>
                  </ul>
                </>
              ) : tab === "defend" ? (
                <>
                  <p className="small">Energy refills by 1 every 1.5 s (max {DEFENDER_ENERGY.max}). Each power has a 5 s cooldown. Level 2 at {DEFENDER_LEVELS[1].toLocaleString("en-IN")} points, level 3 at {DEFENDER_LEVELS[2].toLocaleString("en-IN")}.</p>
                  <table className="help-table"><tbody>
                    {DEFENDER_ABILITIES.map((a, i) => (
                      <tr key={a.id}><td className="help-icon">{a.icon}</td><td><b>{a.name}</b> <kbd>{i + 1}</kbd><br /><span className="small muted">{a.blurb}</span></td><td className="help-cost">{a.cost}⚡{a.level > 1 ? <><br /><small>LV{a.level}</small></> : null}</td></tr>
                    ))}
                  </tbody></table>
                  <p className="small"><b>Second Wind</b> (level 2, automatic): once every 15 s, a knock-down doesn&apos;t break a 3+ combo.</p>
                  <p className="small muted">Arena power-ups (hexagons) still appear: Shield, Slow-mo, Magnet and Double. Jam stops you collecting them.</p>
                </>
              ) : tab === "attack" ? (
                <>
                  <p className="small">Pick a power, then tap a defender&apos;s arena. From level 2 you can hit the whole team (costs more). Level 2 after 25% of the round or 5 attacks; level 3 after 60% or 12. Energy refills faster when you&apos;re outnumbered.</p>
                  <table className="help-table"><tbody>
                    {ATTACK_ABILITIES.map((a) => (
                      <tr key={a.id}><td className="help-icon">{a.icon}</td><td><b>{a.name}</b><br /><span className="small muted">{a.blurb}</span></td><td className="help-cost">{a.cost}⚡{a.teamable ? <><br /><small>team {attackCost(a, true)}</small></> : null}{a.level > 1 ? <><br /><small>LV{a.level}</small></> : null}</td></tr>
                    ))}
                  </tbody></table>
                  <p className="small muted">Same power: 3 s cooldown. Hits within 4 s of your attack count as your KOs on the flex board.</p>
                </>
              ) : (
                <ul>
                  <li><b>Steer:</b> WASD / arrow keys, move the mouse, or drag on touch.</li>
                  <li><b>Dash</b> (brief invulnerability): Space, click, double-tap or the Dash button.</li>
                  <li><b>Defender powers:</b> number keys 1–7 or tap the buttons under the arena.</li>
                  <li><b>Attacker:</b> tap a power, then tap a defender (Strike: tap the exact spot for the mine). &ldquo;Whole team&rdquo; button from level 2.</li>
                  <li><b>Sound:</b> 🔊 button at the top. <b>Help:</b> press H or ? any time.</li>
                </ul>
              )}
            </div>
            <p className="small"><a href="/battle#how" target="_blank" rel="noopener">Full Battle guide ↗</a></p>
          </div>
        </div>
      ) : null}
    </>
  );
}
