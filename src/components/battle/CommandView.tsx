"use client";

import { useEffect, useRef, useState } from "react";
import { TPS } from "@/game/engine";
import { ATTACK_ABILITIES, ATTACK_ENERGY, attackCost, type AttackAbility } from "@/game/battle/config";
import type { AttackPlay } from "@/game/battle/sim";
import type { PublicRoom } from "@/lib/battle-types";
import { drawArena, toArena, type Particle } from "./draw";
import { api } from "./net";
import type { BattleWorld } from "./world";
import type { Sfx } from "@/game/audio";
import { haptic } from "@/lib/native";

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
  const gridRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(240);
  // Size the defender panels so all of them fit on screen at once (no scrolling mid-battle, on any device).
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const n = Math.max(1, defenders.length), gap = 8, cap = 30;
    const fit = () => {
      const { width: w, height: h } = el.getBoundingClientRect();
      let best = 80;
      for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        best = Math.max(best, Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows - cap));
      }
      setCell(Math.floor(Math.max(80, best)));
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, [defenders.length]);
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
        if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.width * dpr); }
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
    sfx.launch(); haptic("light");
    world.addMyPlay(r.data.play);
    setToast(`${sel.icon} ${sel.name} → ${target === "*" ? "whole team" : name(target)} · lands in ${Math.round((r.data.landsAt - nowTick()) / TPS)}s`);
  }

  const hint = readOnly ? "You're watching this round." : eco.energy >= ATTACK_ENERGY.max ? "⚡ Energy full: attack now, don't waste it!" : sel?.aimed ? "Tap the exact spot on a defender's arena to drop the mine." : sel?.teamable && eco.level >= 2 ? "Tap one defender, or hit the whole team below." : "Pick a power, then tap a defender. They see it coming 3 s before it lands.";

  return (
    <div className="battle-command">
      <div className="battle-hud">
        <span className="hud-chip">{readOnly ? "Spectating" : `Attacker LV ${eco.level}`}</span>
        {!readOnly ? <span className="battle-energy inline" aria-label={`Energy ${eco.energy}`}>{Array.from({ length: ATTACK_ENERGY.max }, (_, i) => <i key={i} className={i < eco.energy ? "on" : undefined} />)}</span> : null}
      </div>
      <p className="battle-tip battle-tip--inline">{hint}</p>
      <div ref={gridRef} className="battle-grid-fit">
        <div className="battle-grid" style={{ ["--cell" as string]: `${cell}px` }}>
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
      </div>
      {!readOnly ? (
        <div className="battle-controls">
          {toast ? <p className="battle-toast" role="status" key={toast}>{toast}</p> : null}
          <div className="battle-abilities battle-abilities--attack" role="group" aria-label="Sabotage powers">
            {ATTACK_ABILITIES.map((a) => {
              const locked = eco.level < a.level, cd = eco.ready[a.id] ?? 0, cost = attackCost(a, false);
              return (
                <button key={a.id} type="button" className="ability ability--attack" aria-pressed={selected === a.id} data-ready={!locked && cd === 0 && eco.energy >= cost || undefined} disabled={locked} onClick={() => setSelected(a.id)} title={a.blurb} aria-label={`${a.name}: ${a.blurb}`}>
                  <span className="ability-icon" aria-hidden="true">{a.icon}</span>
                  <span className="ability-name">{a.name}</span>
                  <span className="ability-cost">{locked ? `LV${a.level}` : cd > 0 ? `${Math.ceil(cd / TPS)}s` : `${cost}⚡`}</span>
                </button>
              );
            })}
            <button type="button" className="ability ability--team" disabled={busy || !sel || !sel.teamable || eco.level < 2} onClick={() => void fire("*")} title="Hit every defender at once" aria-label={sel?.teamable ? `${sel.name} the whole team for ${attackCost(sel, true)} energy` : "Team attacks unlock at level 2"}>
              <span className="ability-icon" aria-hidden="true">👥</span>
              <span className="ability-name">Whole team</span>
              <span className="ability-cost">{sel?.teamable ? (eco.level < 2 ? "LV2" : `${attackCost(sel, true)}⚡`) : "—"}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
