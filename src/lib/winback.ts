import { C } from "./store/types";
import { getMailer } from "./mailer";
import { site } from "./site";
import { unsubscribeUrl, type Ctx, type Signup } from "./early-access";
import { dailyTwist, dayKey, twistInfo, type Player } from "./game-service";

/**
 * Win-back: a short, respectful email sequence for players who stopped playing. Sent only to people who opted in to
 * updates (and never unsubscribed), at most once per stage per lapse, and capped per run to stay inside the free
 * email quota. Playing again resets the sequence. Runs once a day (GitHub Actions or Vercel Cron; see docs).
 */
export const WINBACK_STAGES = [
  { stage: 1, afterDays: 3 },
  { stage: 2, afterDays: 7 },
  { stage: 3, afterDays: 21 },
] as const;

export interface WinbackState { stage: number; lapse: string }

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function winbackEmail(stage: number, p: { name: string | null; best: number; streak: number; twist: { name: string; description: string } }, unsub: string) {
  const play = `${site.url}/play?utm_source=email&utm_medium=winback&utm_campaign=s${stage}`;
  const battle = `${site.url}/battle?utm_source=email&utm_medium=winback&utm_campaign=s${stage}`;
  const hi = p.name ? `Hi ${p.name},` : "Hi,";
  const best = p.best > 0 ? `Your best is ${p.best.toLocaleString("en-IN")}.` : "";
  const copy = stage === 1
    ? { subject: `Today's arena: ${p.twist.name}`, lines: [hi, `Today's Daily Arena twist is ${p.twist.name}: ${p.twist.description}`, `${best} One 60-second run is all it takes to get back on the board.`], cta: ["Play today's arena", play] }
    : stage === 2
      ? { subject: "New in ONE MORE: one-tap Battle vs AI", lines: [hi, "Battle now has a Quick match: 1v1 against an AI rival with 90-second rounds. You defend, then you attack. It takes about four minutes.", `${best} The weekly leaderboard resets every Monday, so there's always a fresh shot at the podium.`], cta: ["Try a Quick match", battle] }
      : { subject: "We'll stop reminding you", lines: [hi, "This is our last reminder. We won't email you about playing again unless you come back.", `${best} If you ever want one more run, the arena is still there, still free, still 60 seconds.`], cta: ["One more run", play] };
  const text = `${copy.lines.join("\n\n")}\n\n${copy.cta[0]}: ${copy.cta[1]}\n\nStop these emails: ${unsub}`;
  const html = `<!doctype html><html><body style="margin:0;background:#0b1020;font-family:Arial,Helvetica,sans-serif;color:#e8ecf6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#121a33;border-radius:16px;padding:32px"><tr><td>
<p style="margin:0 0 24px;font-weight:700;letter-spacing:.12em;color:#3ee6f0">ONE MORE</p>
${copy.lines.map((l) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${esc(l)}</p>`).join("")}
<p style="margin:24px 0"><a href="${esc(copy.cta[1])}" style="display:inline-block;background:#3ee6f0;color:#06101f;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px">${esc(copy.cta[0])}</a></p>
<p style="margin:32px 0 0;font-size:12px;line-height:1.6;color:#8b94b3">You get this because you opted in to ONE MORE updates. <a href="${esc(unsub)}" style="color:#8b94b3">Unsubscribe</a> in one click.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject: copy.subject, text, html };
}

export interface WinbackReport { checked: number; sent: number; skipped: number; failed: number; capped: boolean }

export async function runWinback(ctx: Ctx, cap = 80): Promise<WinbackReport> {
  const now = ctx.now ?? Date.now();
  const today = dayKey(now);
  const twist = twistInfo(dailyTwist(today));
  const report: WinbackReport = { checked: 0, sent: 0, skipped: 0, failed: 0, capped: false };
  // Most recent lapses first: a 3-day-away player is the easiest to win back.
  for (const { stage, afterDays } of WINBACK_STAGES) {
    const lapse = dayKey(now - afterDays * 864e5);
    const rows = await ctx.store.query<Player>(C.players, { where: [["lastDay", lapse]], limit: 300 });
    for (const row of rows) {
      report.checked++;
      if (report.sent >= cap) { report.capped = true; return report; }
      const id = row.id;
      // Claim the stage first (at-most-once): a crash after this never causes a duplicate email.
      const claimed = await ctx.store.transaction(async (tx) => {
        const p = await tx.get<Player>(C.players, id);
        const s = await tx.get<Signup>(C.signups, id);
        const wb = p?.winback as WinbackState | undefined;
        if (!p || p.lastDay !== lapse || p.leaderboardBanned) return null;
        if (wb && wb.lapse === lapse && wb.stage >= stage) return null;
        if (!s || s.status !== "verified" || !s.updatesConsent || s.unsubscribed) return null;
        tx.update(C.players, id, { winback: { stage, lapse } satisfies WinbackState });
        return { p, s };
      });
      if (!claimed) { report.skipped++; continue; }
      const mail = winbackEmail(stage, { name: claimed.p.displayName, best: claimed.p.bestScore, streak: (claimed.p.streak as number | undefined) ?? 0, twist }, unsubscribeUrl(ctx.secret, id));
      const r = await getMailer().send({ to: claimed.s.email, ...mail, idempotencyKey: `winback_${id}_${lapse}_${stage}`, unsubscribeUrl: unsubscribeUrl(ctx.secret, id) });
      if (r.ok) report.sent++; else report.failed++;
    }
  }
  return report;
}
