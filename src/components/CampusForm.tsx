"use client";

import Link from "next/link";
import { useId, useRef, useState, useEffect } from "react";
import { track } from "@/lib/analytics";

type Errors = Partial<Record<"name" | "email" | "institution" | "role" | "size", string>>;
type State = { kind: "idle" | "submitting" | "done" } | { kind: "error"; message: string; errors: Errors };

export function CampusForm() {
  const id = useId();
  const [state, setState] = useState<State>({ kind: "idle" });
  const statusRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (state.kind === "done" || state.kind === "error") statusRef.current?.focus(); }, [state]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === "submitting") return;
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/api/campus-interest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (res.status === 202) { setState({ kind: "done" }); track("campus_interest_submitted"); return; }
      const body = (await res.json().catch(() => ({}))) as { error?: string; errors?: Errors };
      setState({ kind: "error", message: body.error ?? "Something went wrong. Please try again.", errors: body.errors ?? {} });
    } catch {
      setState({ kind: "error", message: "We couldn't reach the server. Check your connection and try again.", errors: {} });
    }
  }

  if (state.kind === "done") {
    return (
      <div className="notice notice--ok" role="status" tabIndex={-1} ref={statusRef}>
        <strong>Thanks — interest received</strong>
        <p style={{ margin: 0 }}>We read every organizer note and will reply by email when pilot events are being scheduled. Registration for events is not open yet.</p>
      </div>
    );
  }

  const errors = state.kind === "error" ? state.errors : {};
  const field = (name: keyof Errors, label: string, input: React.ReactNode) => (
    <div className="field">
      <label htmlFor={`${id}-${name}`}>{label}</label>
      {input}
      {errors[name] ? <p className="field-error" id={`${id}-${name}-err`}>{errors[name]}</p> : null}
    </div>
  );
  const a = (name: keyof Errors) => ({ id: `${id}-${name}`, name, "aria-invalid": errors[name] ? true : undefined, "aria-describedby": errors[name] ? `${id}-${name}-err` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="form-card">
      {state.kind === "error" ? (
        <div className="notice notice--err" role="alert" tabIndex={-1} ref={statusRef}><strong>Not sent</strong>{state.message}</div>
      ) : null}
      {field("name", "Your name", <input {...a("name")} className="input" autoComplete="name" required maxLength={80} />)}
      {field("email", "Work or student email", <input {...a("email")} type="email" className="input" autoComplete="email" required maxLength={254} />)}
      {field("institution", "School, college or club", <input {...a("institution")} className="input" autoComplete="organization" required maxLength={120} />)}
      {field("role", "Your role", (
        <select {...a("role")} className="select" defaultValue="student-organizer">
          <option value="student-organizer">Student organizer</option>
          <option value="club-lead">Gaming / tech club lead</option>
          <option value="faculty-staff">Faculty or staff</option>
          <option value="other">Other</option>
        </select>
      ))}
      {field("size", "Expected participants", (
        <select {...a("size")} className="select" defaultValue="unsure">
          <option value="unsure">Not sure yet</option>
          <option value="under-50">Under 50</option>
          <option value="50-200">50–200</option>
          <option value="200-1000">200–1,000</option>
          <option value="over-1000">Over 1,000</option>
        </select>
      ))}
      <div className="field">
        <label htmlFor={`${id}-message`}>What would you want from a campus event? <span className="muted">(optional)</span></label>
        <textarea id={`${id}-message`} name="message" className="textarea" maxLength={1000} />
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Leave this field empty</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" className="btn btn--primary" disabled={state.kind === "submitting"}>
        {state.kind === "submitting" ? (<><span className="spinner" aria-hidden="true" /> Sending…</>) : "Register organizer interest"}
      </button>
      <p className="privacy-note">This registers interest only; it is not event registration and no partnership is implied. <Link href="/privacy">Privacy notice</Link>.</p>
    </form>
  );
}
