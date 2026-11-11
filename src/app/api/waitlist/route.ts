import { NextResponse } from "next/server";
import { requestAccess } from "@/lib/early-access";
import { limits } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/request";
import { allow, logError, serverCtx } from "@/lib/server";
import { AlreadyExistsError } from "@/lib/store/types";
import { waitlistInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const accepted = () => NextResponse.json({ ok: true }, { status: 202, headers: noStore });

export async function POST(req: Request) {
  if (!isSameOrigin(req.headers)) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported content type." }, { status: 415, headers: noStore });
  }
  const raw = await req.text();
  if (raw.length > 4096) return NextResponse.json({ error: "Request too large." }, { status: 413, headers: noStore });
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: noStore }); }

  const parsed = waitlistInputSchema.safeParse(json);
  if (!parsed.success) {
    const honeypot = parsed.error.issues.some((i) => i.path[0] === "website");
    if (honeypot) return accepted(); // don't tell bots they were caught
    const emailIssue = parsed.error.issues.some((i) => i.path[0] === "email");
    const ageIssue = parsed.error.issues.some((i) => i.path[0] === "ageConfirmed");
    return NextResponse.json(
      emailIssue
        ? { error: "Enter a valid email address.", field: "email" }
        : ageIssue
          ? { error: "Please confirm the age statement to continue.", field: "age" }
          : { error: "Please check the form and try again." },
      { status: 400, headers: noStore },
    );
  }

  try {
    const ctx = await serverCtx();
    if (!(await allow(ctx, limits.waitlistPerIp, req.headers))) {
      return NextResponse.json({ error: "Too many requests. Please wait a while and try again." }, { status: 429, headers: { ...noStore, "Retry-After": "3600" } });
    }
    const r = await requestAccess(ctx, parsed.data);
    // A real delivery failure is our problem, not the user's: say so instead of "check your inbox" for an email that
    // never left. (Same wording for every address, so this reveals nothing about who has an account.)
    if (!r.emailAccepted && (r.outcome === "created" || r.outcome === "resent" || r.outcome === "signin")) {
      return NextResponse.json({ error: "We couldn't send the email right now. Please try again in a few minutes." }, { status: 503, headers: noStore });
    }
    if (r.outcome === "cooldown" || r.outcome === "noop") return NextResponse.json({ ok: true, recent: true }, { status: 202, headers: noStore });
    return accepted(); // identical response for new, existing and verified addresses (no enumeration)
  } catch (e) {
    if (e instanceof AlreadyExistsError) return accepted(); // concurrent duplicate submit
    logError("waitlist", e);
    return NextResponse.json({ error: "We couldn't save your request right now. Please try again shortly." }, { status: 503, headers: noStore });
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
}
