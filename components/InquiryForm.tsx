"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { budgets, timelines } from "@/lib/options";
import { mitra } from "./mascot/store";

export function InquiryForm({ kind }: { kind: "project" | "contact" }) {
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState("");
  const [prefill, setPrefill] = useState("");
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
    const est = new URLSearchParams(window.location.search).get("estimate");
    if (est && kind === "project") {
      setPrefill(`I used the cost calculator: ${window.location.origin}/tools/app-cost-calculator?${est}\n\nAbout the idea: `);
    }
  }, [kind]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const payload = {
      kind,
      name: String(f.get("name") ?? ""),
      email: String(f.get("email") ?? ""),
      company: String(f.get("company") ?? "") || undefined,
      budget: String(f.get("budget") ?? "") || undefined,
      timeline: String(f.get("timeline") ?? "") || undefined,
      message: String(f.get("message") ?? ""),
      consent: f.get("consent") === "on",
      hp: String(f.get("website") ?? ""),
      t: Date.now() - startedAt.current,
    };
    if (!payload.consent) {
      setError("Please tick the box so I can store your message and reply.");
      return;
    }
    setState("busy");
    mitra.feel("thinking", 0);
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setState("sent");
      mitra.feel("starstruck", 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("idle");
      mitra.feel("sad");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="rounded-3xl bg-indigo-soft p-8">
        <p className="font-display text-3xl font-extrabold">Message sent</p>
        <p className="mt-2 text-slate">
          Thanks. I read every message myself and usually reply within two working days. Meanwhile, the{" "}
          <Link href="/blog" className="text-indigo underline">
            writing
          </Link>{" "}
          shows how I approach projects.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="iq-name" className="label">
            Your name
          </label>
          <input id="iq-name" name="name" required autoComplete="name" className="field" />
        </div>
        <div>
          <label htmlFor="iq-email" className="label">
            Email
          </label>
          <input id="iq-email" name="email" type="email" required autoComplete="email" inputMode="email" className="field" />
        </div>
      </div>

      {kind === "project" ? (
        <>
          <div>
            <label htmlFor="iq-company" className="label">
              Company or project name <span className="font-normal text-slate">(optional)</span>
            </label>
            <input id="iq-company" name="company" autoComplete="organization" className="field" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="iq-budget" className="label">
                Budget range
              </label>
              <select id="iq-budget" name="budget" className="field" defaultValue="unsure">
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="iq-timeline" className="label">
                When do you want to start?
              </label>
              <select id="iq-timeline" name="timeline" className="field" defaultValue="1-3m">
                {timelines.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      ) : null}

      <div>
        <label htmlFor="iq-message" className="label">
          {kind === "project" ? "What are you building, and for whom?" : "Message"}
        </label>
        <textarea
          key={prefill}
          id="iq-message"
          name="message"
          required
          rows={7}
          minLength={30}
          maxLength={4000}
          defaultValue={prefill}
          className="field resize-y"
          placeholder={kind === "project" ? "The problem, who it's for, must-have features, anything already built…" : ""}
        />
      </div>

      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="iq-website">Website</label>
        <input id="iq-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="flex cursor-pointer gap-3 text-[0.95rem]">
        <input type="checkbox" name="consent" className="mt-1 h-4 w-4 shrink-0 accent-[var(--indigo)]" />
        <span>
          Store my message and contact details so Kartikeya can reply. See the{" "}
          <Link href="/privacy" className="text-indigo underline">
            privacy policy
          </Link>
          .
        </span>
      </label>

      {error ? (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-danger">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={state === "busy"}>
        {state === "busy" ? "Sending…" : kind === "project" ? "Send project details" : "Send message"}
      </button>
    </form>
  );
}
