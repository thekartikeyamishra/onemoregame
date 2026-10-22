"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { track } from "@/lib/analytics";

type State = { kind: "idle" } | { kind: "submitting" } | { kind: "done" } | { kind: "error"; message: string; field?: "email" | "age" };

export function WaitlistForm({ claimRunId = null, referralCode = null, compact = false }: { claimRunId?: string | null; referralCode?: string | null; compact?: boolean } = {}) {
  const id = useId();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [started, setStarted] = useState(false);
  const meta = useRef<{ ref: string | null; source: string | null }>({ ref: null, source: null });
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    meta.current = { ref: referralCode ?? p.get("ref"), source: claimRunId ? "guest-run" : p.get("utm_source") };
  }, [referralCode, claimRunId]);

  useEffect(() => {
    if (state.kind === "done" || state.kind === "error") statusRef.current?.focus();
  }, [state.kind]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === "submitting") return;
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState({ kind: "error", field: "email", message: "Enter a valid email address, like name@example.com." });
      return;
    }
    if (fd.get("age") !== "on") {
      setState({ kind: "error", field: "age", message: "Please confirm the age statement to continue." });
      return;
    }
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          audience: fd.get("audience") ?? "player",
          updatesConsent: fd.get("updates") === "on",
          ageConfirmed: fd.get("age") === "on",
          ref: meta.current.ref,
          claimRunId,
          source: meta.current.source,
          website: fd.get("website") ?? "",
        }),
      });
      if (res.status === 202) {
        setState({ kind: "done" });
        track("waitlist_submit_succeeded");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string; field?: "email" | "age" };
      setState({ kind: "error", field: body.field, message: body.error ?? "Something went wrong. Please try again in a moment." });
    } catch {
      setState({ kind: "error", message: "We couldn't reach the server. Check your connection and try again." });
    }
  }

  if (state.kind === "done") {
    return (
      <div className="notice notice--ok" role="status" tabIndex={-1} ref={statusRef}>
        <strong>Check your inbox</strong>
        <p style={{ margin: 0 }}>
          {claimRunId ? "Open the confirmation link (valid 48 hours) and this run is saved to your profile. " : "If this address can receive email, a confirmation link is on its way. It expires in 48 hours. "}
          Nothing after 15 minutes? Check spam or promotions, then try again.
        </p>
      </div>
    );
  }

  const emailErr = state.kind === "error" && state.field === "email";
  return (
    <form onSubmit={onSubmit} noValidate onFocus={() => { if (!started) { setStarted(true); track("waitlist_form_started"); } }}>
      {state.kind === "error" ? (
        <div className="notice notice--err" role="alert" tabIndex={-1} ref={statusRef}>
          <strong>Request not sent</strong>
          {state.message}
        </div>
      ) : null}
      <div className="field">
        <label htmlFor={`${id}-email`}>Email address</label>
        <input
          id={`${id}-email`} name="email" type="email" className="input" autoComplete="email" inputMode="email" required maxLength={254}
          aria-invalid={emailErr || undefined} aria-describedby={emailErr ? `${id}-email-err` : `${id}-email-hint`}
        />
        {emailErr ? <p className="field-error" id={`${id}-email-err`}>{state.message}</p> : <p className="hint" id={`${id}-email-hint`}>We only use it for your access request and, if you opt in, launch updates.</p>}
      </div>
{compact ? null : (
      <fieldset className="field">
        <legend>I&apos;m interested as</legend>
        <div className="choices">
          {[["player", "A player"], ["organizer", "A campus organizer"], ["both", "Both"]].map(([v, l], i) => (
            <label key={v} className="choice">
              <input type="radio" name="audience" value={v} defaultChecked={i === 0} />
              <span>{l}</span>
            </label>
          ))}
        </div>
      </fieldset>
      )}
      <label className="check">
        <input type="checkbox" name="age" required aria-invalid={state.kind === "error" && state.field === "age" ? true : undefined} />
        <span>I am 18 or older, or I am a parent or guardian requesting access for my child.</span>
      </label>
      <label className="check">
        <input type="checkbox" name="updates" />
        <span>Also send me occasional launch and development updates (optional, unsubscribe any time).</span>
      </label>
      <div className="hp" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Leave this field empty</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" className="btn btn--primary" style={{ width: "100%" }} disabled={state.kind === "submitting"}>
        {state.kind === "submitting" ? (<><span className="spinner" aria-hidden="true" /> Sending…</>) : compact ? "Email me a confirmation link" : "Unlock the playtest"}
      </button>
      <p className="privacy-note">
        Confirming your email unlocks the playtest. It doesn&apos;t include rewards or a launch date.
        See the <Link href="/privacy">privacy notice</Link> for what we store and how to delete it.
      </p>
    </form>
  );
}
