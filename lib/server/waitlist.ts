import "server-only";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { absoluteUrl, site } from "@/lib/site";
import type { WaitlistInput } from "@/lib/validation";
import { getDb } from "./firebase";
import { emailEnabled, layoutEmail, sendEmail } from "./email";
import { canonicalEmail, referralCode, REF_PATTERN, VOID_LIMIT } from "./fraud";
import { rateLimit, sha256, sign } from "./guard";

type Member = {
  email: string;
  code: string;
  interests: string[];
  role?: string;
  source?: string;
  lang?: string;
  country?: string | null;
  ipHash: string;
  createdAt: FieldValue;
  confirmed: boolean;
  referredBy: string | null;
  referralStatus: "none" | "pending" | "credited" | "void";
  referrals: number;
  voided: number;
  flagged: boolean;
  risk: number;
};

export const memberId = (email: string) => sha256(canonicalEmail(email));
export const confirmUrl = (id: string) => absoluteUrl(`/api/waitlist/confirm?id=${id}&sig=${sign(`c:${id}`)}`);
export const unsubscribeUrl = (id: string) => absoluteUrl(`/api/waitlist/unsubscribe?id=${id}&sig=${sign(`u:${id}`)}`);

export type JoinResult = { code: string; confirmRequired: boolean };

export async function joinWaitlist(input: WaitlistInput, ctx: { ipHash: string; country: string | null }): Promise<JoinResult | null> {
  const db = getDb();
  if (!db) return null;

  const id = memberId(input.email);
  const ref = input.ref && REF_PATTERN.test(input.ref) ? input.ref : null;
  const doubleOptIn = emailEnabled();

  // Velocity signal: many sign-ups from one network in a day is how referral farms look.
  const velocity = await rateLimit(`signup-day:${ctx.ipHash}`, 3, 86_400);
  const risk = velocity.ok ? 0 : 40;

  const result = await db.runTransaction(async (tx) => {
    const ref_ = db.collection("waitlist").doc(id);
    const existing = await tx.get(ref_);
    if (existing.exists) {
      const m = existing.data() as Member;
      return { code: m.code, confirmRequired: doubleOptIn && !m.confirmed, isNew: false };
    }

    // Unique, unguessable referral code
    let code = referralCode();
    for (let i = 0; i < 4 && (await tx.get(db.collection("codes").doc(code))).exists; i++) code = referralCode();

    let referredBy: string | null = null;
    let referralStatus: Member["referralStatus"] = "none";
    let referrerRef: DocumentReference | null = null;
    let referrer: Member | null = null;

    if (ref) {
      const codeDoc = await tx.get(db.collection("codes").doc(ref));
      if (codeDoc.exists) {
        referrerRef = db.collection("waitlist").doc(codeDoc.data()!.id as string);
        const snap = await tx.get(referrerRef);
        referrer = snap.exists ? (snap.data() as Member) : null;
      }
    }

    if (referrer && referrerRef) {
      referredBy = ref;
      const selfReferral = referrer.ipHash === ctx.ipHash || referrerRef.id === id;
      if (selfReferral) {
        referralStatus = "void";
        const voided = (referrer.voided ?? 0) + 1;
        tx.update(referrerRef, { voided, flagged: referrer.flagged || voided >= VOID_LIMIT });
      } else if (risk >= 40) {
        referralStatus = "void"; // suspicious velocity: no credit, but no penalty on the referrer
      } else if (doubleOptIn) {
        referralStatus = "pending"; // credited when this person confirms their email
      } else if (!referrer.flagged) {
        referralStatus = "credited";
        tx.update(referrerRef, { referrals: FieldValue.increment(1) });
      } else {
        referralStatus = "pending"; // frozen while the referrer is under review
      }
    }

    const member: Member = {
      email: input.email,
      code,
      interests: input.interests ?? [],
      role: input.role,
      source: input.source,
      lang: input.lang,
      country: ctx.country,
      ipHash: ctx.ipHash,
      createdAt: FieldValue.serverTimestamp(),
      confirmed: !doubleOptIn,
      referredBy,
      referralStatus,
      referrals: 0,
      voided: 0,
      flagged: false,
      risk,
    };
    tx.set(ref_, member);
    tx.set(db.collection("codes").doc(code), { id });

    const stats: Record<string, FieldValue> = { total: FieldValue.increment(1) };
    for (const i of member.interests) stats[`interest_${i}`] = FieldValue.increment(1);
    if (input.role) stats[`role_${input.role}`] = FieldValue.increment(1);
    if (ctx.country) stats[`country_${ctx.country}`] = FieldValue.increment(1);
    tx.set(db.collection("stats").doc("waitlist"), stats, { merge: true });

    return { code, confirmRequired: doubleOptIn, isNew: true };
  });

  if (result.confirmRequired) {
    const resend = await rateLimit(`confirm-mail:${id}`, 1, 600);
    if (result.isNew || resend.ok) await sendConfirmEmail(input.email, id);
  }
  return { code: result.code, confirmRequired: result.confirmRequired };
}

