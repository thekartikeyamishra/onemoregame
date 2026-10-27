"use client";

import type { PublicRoom } from "@/lib/battle-types";

/** Seat tokens live only in this browser (localStorage, so a refresh or a dropped connection keeps your seat). */
const KEY = "om_battle_seats";
type Seats = Record<string, { token: string; id: string; at: number }>;

function readSeats(): Seats {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Seats; } catch { return {}; }
}
export function getSeat(code: string) { return readSeats()[code] ?? null; }
export function saveSeat(code: string, token: string, id: string) {
  try {
    const s = readSeats();
    s[code] = { token, id, at: Date.now() };
    // Keep the 10 most recent rooms.
    const keep = Object.entries(s).sort((a, b) => b[1].at - a[1].at).slice(0, 10);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(keep)));
  } catch { /* storage blocked: the seat lasts for this page only */ }
}
export function dropSeat(code: string) {
  try { const s = readSeats(); delete s[code]; localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
export function lastName(): string {
  try { return localStorage.getItem("om_battle_name") ?? ""; } catch { return ""; }
}
export function rememberName(n: string) {
  try { localStorage.setItem("om_battle_name", n); } catch { /* ignore */ }
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

export async function api<T>(path: string, body: unknown, token?: string | null): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { "x-battle-token": token } : {}) },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: data as T } : { ok: false, error: (data as { error?: string }).error ?? "Something went wrong.", status: res.status };
  } catch {
    return { ok: false, error: "Connection problem. Retrying…", status: 0 };
  }
}

export type JoinResult = { code: string; token: string; playerId: string; room: PublicRoom };
