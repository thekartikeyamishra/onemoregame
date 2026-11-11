import { hmac, randomCode, randomToken, safeEqual, sha256 } from "./crypto";
import { invitationEmail, ownerCampusNotification, verificationEmail } from "./emails";
import { getMailer, type MailMessage } from "./mailer";
import { site } from "./site";
import { C, type Store } from "./store/types";
import { referralCodeSchema, splitToken, type Audience, type CampusInput, type WaitlistInput } from "./validation";

export const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 10 * 60 * 1000;
export const MAX_VERIFY_SENDS = 5;
export const INVITE_TTL_DAYS = 14;
/** Unconfirmed requests are deleted by a Firestore TTL policy on `purgeAt`. */
export const PENDING_RETENTION_MS = 90 * 864e5;
const OUTBOX_RETENTION_MS = 90 * 864e5;

export interface Signup extends Record<string, unknown> {
  email: string;
  audience: Audience;
  status: "pending" | "verified";
  updatesConsent: boolean;
  consentChangedAt: number;
  createdAt: number;
  verifiedAt: number | null;
  verifyTokenHash: string;
  verifyExpiresAt: number;
  verifySends: number;
  lastVerifySentAt: number;
  referredByCode: string | null;
  source: string | null;
  referralCode: string | null;
  verifiedReferrals: number;
  inviteState: "none" | "issued" | "accepted";
  inviteId: string | null;
  inviteAcceptedAt: number | null;
  unsubscribed: boolean;
  purgeAt: Date | null;
  /** Guest run to attach to this player after confirmation (see claimGuestRun). */
  claimRunId?: string | null;
}

interface Invitation extends Record<string, unknown> {
  signupId: string;
  tokenHash: string;
  createdAt: number;
  expiresAt: number;
  usedAt: number | null;
}

export interface Ctx {
  store: Store;
  secret: string;
  now?: number;
}

export function signupIdFor(secret: string, email: string) {
  return hmac(secret, `email:${email}`).slice(0, 40);
}

export function unsubscribeToken(secret: string, signupId: string) {
  return `${signupId}.${hmac(secret, `unsub:${signupId}`).slice(0, 40)}`;
}

export function unsubscribeUrl(secret: string, signupId: string) {
  return `${site.url}/unsubscribe?token=${unsubscribeToken(secret, signupId)}`;
}

/** Sends through the configured provider and records an outbox entry (no tokens or email bodies are stored). */
async function deliver(ctx: Ctx, key: string, kind: string, signupId: string, msg: Omit<MailMessage, "idempotencyKey">) {
  const result = await getMailer().send({ ...msg, idempotencyKey: key });
  const now = ctx.now ?? Date.now();
  await ctx.store.transaction(async (tx) => {
    const prev = await tx.get<{ attempts: number }>(C.mailOutbox, key);
    tx.set(C.mailOutbox, key, {
      kind,
      signupId,
      status: result.ok ? "sent" : "failed",
      providerId: result.ok ? result.providerId : null,
      error: result.ok ? null : result.error.slice(0, 240),
      attempts: (prev?.attempts ?? 0) + 1,
      updatedAt: now,
      expireAt: new Date(now + OUTBOX_RETENTION_MS),
    });
  });
  return result.ok;
}

export type RequestOutcome = "created" | "resent" | "noop" | "signin" | "cooldown";

