"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { invitationOwner, redeemInvite, unsubscribe, verifyEmail, type RedeemResult, type VerifyResult } from "@/lib/early-access";
import { SESSION_COOKIE, claimGuestRun, confirmSignIn, endSession, requestSignIn } from "@/lib/game-service";
import { clearSessionCookie, signInAs } from "@/lib/session";
import { emailSchema } from "@/lib/validation";
import { limits } from "@/lib/rate-limit";
import { allow, logError, serverCtx } from "@/lib/server";
import { site } from "@/lib/site";

type PublicVerify = { status: "verified" | "already"; referralCode: string } | { status: "invalid" | "expired" };
export type VerifyState = { status: "idle" } | { status: "error" } | { status: "limited" } | (PublicVerify & { shareUrl?: string; claimedScore?: number | null });

export async function verifyAction(_prev: VerifyState, form: FormData): Promise<VerifyState> {
  try {
    const ctx = await serverCtx();
    if (!(await allow(ctx, limits.verifyPerIp))) return { status: "limited" };
    const r: VerifyResult = await verifyEmail(ctx, form.get("token"));
    if (r.status === "verified" || r.status === "already") {
      // Confirming an email unlocks the full playtest on this device and saves any guest run they chose to keep.
      await signInAs(ctx, r.signupId);
      const claimedScore = await claimGuestRun(ctx, r.signupId).catch((e) => (logError("claim", e), null));
      return { status: r.status, referralCode: r.referralCode, shareUrl: `${site.url}/r/${r.referralCode}`, claimedScore };
    }
    return r;
  } catch (e) {
    logError("verify", e);
    return { status: "error" };
  }
}

export type InviteState = { status: "idle" | "error" | "limited" } | { status: RedeemResult };

export async function inviteAction(_prev: InviteState, form: FormData): Promise<InviteState> {
  try {
    const ctx = await serverCtx();
    if (!(await allow(ctx, limits.invitePerIp))) return { status: "limited" };
    const status = await redeemInvite(ctx, form.get("token"));
    if (status === "accepted") {
      // First redemption signs the player in on this device.
      const owner = await invitationOwner(ctx, form.get("token"));
      if (owner) await signInAs(ctx, owner);
    }
    return { status };
  } catch (e) {
    logError("invite", e);
    return { status: "error" };
  }
}

export type UnsubState = { status: "idle" | "done" | "invalid" | "error" };

export async function unsubscribeAction(_prev: UnsubState, form: FormData): Promise<UnsubState> {
  try {
    const ctx = await serverCtx();
    return { status: (await unsubscribe(ctx, form.get("token"))) ? "done" : "invalid" };
  } catch (e) {
    logError("unsubscribe", e);
    return { status: "error" };
  }
}

export type SignInState = { status: "idle" | "sent" | "invalid" | "limited" | "error" };

export async function requestSignInAction(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { status: "invalid" };
  try {
    const ctx = await serverCtx();
    if (!(await allow(ctx, limits.signInPerIp))) return { status: "limited" };
    await requestSignIn(ctx, email.data);
    return { status: "sent" }; // same response whether or not the address has playtest access
  } catch (e) {
    logError("sign-in", e);
    return { status: "error" };
  }
}

export type ConfirmState = { status: "idle" | "invalid" | "limited" | "error" };

export async function confirmSignInAction(_prev: ConfirmState, form: FormData): Promise<ConfirmState> {
  let ok = false;
  try {
    const ctx = await serverCtx();
    if (!(await allow(ctx, limits.signInPerIp))) return { status: "limited" };
    const signupId = await confirmSignIn(ctx, form.get("token"));
    if (!signupId) return { status: "invalid" };
    await signInAs(ctx, signupId);
    ok = true;
  } catch (e) {
    logError("sign-in-confirm", e);
    return { status: "error" };
  }
  if (ok) redirect("/play");
  return { status: "error" };
}

export async function signOutAction() {
  try {
    const ctx = await serverCtx();
    await endSession(ctx, (await cookies()).get(SESSION_COOKIE)?.value);
  } catch (e) {
    logError("sign-out", e);
  }
  await clearSessionCookie();
  redirect("/play");
}
