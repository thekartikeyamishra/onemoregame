import { FieldValue } from "firebase-admin/firestore";
import { chatSchema } from "@/lib/validation";
import { aiEnabled, askModel, cleanReply } from "@/lib/server/ai";
import { getDb } from "@/lib/server/firebase";
import { cacheGet, cacheSet, ipHash, json, rateLimit, sameOrigin, sha256 } from "@/lib/server/guard";

export const runtime = "nodejs";

const DAILY_CAP = Number(process.env.AI_DAILY_CAP || 300);
const today = () => new Date().toISOString().slice(0, 10);
const normalize = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

// Obvious injection / abuse attempts never reach the model.
const BLOCKED = /(ignore (all|previous|prior) instructions|system prompt|jailbreak|developer mode|you are now|act as (a|an) )/i;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Forbidden" }, 403);
  const ip = ipHash(req);

  const burst = await rateLimit(`chat-burst:${ip}`, 8, 60);
  const daily = await rateLimit(`chat-day:${ip}:${today()}`, 40, 86_400);
  if (!burst.ok || !daily.ok) return json({ source: "limit" }, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) return json({ source: "fallback" });
  const { lang } = parsed.data;
  const turns = parsed.data.messages.slice(-6);
  const question = turns.at(-1)!;
  if (question.role !== "user") return json({ source: "fallback" });
  if (BLOCKED.test(question.content)) return json({ reply: null, source: "fallback", mood: "wink" });

  const qNorm = normalize(question.content);
  const cacheKey = `ans:${lang}:${sha256(qNorm).slice(0, 40)}`;

  // Moat: every unanswered question is counted (text only, no identity) so the
  // most common ones become free scripted answers in lib/mitra/knowledge.ts.
  const db = getDb();
  if (db && qNorm.length >= 4) {
    db.collection("mitra_questions")
      .doc(sha256(qNorm).slice(0, 40))
      .set({ text: qNorm.slice(0, 300), lang, count: FieldValue.increment(1), lastAt: FieldValue.serverTimestamp() }, { merge: true })
      .catch(() => {});
  }

  // Only single-question conversations are cache-safe (no hidden context).
  const cacheable = turns.length === 1;
  if (cacheable) {
    const hit = await cacheGet(cacheKey);
    if (hit) return json({ ...(JSON.parse(hit) as object), source: "cache" });
  }

  if (!aiEnabled()) return json({ source: "fallback" });
  const budget = await rateLimit(`ai-global:${today()}`, DAILY_CAP, 86_400);
  if (!budget.ok) return json({ source: "fallback" });

  const raw = await askModel(turns, lang);
  if (!raw) return json({ source: "fallback" });
  const answer = cleanReply(raw);
  if (cacheable) await cacheSet(cacheKey, JSON.stringify(answer), 7 * 86_400);
  return json({ ...answer, source: "ai" });
}