export async function requestAccess(ctx: Ctx, input: WaitlistInput): Promise<{ outcome: RequestOutcome; emailAccepted: boolean }> {
  const now = ctx.now ?? Date.now();
  const id = signupIdFor(ctx.secret, input.email);
  const ref = input.ref && referralCodeSchema.safeParse(input.ref).success ? input.ref : null;
  const secret = randomToken(24);

  const outcome = await ctx.store.transaction<RequestOutcome>(async (tx) => {
    const cur = await tx.get<Signup>(C.signups, id);
    if (!cur) {
      const doc: Signup = {
        email: input.email,
        audience: input.audience,
        status: "pending",
        updatesConsent: input.updatesConsent,
        consentChangedAt: now,
        createdAt: now,
        verifiedAt: null,
        verifyTokenHash: sha256(secret),
        verifyExpiresAt: now + VERIFY_TTL_MS,
        verifySends: 1,
        lastVerifySentAt: now,
        referredByCode: ref,
        source: input.source ?? null,
        referralCode: null,
        verifiedReferrals: 0,
        inviteState: "none",
        inviteId: null,
        inviteAcceptedAt: null,
        unsubscribed: false,
        purgeAt: new Date(now + PENDING_RETENTION_MS),
        claimRunId: input.claimRunId ?? null,
      };
      tx.create(C.signups, id, doc);
      return "created";
    }
    if (cur.status === "verified") {
      // Allow an explicit opt-in to updates; never silently opt someone out.
      if (input.updatesConsent && !cur.updatesConsent) {
        tx.update(C.signups, id, { updatesConsent: true, unsubscribed: false, consentChangedAt: now });
      }
      return "signin"; // already confirmed: email a sign-in link instead of nothing
    }
    if (now - cur.lastVerifySentAt < RESEND_COOLDOWN_MS) return "cooldown";
    if (cur.verifySends >= MAX_VERIFY_SENDS) return "noop";
    tx.update(C.signups, id, {
      verifyTokenHash: sha256(secret),
      verifyExpiresAt: now + VERIFY_TTL_MS,
      verifySends: cur.verifySends + 1,
      lastVerifySentAt: now,
      audience: input.audience,
      ...(input.claimRunId ? { claimRunId: input.claimRunId } : {}),
      ...(input.updatesConsent !== cur.updatesConsent ? { updatesConsent: input.updatesConsent, consentChangedAt: now } : {}),
    });
    return "resent";
  });

  if (outcome === "signin") {
    const { requestSignIn } = await import("./game-service");
    return { outcome, emailAccepted: (await requestSignIn(ctx, input.email)) === "sent" };
  }
  if (outcome === "noop" || outcome === "cooldown") return { outcome, emailAccepted: false };
  const sends = outcome === "created" ? 1 : (await ctx.store.get<Signup>(C.signups, id))!.verifySends;
  const link = `${site.url}/verify?token=${id}.${secret}`;
  const mail = verificationEmail(link, unsubscribeUrl(ctx.secret, id));
  const emailAccepted = await deliver(ctx, `verify_${id}_${sends}`, "verify", id, {
    to: input.email,
    ...mail,
    unsubscribeUrl: unsubscribeUrl(ctx.secret, id),
  });
  return { outcome, emailAccepted };
}

export type VerifyResult =
  | { status: "verified" | "already"; referralCode: string; signupId: string }
  | { status: "invalid" | "expired" };

export async function verifyEmail(ctx: Ctx, token: unknown): Promise<VerifyResult> {
  const now = ctx.now ?? Date.now();
  const parts = splitToken(token);
  if (!parts) return { status: "invalid" };
  const candidateCode = randomCode(10);

  return ctx.store.transaction<VerifyResult>(async (tx) => {
    const s = await tx.get<Signup>(C.signups, parts.id);
    if (!s || !safeEqual(sha256(parts.secret), s.verifyTokenHash)) return { status: "invalid" };
    if (s.status === "verified" && s.referralCode) return { status: "already", referralCode: s.referralCode, signupId: parts.id };
    if (now > s.verifyExpiresAt) return { status: "expired" };

    // --- reads ---
    const codeTaken = await tx.get(C.referralCodes, candidateCode);
    if (codeTaken) throw new Error("referral-code-collision"); // astronomically unlikely; caller may retry
    let referrerId: string | null = null;
    let referrer: Signup | null = null;
    if (s.referredByCode) {
      const rc = await tx.get<{ signupId: string }>(C.referralCodes, s.referredByCode);
      if (rc && rc.signupId !== parts.id) {
        referrer = await tx.get<Signup>(C.signups, rc.signupId);
        if (referrer?.status === "verified") referrerId = rc.signupId;
      }
    }
    const existingAttribution = referrerId ? await tx.get(C.referralAttributions, parts.id) : null;

    // --- writes ---
    tx.update(C.signups, parts.id, { status: "verified", verifiedAt: now, referralCode: candidateCode, purgeAt: null });
    tx.create(C.referralCodes, candidateCode, { signupId: parts.id, createdAt: now });
    if (referrerId && referrer && !existingAttribution) {
      tx.create(C.referralAttributions, parts.id, { referrerId, createdAt: now });
      tx.update(C.signups, referrerId, { verifiedReferrals: (referrer.verifiedReferrals ?? 0) + 1 });
    }
    return { status: "verified", referralCode: candidateCode, signupId: parts.id };
  });
}

