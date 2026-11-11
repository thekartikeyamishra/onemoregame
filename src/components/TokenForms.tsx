"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { confirmSignInAction, inviteAction, requestSignInAction, unsubscribeAction, verifyAction, type ConfirmState, type InviteState, type SignInState, type UnsubState, type VerifyState } from "@/app/actions";
import { track } from "@/lib/analytics";
import { ShareLink } from "./ShareLink";

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? (<><span className="spinner" aria-hidden="true" /> Working…</>) : label}
    </button>
  );
}

const retry = <p className="muted">Please try again in a few minutes. If it keeps happening, <Link href="/contact">contact us</Link>.</p>;

export function VerifyForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<VerifyState, FormData>(verifyAction, { status: "idle" });
  useEffect(() => { if (state.status === "verified") track("email_verification_completed"); }, [state.status]);

  if (state.status === "verified" || state.status === "already") {
    return (
      <div role="status">
        <div className="notice notice--ok">
          <strong>{state.status === "verified" ? "Email confirmed — you're in" : "Already confirmed"}</strong>
          {state.claimedScore != null ? `Your guest run of ${state.claimedScore.toLocaleString("en-IN")} is saved to your profile. ` : ""}
          You&apos;re signed in on this device with Quick Play, the Daily Arena leaderboard and streaks unlocked.
          <div style={{ marginTop: ".75rem" }}><Link className="btn btn--primary btn--sm" href="/play">Play now</Link></div>
        </div>
        <h2 style={{ fontSize: "var(--step-1)", marginTop: "2rem" }}>Know someone who&apos;d play? (optional)</h2>
        <p className="muted">This link sends friends to ONE MORE. It doesn&apos;t share your email, and there are no rewards or priority attached to it.</p>
        {state.shareUrl ? <ShareLink url={state.shareUrl} /> : null}
      </div>
    );
  }
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      {state.status === "invalid" && <div className="notice notice--err" role="alert"><strong>This link isn&apos;t valid</strong>It may be incomplete or replaced by a newer email. <Link href="/early-access#request">Request a new link</Link>.</div>}
      {state.status === "expired" && <div className="notice notice--err" role="alert"><strong>This link has expired</strong>Links last 48 hours. <Link href="/early-access#request">Request a new one</Link> with the same address.</div>}
      {state.status === "limited" && <div className="notice notice--err" role="alert"><strong>Too many attempts</strong>{retry}</div>}
      {state.status === "error" && <div className="notice notice--err" role="alert"><strong>Something went wrong</strong>{retry}</div>}
      {state.status === "idle" || state.status === "error" || state.status === "limited" ? <Submit pending={pending} label="Confirm my email" /> : null}
    </form>
  );
}

export function InviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteAction, { status: "idle" });
  useEffect(() => { if (state.status === "accepted") track("invite_accepted"); }, [state.status]);
  if (state.status === "accepted" || state.status === "already") {
    return (
      <div className="notice notice--ok" role="status">
        <strong>{state.status === "accepted" ? "Invitation accepted — you're in" : "Invitation already accepted"}</strong>
        {state.status === "accepted" ? "You're signed in on this device." : "To play on this device, request a sign-in link."}
        <div style={{ marginTop: ".75rem" }}>
          <Link className="btn btn--primary btn--sm" href={state.status === "accepted" ? "/play" : "/play/sign-in"}>{state.status === "accepted" ? "Play now" : "Get a sign-in link"}</Link>
        </div>
      </div>
    );
  }
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      {state.status === "invalid" && <div className="notice notice--err" role="alert"><strong>This invitation link isn&apos;t valid</strong>Check that you opened the full link from the email.</div>}
      {state.status === "expired" && <div className="notice notice--err" role="alert"><strong>This invitation has expired</strong>Your early-access request stays active; you may be invited to a later session.</div>}
      {(state.status === "error" || state.status === "limited") && <div className="notice notice--err" role="alert"><strong>Something went wrong</strong>{retry}</div>}
      <Submit pending={pending} label="Accept invitation" />
    </form>
  );
}

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<UnsubState, FormData>(unsubscribeAction, { status: "idle" });
  if (state.status === "done") {
    return <div className="notice notice--ok" role="status"><strong>You&apos;re unsubscribed from updates</strong>You may still receive essential emails about an access request you made (for example, an invitation). To delete your data entirely, see the <Link href="/privacy#rights">privacy notice</Link>.</div>;
  }
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      {state.status === "invalid" && <div className="notice notice--err" role="alert"><strong>This link isn&apos;t valid</strong>Use the full link from one of our emails, or <Link href="/contact">contact us</Link>.</div>}
      {state.status === "error" && <div className="notice notice--err" role="alert"><strong>Something went wrong</strong>{retry}</div>}
      <Submit pending={pending} label="Unsubscribe from updates" />
    </form>
  );
}

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(requestSignInAction, { status: "idle" });
  if (state.status === "sent" || state.status === "recent") {
    return (
      <div className="notice notice--ok" role="status">
        <strong>{state.status === "sent" ? "Check your inbox" : "A link is already on its way"}</strong>
        {state.status === "sent"
          ? "We've emailed you a link: a sign-in link (works once, 15 minutes), a confirmation link if you haven't confirmed yet, or a link to create your account if you're new. "
          : "We sent a link to this address in the last few minutes, so we didn't send another. "}
        Not there in 2 minutes? Check <b>Spam</b> and <b>Promotions</b>, and search your mail for &ldquo;ONE MORE&rdquo;.
      </div>
    );
  }
  return (
    <form action={action}>
      {state.status === "invalid" && <div className="notice notice--err" role="alert"><strong>Check the address</strong>Enter the email you confirmed.</div>}
      {state.status === "limited" && <div className="notice notice--err" role="alert"><strong>Too many attempts</strong>{retry}</div>}
      {state.status === "error" && <div className="notice notice--err" role="alert"><strong>Something went wrong</strong>{retry}</div>}
      {state.status === "mailfail" && <div className="notice notice--err" role="alert"><strong>We couldn&apos;t send the email</strong>Our email service didn&apos;t accept it. Please try again in a few minutes. If it keeps happening, <Link href="/contact">tell us</Link>.</div>}
      <div className="field">
        <label htmlFor="signin-email">Email address</label>
        <input id="signin-email" name="email" type="email" className="input" autoComplete="email" required maxLength={254} />
      </div>
      <Submit pending={pending} label="Email me a sign-in link" />
    </form>
  );
}

export function ConfirmSignInForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ConfirmState, FormData>(confirmSignInAction, { status: "idle" });
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      {state.status === "invalid" && <div className="notice notice--err" role="alert"><strong>This link isn&apos;t valid</strong>It may have expired or been used. <Link href="/play/sign-in">Request a new one</Link>.</div>}
      {(state.status === "error" || state.status === "limited") && <div className="notice notice--err" role="alert"><strong>Something went wrong</strong>{retry}</div>}
      <Submit pending={pending} label="Sign in and play" />
    </form>
  );
}
