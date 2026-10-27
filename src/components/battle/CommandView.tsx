"use client";

import { useEffect, useRef, useState } from "react";
import { TPS } from "@/game/engine";
import { ATTACK_ABILITIES, ATTACK_ENERGY, attackCost, type AttackAbility } from "@/game/battle/config";
import type { AttackPlay } from "@/game/battle/sim";
import type { PublicRoom } from "@/lib/battle-types";
import { drawArena, fmtClock, toArena, type Particle } from "./draw";
import { api } from "./net";
import type { BattleWorld } from "./world";
import type { Sfx } from "@/game/audio";

/** Attacker (or spectator) view: every defender's arena, live, with one-tap sabotage. */
export function CommandView({ world, room, nowTick, code, token, onError, sfx, readOnly = false }: {
  world: BattleWorld; room: PublicRoom; nowTick: () => number; code: string; token: string; onError: (e: string | null) => void; sfx: Sfx; readOnly?: boolean;
}) {
  const defenders = world.spec.defenders;
  const canvases = useRef<Array<HTMLCanvasElement | null>>([]);
  const [selected, setSelected] = useState<AttackAbility | null>(readOnly ? null : "strike");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, force] = useState(0);
  const aimRef = useRef<{ id: string; x: number; y: number; until: number } | null>(null);
  const players = room.players;
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "?";

  useEffect(() => {
    const parts = defenders.map(() => [] as Particle[]);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const frame = () => {
      const t = nowTick();
      world.advance(t);
      defenders.forEach((d, i) => {
        const cv = canvases.current[i], run = world.runs.get(d.id);
        if (!cv || !run) return;
        const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
        if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.width * dpr); }
        const ctx = cv.getContext("2d")!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const aim = aimRef.current && aimRef.current.id === d.id && aimRef.current.until > performance.now() ? aimRef.current : null;
        drawArena(ctx, run, r.width, r.width, { color: players.find((p) => p.id === d.id)?.color ?? "#fff", total: world.total, nowTick: Math.max(0, t), incoming: world.incoming(d.id, t), compact: true, reduced, aim, onFx: (k) => { if (k === "hit") sfx.koFar(); } }, parts[i]);
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const id = setInterval(() => force((n) => n + 1), 200);
    return () => { cancelAnimationFrame(raf); clearInterval(id); };
  }, [world, nowTick, defenders, players, sfx]);

  const t = nowTick();
  const eco = world.attackerEconomy(t);
  const sel = selected ? ATTACK_ABILITIES.find((a) => a.id === selected)! : null;

  async function fire(target: string, at?: { x: number; y: number }) {
    if (!sel || busy || readOnly) return;
    setBusy(true); onError(null);
    const r = await api<{ ok: true; play: AttackPlay; landsAt: number }>(`/api/battle/${code}`, { action: "attack", a: ATTACK_ABILITIES.indexOf(sel), t: target, ...(at ? { x: Math.round(at.x), y: Math.round(at.y) } : {}) }, token);
    setBusy(false);
    if (!r.ok) { setToast(r.error); sfx.fizzle(); return; }
    sfx.launch();
    world.addMyPlay(r.data.play);
    setToast(`${sel.icon} ${sel.name} → ${target === "*" ? "whole team" : name(target)} · lands in ${Math.round((r.data.landsAt - nowTick()) / TPS)}s`);
  }

  return (
    <div className="battle-command">
      <div className="battle-hud">
        <span className="hud-chip">{readOnly ? "Spectating" : `Attacker LV ${eco.level}`}</span>
        {!readOnly ? <span className="battle-energy inline" aria-label={`Energy ${eco.energy}`}>{Array.from({ length: ATTACK_ENERGY.max }, (_, i) => <i key={i} className={i < eco.energy ? "on" : undefined} />)}</span> : null}
        <span className="hud-time">{fmtClock(world.total - Math.max(0, t))}</span>
      </div>
      {!readOnly ? (
        <p className="small muted battle-help">{sel?.aimed ? "Tap exactly where to drop the mine on a defender's arena." : sel?.teamable && eco.level >= 2 ? "Tap a defender, or hit the whole team." : "Pick an ability, then tap a defender."} Attacks land 3 s later and defenders see them coming.</p>
      ) : null}
      <div className={`battle-grid n${Math.min(defenders.length, 5)}`}>
        {defenders.map((d, i) => {
          const run = world.runs.get(d.id), p = players.find((x) => x.id === d.id);
          return (
            <figure key={d.id} className="battle-panel" style={{ ["--pc" as string]: p?.color }}>
              <figcaption><i />{p?.name}<b>{(run?.state.score ?? 0).toLocaleString("en-IN")}</b><small>KO {run?.state.hits ?? 0}</small></figcaption>
              <canvas
                ref={(el) => { canvases.current[i] = el; }}
                className="battle-mini"
                aria-label={`${p?.name}'s arena${readOnly ? "" : ". Tap to attack."}`}
                onClick={(e) => {
                  if (!sel || readOnly) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  if (sel.aimed) {
                    const pt = toArena(e.clientX - r.left, e.clientY - r.top, r.width, r.width, true);
                    if (pt.x * pt.x + pt.y * pt.y > 290 * 290) return;
                    aimRef.current = { id: d.id, x: pt.x, y: pt.y, until: performance.now() + 1200 };
                    void fire(d.id, pt);
                  } else void fire(d.id);
                }}
              />
            </figure>
          );
        })}
      </div>
      {!readOnly ? (
        <>
          <div className="battle-abilities" role="group" aria-label="Sabotage">
            {ATTACK_ABILITIES.map((a) => {
              const locked = eco.level < a.level, cd = eco.ready[a.id] ?? 0, cost = attackCost(a, false);
              return (
                <button key={a.id} type="button" className="ability ability--attack" aria-pressed={selected === a.id} data-ready={!locked && cd === 0 && eco.energy >= cost || undefined} disabled={locked} onClick={() => setSelected(a.id)} title={a.blurb}>
                  <span className="ability-icon" aria-hidden="true">{a.icon}</span>
                  <span className="ability-name">{a.name}</span>
                  <span className="ability-cost">{locked ? `LV${a.level}` : cd > 0 ? `${Math.ceil(cd / TPS)}s` : `${cost}⚡${a.teamable ? ` · team ${attackCost(a, true)}` : ""}`}</span>
                </button>
              );
            })}
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn--primary" disabled={busy || !sel || !sel.teamable || eco.level < 2} onClick={() => void fire("*")}>
              {sel?.teamable ? `${sel.icon} ${sel.name} the whole team (${attackCost(sel, true)}⚡)` : "Team attacks unlock at level 2"}
            </button>
          </div>
          {toast ? <p className="battle-toast" role="status" key={toast}>{toast}</p> : null}
        </>
      ) : null}
    </div>
  );
}
