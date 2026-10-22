import "server-only";
import { NextResponse } from "next/server";
import { isSameOrigin } from "./request";

export const noStore = { "Cache-Control": "no-store" };

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(data, { status, headers: { ...noStore, ...headers } });
}

/** Parse a same-origin JSON POST body with a size cap. Returns a Response on failure. */
export async function readJson(req: Request, maxBytes: number): Promise<{ body: Record<string, unknown> } | { error: Response }> {
  if (!isSameOrigin(req.headers)) return { error: json({ error: "Forbidden" }, 403) };
  const raw = await req.text();
  if (raw.length > maxBytes) return { error: json({ error: "Request too large." }, 413) };
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return { body };
  } catch {
    return { error: json({ error: "Invalid request." }, 400) };
  }
}
