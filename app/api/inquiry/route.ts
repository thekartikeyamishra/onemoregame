import { FieldValue } from "firebase-admin/firestore";
import { site } from "@/lib/site";
import { budgets, firstError, inquirySchema, timelines } from "@/lib/validation";
import { getDb } from "@/lib/server/firebase";
import { esc, layoutEmail, sendEmail } from "@/lib/server/email";
import { canReceiveMail, isDisposable, MIN_HUMAN_MS } from "@/lib/server/fraud";
import { country, ipHash, json, rateLimit, sameOrigin } from "@/lib/server/guard";

export const runtime = "nodejs";

// Links in a first message are the strongest spam signal for contact forms.
const LINK_LIMIT = 3;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  const ip = ipHash(req);
  if (!(await rateLimit(`inquiry:${ip}`, 4, 3600)).ok) {
    return json({ error: "You've sent several messages already. Please wait an hour, or email directly." }, 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) return json({ error: firstError(parsed.error) }, 422);
  const d = parsed.data;

  if (d.hp || (d.t !== undefined && d.t < MIN_HUMAN_MS)) return json({ ok: true });
  if ((d.message.match(/https?:\/\//g) ?? []).length > LINK_LIMIT) {
    return json({ error: `Please include no more than ${LINK_LIMIT} links.` }, 422);
  }
  if (isDisposable(d.email) || !(await canReceiveMail(d.email))) {
    return json({ error: "Please use an email address I can reply to." }, 422);
  }

  const budget = budgets.find((b) => b.id === d.budget)?.label ?? "—";
  const timeline = timelines.find((t) => t.id === d.timeline)?.label ?? "—";

  const db = getDb();
  try {
    if (db) {
      await db.collection("inquiries").add({
        ...d,
        hp: undefined,
        t: undefined,
        status: "new",
        country: country(req),
        ipHash: ip,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else if (process.env.NODE_ENV === "production" && !process.env.RESEND_API_KEY) {
      return json({ error: `The form is offline right now. Please email ${site.email}.` }, 503);
    }

    await sendEmail({
      to: process.env.INQUIRY_NOTIFY_EMAIL || site.email,
      replyTo: d.email,
      subject: `${d.kind === "project" ? "Project inquiry" : "Message"} from ${d.name}`,
      text: `${d.name} <${d.email}>\nCompany: ${d.company ?? "—"}\nBudget: ${budget}\nTimeline: ${timeline}\n\n${d.message}`,
      html: layoutEmail(
        `${d.kind === "project" ? "New project inquiry" : "New message"}`,
        `<b>${esc(d.name)}</b> &lt;${esc(d.email)}&gt;<br>Company: ${esc(d.company ?? "—")}<br>Budget: ${esc(budget)}<br>Timeline: ${esc(timeline)}<br><br>${esc(d.message).replace(/\n/g, "<br>")}`
      ),
    });
    return json({ ok: true });
  } catch (e) {
    console.error("[inquiry] failed", e);
    return json({ error: `Something went wrong. Please email ${site.email} instead.` }, 500);
  }
}
