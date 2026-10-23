"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  complianceLevels,
  currencies,
  defaultInputs,
  designLevels,
  estimate,
  features,
  formatMoney,
  formatRange,
  guessCurrency,
  leanPhase,
  parseInputs,
  platforms,
  serializeInputs,
  teams,
  type FeatureId,
  type Inputs,
} from "@/lib/cost-model";

function Choice<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  options: readonly { id: T; label: string; note?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="label !mb-3 font-display text-lg">{legend}</legend>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {options.map((o) => (
          <label
            key={o.id}
            className={`flex cursor-pointer flex-col rounded-2xl border-[1.5px] px-4 py-3 transition-colors ${
              value === o.id ? "border-indigo bg-indigo-soft" : "border-line bg-surface hover:border-slate/50"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} className="h-4 w-4 accent-[var(--indigo)]" />
              <span className="font-semibold">{o.label}</span>
            </span>
            {o.note ? <span className="mt-1 ps-6.5 text-sm text-slate">{o.note}</span> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function rateLabel(t: (typeof teams)[number], currency: Inputs["currency"]) {
  if (currency === "INR" && t.rateInr) return `₹${t.rateInr[0].toLocaleString("en-IN")}–${t.rateInr[1].toLocaleString("en-IN")}/hr`;
  const c = estimate({ ...defaultInputs, team: t.id, currency }).rate;
  return `${formatMoney(c[0], currency)}–${formatMoney(c[1], currency)}/hr`;
}

export function CostCalculator() {
  const [inputs, setInputs] = useState<Inputs>(defaultInputs);
  const [copied, setCopied] = useState(false);

  // Restore a shared estimate from the URL once on load.
  useEffect(() => {
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    // Shared links keep their currency; new visitors see their local one (₹ in India).
    setInputs(parseInputs({ ...params, cur: params.cur ?? guessCurrency() }));
  }, []);

  // Keep the URL shareable without adding history entries on every click.
  useEffect(() => {
    const t = setTimeout(() => {
      window.history.replaceState(null, "", `${window.location.pathname}?${serializeInputs(inputs)}`);
    }, 300);
    return () => clearTimeout(t);
  }, [inputs]);

  const result = useMemo(() => estimate(inputs), [inputs]);
  const lean = useMemo(() => leanPhase(inputs), [inputs]);
  // A second view of the same build, so nobody has to guess the rupee (or dollar) number.
  const alt = useMemo(() => estimate({ ...inputs, currency: inputs.currency === "INR" ? "USD" : "INR" }), [inputs]);
  const set = <K extends keyof Inputs>(k: K, v: Inputs[K]) => setInputs((p) => ({ ...p, [k]: v }));
  const toggle = (id: FeatureId) =>
    setInputs((p) => ({ ...p, features: p.features.includes(id) ? p.features.filter((f) => f !== id) : [...p.features, id] }));
  const money = (v: number) => formatMoney(v, inputs.currency);
  const team = teams.find((t) => t.id === inputs.team)!;

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: "My app cost estimate", url });
      else await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:items-start">
      <form className="space-y-10" onSubmit={(e) => e.preventDefault()} aria-label="App details">
        <Choice name="platform" legend="1. Where will it run?" options={platforms} value={inputs.platform} onChange={(v) => set("platform", v)} />

        <fieldset>
          <legend className="label !mb-1 font-display text-lg">2. What should it do?</legend>
          <p className="mb-3 text-sm text-slate">
            {inputs.features.length} selected. Pick only what version one truly needs.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {features.map((f) => {
              const on = inputs.features.includes(f.id);
              return (
                <label
                  key={f.id}
                  className={`flex cursor-pointer gap-3 rounded-2xl border-[1.5px] px-4 py-3 transition-colors ${
                    on ? "border-indigo bg-indigo-soft" : "border-line bg-surface hover:border-slate/50"
                  }`}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(f.id)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--indigo)]" />
                  <span>
                    <span className="block font-semibold leading-snug">{f.label}</span>
                    <span className="mt-0.5 block text-sm text-slate">{f.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Choice name="design" legend="3. How polished should it look?" options={designLevels} value={inputs.design} onChange={(v) => set("design", v)} />
        <Choice name="compliance" legend="4. How sensitive is the data?" options={complianceLevels} value={inputs.compliance} onChange={(v) => set("compliance", v)} />

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="team" className="label font-display text-lg">
              5. Who builds it?
            </label>
            <select id="team" className="field" value={inputs.team} onChange={(e) => set("team", e.target.value as Inputs["team"])}>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({rateLabel(t, inputs.currency)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="currency" className="label font-display text-lg">
              Currency
            </label>
            <select id="currency" className="field" value={inputs.currency} onChange={(e) => set("currency", e.target.value as Inputs["currency"])}>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      <section aria-labelledby="estimate-title" aria-live="polite" className="rounded-3xl border border-line bg-surface p-6 sm:p-7 lg:sticky lg:top-24">
        <h2 id="estimate-title" className="text-sm font-semibold text-slate" style={{ fontFamily: "var(--font-sans)", letterSpacing: 0 }}>
          Estimated build cost, full scope
        </h2>
        <p className="mt-2 font-display text-[clamp(2rem,1.5rem+2vw,2.9rem)] font-extrabold leading-tight">{formatRange(result.cost, inputs.currency)}</p>
        <p className="mt-1.5 text-sm text-slate">
          {inputs.currency === "INR"
            ? result.pricing === "domestic-inr"
              ? `At Indian domestic rates (${rateLabel(team, "INR")}). The same team typically charges international clients ${formatRange(alt.cost, "USD")}.`
              : `Converted at about ₹95 per $1: ${formatRange(alt.cost, "USD")}.`
            : alt.pricing === "domestic-inr"
              ? `For a client in India, this team would typically charge ${formatRange(alt.cost, "INR")} at domestic rupee rates.`
              : `About ${formatRange(alt.cost, "INR")} in rupees.`}
        </p>

        {lean ? (
          <div className="mt-5 rounded-2xl bg-indigo-soft p-4">
            <p className="text-sm font-semibold">Or start with a phase 1</p>
            <p className="mt-0.5 font-display text-2xl font-extrabold">{formatRange(lean.estimate.cost, inputs.currency)}</p>
            <p className="mt-1 text-sm text-slate">
              Same features, {lean.inputs.platform !== inputs.platform ? "one platform first" : "same platform"}
              {lean.inputs.design !== inputs.design ? " and a clean UI-kit design" : ""}, about {lean.estimate.weeks[0]}–{lean.estimate.weeks[1]} weeks. Add the
              rest once real users prove what matters.
            </p>
            <button type="button" onClick={() => setInputs(lean.inputs)} className="mt-2 text-sm font-semibold text-indigo hover:underline">
              Show phase 1 in the calculator
            </button>
          </div>
        ) : null}

        <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-line py-5 text-sm">
          <div>
            <dt className="text-slate">Effort</dt>
            <dd className="text-base font-semibold">
              {result.hours[0].toLocaleString()}–{result.hours[1].toLocaleString()} hrs
            </dd>
          </div>
          <div>
            <dt className="text-slate">Calendar time</dt>
            <dd className="text-base font-semibold">
              {result.weeks[0]}–{result.weeks[1]} weeks
            </dd>
          </div>
          <div>
            <dt className="text-slate">Yearly maintenance</dt>
            <dd className="text-base font-semibold">{formatRange(result.maintenancePerYear, inputs.currency)}</dd>
          </div>
          <div>
            <dt className="text-slate">Store fees, year one</dt>
            <dd className="text-base font-semibold">{money(result.storeFees.firstYear)}</dd>
          </div>
        </dl>

        <details className="group mt-4">
          <summary className="cursor-pointer list-none font-semibold text-indigo">
            <span className="group-open:hidden">Show the line-by-line breakdown</span>
            <span className="hidden group-open:inline">Hide breakdown</span>
          </summary>
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">Hours by line item</caption>
            <thead>
              <tr className="text-left text-slate">
                <th className="py-1.5 font-medium">Item</th>
                <th className="py-1.5 text-right font-medium">Hours</th>
              </tr>
            </thead>
            <tbody>
              {result.lines.map((l) => (
                <tr key={l.label} className="border-t border-line">
                  <td className="py-1.5 pe-3">{l.label}</td>
                  <td className="whitespace-nowrap py-1.5 text-right tabular-nums">
                    {l.hours[0]}–{l.hours[1]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate">
            {result.storeFees.note} Timeline assumes {team.devs === 1 ? "one developer" : `about ${team.devs} people`} at 30
            productive hours a week each.
          </p>
        </details>

        <div className="mt-6 flex flex-col gap-2.5">
          <Link href={`/work-with-me?estimate=${encodeURIComponent(serializeInputs(inputs))}`} className="btn btn-primary">
            Get a fixed quote for this
          </Link>
          <button type="button" onClick={share} className="btn btn-ghost">
            {copied ? "Link copied" : "Share this estimate"}
          </button>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate">
          A market range from published rates, not a quote. A real quote often lands below the top of this range once the
          scope is written down, because uncertainty is what the upper end prices in.
        </p>
      </section>
    </div>
  );
}