async function sendConfirmEmail(email: string, id: string) {
  const link = confirmUrl(id);
  const unsub = unsubscribeUrl(id);
  await sendEmail({
    to: email,
    subject: "Confirm your early-access request",
    unsubscribeUrl: unsub,
    text: `Confirm your email to stay on the early-access list for ${site.name}'s upcoming apps: ${link}\n\nDidn't ask for this? Ignore this email or remove yourself: ${unsub}`,
    html: layoutEmail(
      "One tap to confirm",
      `Confirm your email to stay on the early-access list for upcoming apps from ${site.name}. Invites go out in small waves; you'll only hear from me when there's something real to try.`,
      { href: link, label: "Confirm my email" },
      `Didn't ask for this? Ignore this email, or <a href="${unsub}" style="color:#5b6478">remove my address</a>.`
    ),
  });
}

export async function confirmMember(id: string): Promise<"ok" | "missing"> {
  const db = getDb();
  if (!db) return "missing";
  return db.runTransaction(async (tx) => {
    const ref = db.collection("waitlist").doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) return "missing";
    const m = snap.data() as Member;
    if (m.confirmed) return "ok";

    let referrerRef: DocumentReference | null = null;
    let referrer: Member | null = null;
    if (m.referralStatus === "pending" && m.referredBy) {
      const codeDoc = await tx.get(db.collection("codes").doc(m.referredBy));
      if (codeDoc.exists) {
        referrerRef = db.collection("waitlist").doc(codeDoc.data()!.id as string);
        const rs = await tx.get(referrerRef);
        referrer = rs.exists ? (rs.data() as Member) : null;
      }
    }
    const update: Partial<Record<keyof Member | "confirmedAt", unknown>> = { confirmed: true, confirmedAt: FieldValue.serverTimestamp() };
    if (referrer && referrerRef && !referrer.flagged) {
      tx.update(referrerRef, { referrals: FieldValue.increment(1) });
      update.referralStatus = "credited";
    }
    tx.update(ref, update);
    tx.set(db.collection("stats").doc("waitlist"), { confirmed: FieldValue.increment(1) }, { merge: true });
    return "ok";
  });
}

/** Right to erasure: removes the member and their code entirely. */
export async function removeMember(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  return db.runTransaction(async (tx) => {
    const ref = db.collection("waitlist").doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) return true;
    const m = snap.data() as Member;
    tx.delete(ref);
    tx.delete(db.collection("codes").doc(m.code));
    tx.set(db.collection("stats").doc("waitlist"), { total: FieldValue.increment(-1) }, { merge: true });
    return true;
  });
}

export async function referralCount(code: string): Promise<number | null> {
  const db = getDb();
  if (!db || !REF_PATTERN.test(code)) return null;
  const codeDoc = await db.collection("codes").doc(code).get();
  if (!codeDoc.exists) return null;
  const m = await db.collection("waitlist").doc(codeDoc.data()!.id as string).get();
  return m.exists ? ((m.data() as Member).referrals ?? 0) : null;
}

export async function waitlistTotal(): Promise<number | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const s = await db.collection("stats").doc("waitlist").get();
    return s.exists ? Number(s.data()?.total ?? 0) : 0;
  } catch {
    return null;
  }
}
