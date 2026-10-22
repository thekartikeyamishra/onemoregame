import { NextResponse } from "next/server";
import { createCampusLead } from "@/lib/early-access";
import { limits } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/request";
import { allow, logError, serverCtx } from "@/lib/server";
import { campusInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  if (!isSameOrigin(req.headers)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  const raw = await req.text();
  if (raw.length > 8192) return NextResponse.json({ error: "Request too large." }, { status: 413, headers: noStore });
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: noStore }); }

  const parsed = campusInputSchema.safeParse(json);
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return NextResponse.json({ ok: true }, { status: 202, headers: noStore });
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0]);
      errors[k] ??= k === "email" ? "Enter a valid email address." : i.message.length < 80 ? i.message : "Check this field.";
    }
    return NextResponse.json({ error: "Please fix the highlighted fields.", errors }, { status: 400, headers: noStore });
  }
  try {
    const ctx = await serverCtx();
    if (!(await allow(ctx, limits.campusPerIp, req.headers))) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: noStore });
    }
    await createCampusLead(ctx, parsed.data, ctx.ownerEmail);
    return NextResponse.json({ ok: true }, { status: 202, headers: noStore });
  } catch (e) {
    logError("campus", e);
    return NextResponse.json({ error: "We couldn't save your note right now. Please try again shortly." }, { status: 503, headers: noStore });
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
}
