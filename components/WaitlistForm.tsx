"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { lab } from "@/lib/site";
import { mitra } from "./mascot/store";

const roles = [
  { id: "founder", label: "Founder" },
  { id: "developer", label: "Developer" },
  { id: "designer", label: "Designer" },
  { id: "business", label: "Business owner" },
  { id: "student", label: "Student" },
  { id: "other", label: "Something else" },
];

type Joined = { code: string; confirmRequired: boolean };

export function WaitlistForm({ siteUrl }: { siteUrl: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState<Joined | null>(null);
  const startedAt = useRef(0);
  const hpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    try {
      const code = localStorage.getItem("ea_code");
      if (code) setJoined({ code, confirmRequired: false });
    } catch {}
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!consent) {
      setError("Please tick the box so I'm allowed to email your invite.");
      return;
    }
    setBusy(true);
    mitra.feel("thinking", 0);
    let ref: string | undefined;
    try {
      ref = localStorage.getItem("ea_ref") ?? undefined;
    } catch {}
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role: role || undefined,
          interests,
          consent: true,
          ref,
          source: "early-access-page",
          lang: navigator.language.slice(0, 8),
          hp: hpRef.current?.value ?? "",
          t: Date.now() - startedAt.current,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; code?: string; confirmRequired?: boolean; error?: string };
      if (!res.ok || !data.ok || !data.code) throw new Error(data.error || "Something went wrong. Please try again.");
      try {
        localStorage.setItem("ea_code", data.code);
      } catch {}
      setJoined({ code: data.code, confirmRequired: Boolean(data.confirmRequired) });
      mitra.feel("party", 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      mitra.feel("sad");
    } finally {
      setBusy(false);
    }
  }

  if (joined) return <SharePanel siteUrl={siteUrl} joined={joined} onReset={() => setJoined(null)} />;

  return (
    <form onSubmit={submit} noValidate className="space-y-6" aria-describedby={error ? "ea-error" : undefined}>
      <div>
        <label htmlFor="ea-email" className="label">
          Email
        </label>
        <input
          id="ea-email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          className="field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => mitra.feel("happy", 1500)}
        />
      </div>

      <div>
        <label htmlFor="ea-role" className="label">
          You are a… <span className="font-normal text-slate">(optional)</span>
        </label>
        <select id="ea-role" className="field" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Prefer not to say</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label">
          Most interested in <span className="font-normal text-slate">(optional)</span>
        </legend>
        <div className="space-y-2">
          {lab.map((p) => {
            const on = interests.includes(p.id);
            return (
              <label key={p.id} className={`flex cursor-pointer gap-3 rounded-2xl border-[1.5px] px-4 py-3 ${on ? "border-indigo bg-indigo-soft" : "border-line bg-surface"}`}>
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[var(--indigo)]"
                  checked={on}
                  onChange={() => setInterests((p_) => (on ? p_.filter((x) => x !== p.id) : [...p_, p.id]))}
                />
                <span>
                  <span className="font-semibold">{p.codename}</span>
                  <span className="text-slate">: {p.line}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Honeypot: hidden from people, irresistible to bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="ea-website">Website</label>
        <input id="ea-website" ref={hpRef} type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="flex cursor-pointer gap-3 text-[0.95rem]">
        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[var(--indigo)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          Email me my invite and occasional launch news. I can unsubscribe at any time. See the{" "}
          <Link href="/privacy" className="text-indigo underline">
            privacy policy
          </Link>
          .
        </span>
      </label>

      {error ? (
        <p id="ea-error" role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-danger">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Requesting…" : "Request an invite"}
      </button>
    </form>
  );
}

function SharePanel({ siteUrl, joined, onReset }: { siteUrl: string; joined: Joined; onReset: () => void }) {
  const link = `${siteUrl}/early-access?ref=${joined.code}`;
  const [copied, setCopied] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const text = "I just requested an invite to the new apps Kartikeya Mishra is building. Join me:";

  useEffect(() => {
    fetch(`/api/waitlist?code=${joined.code}`)
      .then((r) => r.json())
      .then((d: { count?: number }) => setCount(d.count ?? 0))
      .catch(() => {});
  }, [joined.code]);

  const shares = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}` },
    { label: "X", href: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}` },
    { label: "Email", href: `mailto:?subject=${encodeURIComponent("An invite you might like")}&body=${encodeURIComponent(`${text} ${link}`)}` },
  ];

  return (
    <div className="space-y-6" role="status">
      <div>
        <p className="font-display text-3xl font-extrabold">You&apos;re on the list</p>
        <p className="mt-2 text-slate">
          {joined.confirmRequired
            ? "One more step: open the email I just sent and tap “Confirm my email”. Check spam or promotions if it's not there in a minute."
            : "Invites go out in small waves. You'll get an email when yours is ready."}
        </p>
      </div>
      <div className="rounded-2xl border border-line bg-paper p-4">
        <p className="text-sm font-semibold">Your personal invite link</p>
        <p className="mt-1 text-sm text-slate">
          Each friend who joins and confirms with it can move you into an earlier wave.
          {count !== null ? ` Confirmed so far: ${count}.` : ""}
        </p>
        <div className="mt-3 flex gap-2">
          <input readOnly value={link} className="field !min-h-11 text-sm" aria-label="Your invite link" onFocus={(e) => e.target.select()} />
          <button
            type="button"
            className="btn btn-primary !min-h-11 shrink-0"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                mitra.feel("love", 1800);
                setTimeout(() => setCopied(false), 2000);
              } catch {}
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {shares.map((s) => (
            <li key={s.label}>
              <a href={s.href} target="_blank" rel="noopener" className="inline-block rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-semibold hover:border-indigo">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-slate">
        Referrals only count for real people who confirm their own email. Self-referrals, duplicate or throwaway addresses and
        automated sign-ups are removed, and accounts that repeatedly break these rules lose referral credit. See the{" "}
        <Link href="/terms#early-access" className="underline">
          terms
        </Link>
        .
      </p>
      <button type="button" onClick={() => { try { localStorage.removeItem("ea_code"); } catch {} onReset(); }} className="text-sm text-slate underline">
        Use a different email
      </button>
    </div>
  );
}
