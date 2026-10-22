import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_TTL_MS, createSession, resolveSession } from "./game-service";
import type { Ctx } from "./early-access";
import { site } from "./site";

export async function currentPlayer(ctx: Ctx): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return (await resolveSession(ctx, token))?.signupId ?? null;
}

/** Create a session and set the HttpOnly cookie (Server Actions / Route Handlers only). */
export async function signInAs(ctx: Ctx, signupId: string) {
  const { token } = await createSession(ctx, signupId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: site.url.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
