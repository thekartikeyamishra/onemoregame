"use client";

import Link from "next/link";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Face } from "./Face";
import { mitra, useLivingMitra, useMitra } from "./store";
import type { Mood } from "./expressions";
import { chips, detectLang, intents, languages, matchIntent, ui, type Action, type Lang } from "@/lib/mitra/knowledge";

type Msg = { id: number; from: "mitra" | "you"; text: string; actions?: Action[]; consent?: boolean };
type Flow = { step: "email" } | { step: "consent"; email: string } | null;

const SESSION_AI_LIMIT = 12;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("mitra_lang");
    if (saved && languages.some((l) => l.id === saved)) return saved as Lang;
  } catch {}
  const nav = navigator.language.slice(0, 2);
  return (languages.find((l) => l.id === nav)?.id ?? "en") as Lang;
}

export function ChatDock() {
  const { mood, open } = useMitra();
  const dockRef = useRef<HTMLDivElement>(null);
  const poke = useLivingMitra(dockRef);
  const reduce = useReducedMotion();

  const [lang, setLang] = useState<Lang>(initialLang);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [flow, setFlow] = useState<Flow>(null);
  const aiCalls = useRef(0);
  const openedAt = useRef(0);
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const say = useCallback((m_: Omit<Msg, "id">, feel?: Mood) => {
    setMsgs((prev) => [...prev, { ...m_, id: nextId.current++ }]);
    if (feel) mitra.feel(feel);
  }, []);

  // Greeting on first open; focus management; Escape to close.
  useEffect(() => {
    if (!open) return;
    openedAt.current = Date.now();
    if (msgs.length === 0) say({ from: "mitra", text: ui.hello[lang] }, "happy");
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && mitra.setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [msgs, busy, reduce]);

  const changeLang = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem("mitra_lang", l);
    } catch {}
    mitra.feel("starstruck", 1500);
  };

  async function joinFromChat(email: string) {
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
        body: JSON.stringify({ email, consent: true, interests: [], source: "mitra", lang, ref, t: Date.now() - openedAt.current }),
      });
      const data = (await res.json()) as { ok?: boolean; code?: string; error?: string };
      if (res.ok && data.ok) {
        try {
          if (data.code) localStorage.setItem("ea_code", data.code);
        } catch {}
        say({ from: "mitra", text: ui.joined[lang], actions: [{ type: "link", href: "/early-access", label: { en: "Get my share link", hi: "मेरा शेयर लिंक", es: "Mi enlace", fr: "Mon lien", de: "Mein Link", pt: "Meu link", ar: "رابطي" } }] }, "party");
      } else {
        say({ from: "mitra", text: res.status === 422 || res.status === 429 ? (data.error ?? ui.failed[lang]) : ui.failed[lang] }, "sad");
      }
    } catch {
      say({ from: "mitra", text: ui.failed[lang] }, "sad");
    } finally {
      setBusy(false);
      setFlow(null);
    }
  }

  async function handle(textRaw: string, forced?: string) {
    const text = textRaw.trim();
    if (!text || busy) return;
    const effectiveLang = detectLang(text, lang);
    if (effectiveLang !== lang) changeLang(effectiveLang);
    say({ from: "you", text });
    setInput("");

    // Guided invite flow
    if (flow?.step === "email") {
      if (EMAIL.test(text)) {
        setFlow({ step: "consent", email: text.toLowerCase() });
        say({ from: "mitra", text: ui.consent[effectiveLang], consent: true }, "grin");
      } else {
        say({ from: "mitra", text: ui.badEmail[effectiveLang] }, "confused");
      }
      return;
    }

    const intent = forced ? (intents.find((i) => i.id === forced) ?? null) : matchIntent(text);
    if (intent) {
      setBusy(true);
      mitra.feel("thinking", 0);
      await new Promise((r) => setTimeout(r, 420));
      setBusy(false);
      say({ from: "mitra", text: intent.reply[effectiveLang], actions: intent.actions }, intent.mood);
      return;
    }

    if (aiCalls.current >= SESSION_AI_LIMIT) {
      say({ from: "mitra", text: ui.limit[effectiveLang], actions: [{ type: "link", href: "/contact", label: { en: "Contact", hi: "संपर्क", es: "Contacto", fr: "Contact", de: "Kontakt", pt: "Contato", ar: "تواصل" } }] }, "relieved");
      return;
    }
    aiCalls.current++;
    setBusy(true);
    mitra.feel("thinking", 0);
    try {
      const history = [...msgs, { id: 0, from: "you" as const, text } as Msg]
        .filter((x) => !x.consent)
        .slice(-6)
        .map((x) => ({ role: x.from === "you" ? "user" : "assistant", content: x.text.slice(0, 600) }));
      while (history.length && history[0].role !== "user") history.shift();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: effectiveLang, messages: history }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string | null; mood?: Mood; source?: string };
      if (data.reply) {
        say({ from: "mitra", text: data.reply }, (data.mood as Mood) ?? "happy");
      } else if (data.source === "limit") {
        say({ from: "mitra", text: ui.limit[effectiveLang] }, "relieved");
      } else {
        say({ from: "mitra", text: ui.fallback[effectiveLang], actions: [{ type: "link", href: "/contact", label: { en: "Contact", hi: "संपर्क", es: "Contacto", fr: "Contact", de: "Kontakt", pt: "Contato", ar: "تواصل" } }] }, "confused");
      }
    } catch {
      say({ from: "mitra", text: ui.fallback[effectiveLang] }, "confused");
    } finally {
      setBusy(false);
    }
  }

  function runAction(a: Action) {
    if (a.type === "flow") {
      setFlow({ step: "email" });
      say({ from: "mitra", text: ui.askEmail[lang] }, "starstruck");
      inputRef.current?.focus();
    } else {
      mitra.setOpen(false);
    }
  }

  const dir = languages.find((l) => l.id === lang)?.dir ?? "ltr";

  return (
    <LazyMotion features={domAnimation} strict>
      <div ref={dockRef} className="mitra fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {open && (
            <m.section
              role="dialog"
              aria-label="Chat with Mitra"
              dir={dir}
              lang={lang}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              style={{ transformOrigin: "bottom right" }}
              className="flex h-[min(620px,calc(100dvh-7rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_30px_80px_-30px_rgba(19,26,51,.45)]"
            >
              <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                <button type="button" onClick={poke} className="h-11 w-11 shrink-0" aria-label="Poke Mitra">
                  <Face mood={mood} className="h-11 w-11" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold leading-tight">Mitra</p>
                  <p className="truncate text-xs text-slate">Site guide. Usually instant.</p>
                </div>
                <label className="sr-only" htmlFor="mitra-lang">
                  Language
                </label>
                <select
                  id="mitra-lang"
                  value={lang}
                  onChange={(e) => changeLang(e.target.value as Lang)}
                  className="h-9 rounded-full border border-line bg-paper px-2 text-sm"
                >
                  {languages.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => mitra.setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-paper" aria-label={ui.close[lang]}>
                  <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </header>

              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
                {msgs.map((msg) => (
                  <m.div
                    key={msg.id}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={msg.from === "you" ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={
                        msg.from === "you"
                          ? "max-w-[85%] rounded-2xl rounded-ee-md bg-indigo px-3.5 py-2.5 text-indigo-ink"
                          : "max-w-[90%] rounded-2xl rounded-es-md bg-paper px-3.5 py-2.5"
                      }
                    >
                      <p className="whitespace-pre-line text-[0.97rem] leading-relaxed">{msg.text}</p>
                      {msg.consent && flow?.step === "consent" ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" className="btn btn-primary !min-h-10 !px-4 text-sm" onClick={() => joinFromChat(flow.email)} disabled={busy}>
                            {ui.agree[lang]}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost !min-h-10 !px-4 text-sm"
                            onClick={() => {
                              setFlow(null);
                              mitra.feel("sad");
                            }}
                          >
                            {ui.cancel[lang]}
                          </button>
                          <Link href="/privacy" className="self-center text-xs text-slate underline" onClick={() => mitra.setOpen(false)}>
                            Privacy policy
                          </Link>
                        </div>
                      ) : null}
                      {msg.actions?.length ? (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {msg.actions.map((a) =>
                            a.type === "link" ? (
                              <Link key={a.href} href={a.href} onClick={() => runAction(a)} className="rounded-full border border-indigo/40 bg-surface px-3 py-1.5 text-sm font-semibold text-indigo hover:border-indigo">
                                {a.label[lang]}
                              </Link>
                            ) : (
                              <button key={a.flow} type="button" onClick={() => runAction(a)} className="rounded-full border border-indigo/40 bg-surface px-3 py-1.5 text-sm font-semibold text-indigo hover:border-indigo">
                                {a.label[lang]}
                              </button>
                            )
                          )}
                        </div>
                      ) : null}
                    </div>
                  </m.div>
                ))}
                {busy ? (
                  <div className="flex gap-1.5 px-1 py-2" aria-label="Mitra is typing">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-slate/60" style={{ animationDelay: `${i * 120}ms` }} />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="border-t border-line px-3 pb-3 pt-2.5">
                {msgs.length <= 1 ? (
                  <div className="mb-2.5 flex gap-2 overflow-x-auto pb-1">
                    {chips.map((c) => (
                      <button key={c.intent} type="button" onClick={() => (c.intent === "invite" ? runAction({ type: "flow", flow: "invite", label: c.label }) : handle(c.label[lang], c.intent))} className="shrink-0 rounded-full bg-indigo-soft px-3 py-1.5 text-sm font-medium text-ink">
                        {c.label[lang]}
                      </button>
                    ))}
                  </div>
                ) : null}
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handle(input);
                  }}
                >
                  <label htmlFor="mitra-input" className="sr-only">
                    {ui.placeholder[lang]}
                  </label>
                  <input
                    id="mitra-input"
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, 600))}
                    onFocus={() => mitra.feel("happy", 1500)}
                    placeholder={flow?.step === "email" ? "name@example.com" : ui.placeholder[lang]}
                    type={flow?.step === "email" ? "email" : "text"}
                    autoComplete={flow?.step === "email" ? "email" : "off"}
                    enterKeyHint="send"
                    className="field !min-h-11 !rounded-full"
                  />
                  <button type="submit" className="btn btn-primary !min-h-11 !px-4" disabled={busy || !input.trim()} aria-label={ui.send[lang]}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={dir === "rtl" ? "-scale-x-100" : ""}>
                      <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
                    </svg>
                  </button>
                </form>
                <p className="mt-2 px-1 text-[0.72rem] leading-snug text-slate">{ui.privacyNote[lang]}</p>
              </div>
            </m.section>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => {
            mitra.setOpen(!open);
            mitra.feel(open ? "sad" : "starstruck", 1600);
          }}
          onMouseEnter={() => !open && mitra.feel("happy", 1800)}
          className="mitra-dock-btn group relative h-16 w-16 rounded-full transition-[opacity,transform] duration-300 hover:-translate-y-0.5"
          aria-label={open ? "Close chat with Mitra" : "Chat with Mitra, the site guide"}
          aria-expanded={open}
        >
          <Face mood={mood} className="h-16 w-16 drop-shadow-[0_10px_18px_rgba(19,26,51,.25)]" />
          {!open && (
            <span className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-paper opacity-0 transition-opacity group-hover:opacity-100 sm:block">
              Need a hand?
            </span>
          )}
        </button>
      </div>
    </LazyMotion>
  );
}