export async function unsubscribe(ctx: Ctx, token: unknown): Promise<boolean> {
  const parts = splitToken(token);
  if (!parts || !safeEqual(unsubscribeToken(ctx.secret, parts.id), `${parts.id}.${parts.secret}`)) return false;
  const now = ctx.now ?? Date.now();
  await ctx.store.transaction(async (tx) => {
    const s = await tx.get<Signup>(C.signups, parts.id);
    if (s && !s.unsubscribed) tx.update(C.signups, parts.id, { unsubscribed: true, updatesConsent: false, consentChangedAt: now });
  });
  return true; // same response whether or not a record exists
}

/** Operator action: re-send verification to pending signups whose last email failed. */
export async function resendVerification(ctx: Ctx, signupId: string): Promise<boolean> {
  const now = ctx.now ?? Date.now();
  const secret = randomToken(24);
  const s = await ctx.store.transaction(async (tx) => {
    const cur = await tx.get<Signup>(C.signups, signupId);
    if (!cur || cur.status !== "pending" || cur.verifySends >= MAX_VERIFY_SENDS) return null;
    const next = { verifyTokenHash: sha256(secret), verifyExpiresAt: now + VERIFY_TTL_MS, verifySends: cur.verifySends + 1, lastVerifySentAt: now };
    tx.update(C.signups, signupId, next);
    return { ...cur, ...next };
  });
  if (!s) return false;
  const mail = verificationEmail(`${site.url}/verify?token=${signupId}.${secret}`, unsubscribeUrl(ctx.secret, signupId));
  return deliver(ctx, `verify_${signupId}_${s.verifySends}`, "verify", signupId, { to: s.email, ...mail, unsubscribeUrl: unsubscribeUrl(ctx.secret, signupId) });
}

export async function issueInvites(ctx: Ctx, opts: { count: number; dryRun?: boolean }) {
  const now = ctx.now ?? Date.now();
  const candidates = await ctx.store.query<Signup>(C.signups, {
    where: [["status", "verified"], ["inviteState", "none"]],
    orderBy: { field: "verifiedAt", direction: "asc" },
    limit: Math.max(1, Math.min(opts.count, 500)),
  });
  if (opts.dryRun) return { selected: candidates.length, issued: 0, emailed: 0 };
  let issued = 0, emailed = 0;
  for (const { id } of candidates) {
    const inviteId = randomToken(12);
    const secret = randomToken(24);
    const email = await ctx.store.transaction(async (tx) => {
      const s = await tx.get<Signup>(C.signups, id);
      if (!s || s.status !== "verified" || s.inviteState !== "none") return null;
      const inv: Invitation = { signupId: id, tokenHash: sha256(secret), createdAt: now, expiresAt: now + INVITE_TTL_DAYS * 864e5, usedAt: null };
      tx.create(C.invitations, inviteId, inv);
      tx.update(C.signups, id, { inviteState: "issued", inviteId });
      return s.email;
    });
    if (!email) continue;
    issued++;
    const mail = invitationEmail(`${site.url}/invite?token=${inviteId}.${secret}`, unsubscribeUrl(ctx.secret, id), INVITE_TTL_DAYS);
    if (await deliver(ctx, `invite_${inviteId}`, "invite", id, { to: email, ...mail, unsubscribeUrl: unsubscribeUrl(ctx.secret, id) })) emailed++;
  }
  return { selected: candidates.length, issued, emailed };
}

export type RedeemResult = "accepted" | "already" | "expired" | "invalid";

