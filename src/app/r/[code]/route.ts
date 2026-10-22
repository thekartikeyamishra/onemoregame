import { NextResponse } from "next/server";
import { site } from "@/lib/site";
import { referralCodeSchema } from "@/lib/validation";

/** Opaque referral entry point: forwards to the public early-access page. Reveals nothing about the referrer. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const target = new URL("/early-access", site.url);
  if (referralCodeSchema.safeParse(code).success) target.searchParams.set("ref", code);
  target.hash = "request";
  return NextResponse.redirect(target, { status: 307, headers: { "X-Robots-Tag": "noindex", "Cache-Control": "no-store" } });
}
