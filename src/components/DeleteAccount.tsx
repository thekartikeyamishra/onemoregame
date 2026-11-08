"use client";

import { useState } from "react";

async function post(body: unknown) {
  try {
    const r = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    return r.ok ? { ok: true as const, data: d as { message?: string } } : { ok: false as const, error: (d as { error?: string }).error ?? "Something went wrong." };
  } catch { return { ok: false as const, error: "Couldn't reach the server. Check your connection." }; }
}

function clearLocal() {
  try { for (const k of Object.keys(localStorage)) if (k.startsWith("om_")) localStorage.removeItem(k); } catch { /* storage blocked */ }
}

/** Signed in: type DELETE, confirm, done. */
export function DeleteNow() {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  if (state === "done") return <div className="notice" role="status"><strong>Your account has been deleted.</strong> Scores, streaks, level progress and challenges are gone. Thanks for playing.</div>;
  return (
    <form className="form-card danger-card" onSubmit={async (e) => {
      e.preventDefault(); setState("busy"); setError(null);
      const r = await post({ mode: "now", confirm: text.trim() });
      if (!r.ok) { setError(r.error); setState("idle"); return; }
      clearLocal(); setState("done");
    }}>
      <h2 style={{ marginTop: 0 }}>Delete my account</h2>
      <p className="small">This permanently deletes your account and everything linked to it: personal best, streaks, level progress, leaderboard entries, friend challenges and feedback. It can&apos;t be undone.</p>
      <div className="field">
        <label htmlFor="del-confirm">Type DELETE to confirm</label>
        <input id="del-confirm" className="input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" autoCapitalize="characters" />
      </div>
      {error ? <div className="notice notice--err" role="alert">{error}</div> : null}
      <button className="btn btn--danger" type="submit" disabled={state === "busy" || text.trim() !== "DELETE"}>{state === "busy" ? "Deleting…" : "Permanently delete my account"}</button>
    </form>
  );
}

/** Signed out: request a confirmation link by email. */
export function DeleteRequest() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form className="form-card" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      const r = await post({ mode: "request", email });
      setBusy(false);
      setMsg(r.ok ? { ok: true, text: r.data.message ?? "Check your inbox." } : { ok: false, text: r.error });
    }}>
      <h2 style={{ marginTop: 0 }}>Delete an account by email</h2>
      <p className="small">Enter the email you signed up with. We&apos;ll send a one-time link (valid 60 minutes) to confirm, so nobody else can delete your account.</p>
      <div className="field">
        <label htmlFor="del-email">Email address</label>
        <input id="del-email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      {msg ? <div className={msg.ok ? "notice" : "notice notice--err"} role={msg.ok ? "status" : "alert"}>{msg.text}</div> : null}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Email me a deletion link"}</button>
    </form>
  );
}

/** From the emailed link: final confirmation. */
export function DeleteConfirm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  if (state === "done") return <div className="notice" role="status"><strong>Your account has been deleted.</strong> Thanks for playing ONE MORE.</div>;
  return (
    <div className="form-card danger-card">
      <h2 style={{ marginTop: 0 }}>Delete your account?</h2>
      <p className="small">This permanently deletes your account, scores, streaks, level progress and challenges.</p>
      {error ? <div className="notice notice--err" role="alert">{error}</div> : null}
      <button className="btn btn--danger" type="button" disabled={state === "busy"} onClick={async () => {
        setState("busy"); setError(null);
        const r = await post({ mode: "confirm", token });
        if (!r.ok) { setError(r.error); setState("idle"); return; }
        clearLocal(); setState("done");
      }}>{state === "busy" ? "Deleting…" : "Yes, delete everything"}</button>
    </div>
  );
}