export async function redeemInvite(ctx: Ctx, token: unknown): Promise<RedeemResult> {
  const now = ctx.now ?? Date.now();
  const parts = splitToken(token);
  if (!parts) return "invalid";
  return ctx.store.transaction<RedeemResult>(async (tx) => {
    const inv = await tx.get<Invitation>(C.invitations, parts.id);
    if (!inv || !safeEqual(sha256(parts.secret), inv.tokenHash)) return "invalid";
    if (inv.usedAt) return "already";
    if (now > inv.expiresAt) return "expired";
    const s = await tx.get<Signup>(C.signups, inv.signupId);
    if (!s) return "invalid";
    tx.update(C.invitations, parts.id, { usedAt: now });
    tx.update(C.signups, inv.signupId, { inviteState: "accepted", inviteAcceptedAt: now });
    return "accepted";
  });
}

export async function createCampusLead(ctx: Ctx, input: CampusInput, ownerEmail: string | null) {
  const now = ctx.now ?? Date.now();
  const { website: _honeypot, ...lead } = input;
  void _honeypot;
  const id = await ctx.store.add(C.campusLeads, { ...lead, status: "new", createdAt: now });
  if (ownerEmail) {
    const mail = ownerCampusNotification(lead);
    await getMailer().send({ to: ownerEmail, ...mail, idempotencyKey: `campus_${id}` });
  }
  return id;
}

/** Erase a person's records, including gameplay data (privacy request). Returns false if no record was found. */
export async function deleteSignupByEmail(ctx: Ctx, email: string): Promise<boolean> {
  return deleteAccountById(ctx, signupIdFor(ctx.secret, email));
}

/** Erase an account by its id (used by in-app/web self-service deletion). Returns false if no signup record existed. */
export async function deleteAccountById(ctx: Ctx, id: string): Promise<boolean> {
  const related: Array<[string, string]> = [
    [C.sessions, "signupId"], [C.loginTokens, "signupId"], [C.runs, "signupId"], [C.runStarts, "signupId"],
    [C.dailyScores, "signupId"], [C.weeklyScores, "signupId"], [C.challenges, "ownerId"], [C.feedback, "signupId"],
  ];
  for (const [col, field] of related) {
    for (;;) {
      const rows = await ctx.store.query(col, { where: [[field, id]], limit: 400 });
      if (rows.length === 0) break;
      await Promise.all(rows.map((r) => ctx.store.delete(col, r.id)));
    }
  }
  await ctx.store.delete(C.players, id);
  return ctx.store.transaction(async (tx) => {
    const s = await tx.get<Signup>(C.signups, id);
    if (!s) return false;
    const attribution = await tx.get(C.referralAttributions, id);
    tx.delete(C.signups, id);
    if (s.referralCode) tx.delete(C.referralCodes, s.referralCode);
    if (s.inviteId) tx.delete(C.invitations, s.inviteId);
    if (attribution) tx.delete(C.referralAttributions, id);
    return true;
  });
}

export async function funnelMetrics(store: Store) {
  const [signups, verified, invited, accepted, referrals, campus] = await Promise.all([
    store.count(C.signups, []),
    store.count(C.signups, [["status", "verified"]]),
    store.count(C.signups, [["inviteState", "issued"]]),
    store.count(C.signups, [["inviteState", "accepted"]]),
    store.count(C.referralAttributions, []),
    store.count(C.campusLeads, []),
  ]);
  return {
    signups,
    verified,
    invitedPending: invited,
    invitesAccepted: accepted,
    verifiedReferralSignups: referrals,
    campusLeads: campus,
    notYetMeasurable: ["campus_pilot_completed"],
  };
}

/** After a successful redemption, resolve which signup the invitation belongs to (token re-verified). */
export async function invitationOwner(ctx: Ctx, token: unknown): Promise<string | null> {
  const parts = splitToken(token);
  if (!parts) return null;
  const inv = await ctx.store.get<Invitation>(C.invitations, parts.id);
  return inv && safeEqual(sha256(parts.secret), inv.tokenHash) ? inv.signupId : null;
}
