/**
 * Self-service account deletion (required by Google Play and the App Store for apps that let people create
 * accounts, and offered on the web too). Two ways in:
 * 1. Signed in (web or app): confirm on /account and the account is deleted immediately.
 * 2. Signed out: enter your email on /account/delete; we email a one-time link (60 min) that confirms deletion.
 * Responses never reveal whether an email has an account.
 */
import { randomToken, safeEqual, sha256 } from "./crypto";
import { deleteAccountById, signupIdFor, type Ctx, type Signup } from "./early-access";
import { deleteAccountEmail } from "./emails";
import { getMailer } from "./mailer";
import { site } from "./site";
import { C } from "./store/types";
import { splitToken } from "./validation";

const DELETE_TTL_MS = 60 * 60 * 1000;

export async function requestAccountDeletion(ctx: Ctx, email: string): Promise<void> {
  const now = ctx.now ?? Date.now();
  const signupId = signupIdFor(ctx.secret, email);
  const s = await ctx.store.get<Signup>(C.signups, signupId);
  if (!s) return; // same response either way
  const id = randomToken(12), secret = randomToken(24);
  await ctx.store.transaction(async (tx) => {
    tx.create(C.loginTokens, id, { signupId, purpose: "delete", tokenHash: sha256(secret), expiresAt: now + DELETE_TTL_MS, usedAt: null, expireAt: new Date(now + DELETE_TTL_MS + 3600e3) });
  });
  const mail = deleteAccountEmail(`${site.url}/account/delete?token=${id}.${secret}`);
  await getMailer().send({ to: s.email as string, ...mail, idempotencyKey: `delete_${id}` });
}

/** Checks a deletion link without using it (to show the confirmation page). */
export async function checkDeletionToken(ctx: Ctx, token: unknown): Promise<boolean> {
  const parts = splitToken(token);
  if (!parts) return false;
  const t = await ctx.store.get<{ purpose?: string; tokenHash: string; expiresAt: number; usedAt: number | null }>(C.loginTokens, parts.id);
  return !!t && t.purpose === "delete" && !t.usedAt && (ctx.now ?? Date.now()) <= t.expiresAt && safeEqual(sha256(parts.secret), t.tokenHash);
}

/** Uses a deletion link and erases the account. Returns false for an invalid, used or expired link. */
export async function confirmAccountDeletion(ctx: Ctx, token: unknown): Promise<boolean> {
  const parts = splitToken(token);
  if (!parts) return false;
  const now = ctx.now ?? Date.now();
  const signupId = await ctx.store.transaction(async (tx) => {
    const t = await tx.get<{ signupId: string; purpose?: string; tokenHash: string; expiresAt: number; usedAt: number | null }>(C.loginTokens, parts.id);
    if (!t || t.purpose !== "delete" || t.usedAt || now > t.expiresAt || !safeEqual(sha256(parts.secret), t.tokenHash)) return null;
    tx.update(C.loginTokens, parts.id, { usedAt: now });
    return t.signupId;
  });
  if (!signupId) return false;
  await deleteAccountById(ctx, signupId);
  return true;
}
