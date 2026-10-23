/**
 * App cost model used by /tools/app-cost-calculator.
 *
 * Every number here is an assumption that is published on the tool page
 * (transparency is what makes the tool trustworthy and citable).
 * Hours are effort for one experienced engineer, before platform multipliers.
 * Review rates and FX at least once a quarter and bump MODEL_REVIEWED.
 */

export const MODEL_REVIEWED = "October 2026";

export type Range = readonly [low: number, high: number];

export const features = [
  { id: "auth", label: "Sign-in (email, Google, Apple)", hours: [24, 40], hint: "Accounts, password reset, social login, session handling." },
  { id: "profiles", label: "User profiles & settings", hours: [16, 32], hint: "Editable profile, preferences, avatar upload." },
  { id: "push", label: "Push notifications", hours: [12, 24], hint: "FCM / APNs setup, permission prompts, notification preferences." },
  { id: "payments", label: "Payments or subscriptions", hours: [40, 80], hint: "Store billing or Stripe/Razorpay, receipts, refunds, webhooks." },
  { id: "chat", label: "In-app chat or messaging", hours: [60, 120], hint: "Real-time messages, read state, media, moderation hooks." },
  { id: "maps", label: "Maps & location", hours: [24, 56], hint: "Map views, geocoding, location permissions, distance search." },
  { id: "media", label: "Photo / video upload", hours: [20, 48], hint: "Capture, compression, storage, upload progress, retries." },
  { id: "offline", label: "Works offline (sync later)", hours: [40, 96], hint: "Local database, conflict handling, background sync." },
  { id: "admin", label: "Admin dashboard", hours: [48, 100], hint: "Web panel to manage users, content and reports." },
  { id: "ai", label: "AI feature (LLM chat, summaries, search)", hours: [40, 110], hint: "Prompting, retrieval, cost controls, abuse limits, evals." },
  { id: "search", label: "Search & filters", hours: [16, 40], hint: "Indexed search, filters, sorting, empty states." },
  { id: "booking", label: "Booking or calendar", hours: [40, 90], hint: "Availability, time zones, reminders, cancellations." },
  { id: "feed", label: "Social feed (posts, likes, comments)", hours: [48, 110], hint: "Feed ranking, pagination, reporting and blocking." },
  { id: "i18n", label: "Multiple languages", hours: [16, 40], hint: "String extraction, RTL support, translated store listings." },
  { id: "integrations", label: "Third-party integrations", hours: [24, 64], hint: "CRMs, accounting, shipping or other external APIs." },
  { id: "analytics", label: "Product analytics", hours: [8, 20], hint: "Event tracking plan, funnels, crash reporting." },
] as const satisfies ReadonlyArray<{ id: string; label: string; hours: Range; hint: string }>;

export type FeatureId = (typeof features)[number]["id"];

export const platforms = [
  { id: "pwa", label: "Web app (PWA)", factor: [0.8, 0.9], note: "One codebase in the browser; installable, no store review." },
  { id: "single", label: "One platform (iOS or Android)", factor: [1, 1], note: "Fastest way to validate with one audience." },
  { id: "cross", label: "iOS + Android, cross-platform", factor: [1.2, 1.35], note: "Flutter or React Native: one codebase, two stores." },
  { id: "native", label: "iOS + Android, fully native", factor: [1.8, 1.95], note: "Swift + Kotlin: two codebases, two teams of effort." },
] as const satisfies ReadonlyArray<{ id: string; label: string; factor: Range; note: string }>;

export const designLevels = [
  { id: "kit", label: "Clean, based on a UI kit", hours: [24, 48] },
  { id: "custom", label: "Custom design system", hours: [60, 120] },
  { id: "premium", label: "Custom + motion & illustration", hours: [110, 200] },
] as const satisfies ReadonlyArray<{ id: string; label: string; hours: Range }>;

export const complianceLevels = [
  { id: "basic", label: "Standard privacy (policy, consent, data export/delete)", factor: [1.04, 1.08] },
  { id: "strict", label: "Personal data at scale (DPDP Act / GDPR programme)", factor: [1.1, 1.18] },
  { id: "regulated", label: "Regulated (health, finance, children)", factor: [1.22, 1.35] },
] as const satisfies ReadonlyArray<{ id: string; label: string; factor: Range }>;

/**
 * Hourly rates, rounded from published 2026 rate cards and agency pricing guides.
 *  - `rate`: USD per hour charged to international clients (export pricing).
 *  - `rateInr`: ₹ per hour Indian teams typically charge Indian clients (domestic pricing).
 *    Domestic rates are much lower than export rates, so converting export dollars to rupees
 *    would overstate Indian prices; INR estimates for Indian teams use these instead.
 *    The floor excludes very junior freelancers (₹300–600/hr), whose quotes rarely include
 *    testing, store release or support.
 */
export const teams = [
  { id: "in-freelance", label: "Freelancer in India", rate: [15, 30], rateInr: [600, 1500], devs: 1 },
  { id: "in-agency", label: "Agency in India", rate: [25, 50], rateInr: [1200, 2800], devs: 2.5 },
  { id: "ee-agency", label: "Agency in Eastern Europe", rate: [40, 80], rateInr: null, devs: 2.5 },
  { id: "uk-agency", label: "Agency in the UK", rate: [75, 140], rateInr: null, devs: 3 },
  { id: "us-agency", label: "Agency in the US", rate: [100, 200], rateInr: null, devs: 3 },
] as const satisfies ReadonlyArray<{ id: string; label: string; rate: Range; rateInr: Range | null; devs: number }>;

export const currencies = [
  { id: "USD", symbol: "$", perUsd: 1, locale: "en-US" },
  { id: "INR", symbol: "₹", perUsd: 95, locale: "en-IN" },
  { id: "GBP", symbol: "£", perUsd: 0.75, locale: "en-GB" },
  { id: "EUR", symbol: "€", perUsd: 0.86, locale: "de-DE" },
] as const;

export type PlatformId = (typeof platforms)[number]["id"];
export type DesignId = (typeof designLevels)[number]["id"];
export type ComplianceId = (typeof complianceLevels)[number]["id"];
export type TeamId = (typeof teams)[number]["id"];
export type CurrencyId = (typeof currencies)[number]["id"];

export type Inputs = {
  platform: PlatformId;
  features: FeatureId[];
  design: DesignId;
  compliance: ComplianceId;
  team: TeamId;
  currency: CurrencyId;
};

export const defaultInputs: Inputs = {
  platform: "cross",
  features: ["auth", "profiles", "push", "payments", "analytics"],
  design: "custom",
  compliance: "basic",
  team: "in-agency",
  currency: "USD",
};

/** Fixed work every real project has, regardless of features. */
const FOUNDATION: Range = [40, 64]; // architecture, CI/CD, environments, store setup
const QA_SHARE: Range = [0.18, 0.25]; // testing & bug fixing as a share of build effort
const PM_SHARE: Range = [0.08, 0.12]; // scoping, communication, release management
const PRODUCTIVE_HOURS_PER_DEV_WEEK = 30;

export type LineItem = { label: string; hours: Range };

export type Pricing = "domestic-inr" | "export";

/** All money values are in `currency`. */
export type Estimate = {
  currency: CurrencyId;
  pricing: Pricing;
  /** Hourly rate actually applied, in `currency` */
  rate: Range;
  lines: LineItem[];
  hours: Range;
  cost: Range;
  weeks: Range;
  maintenancePerYear: Range;
  storeFees: { firstYear: number; note: string };
};

const add = (a: Range, b: Range): Range => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Range, f: Range): Range => [a[0] * f[0], a[1] * f[1]];
const round = (r: Range, step = 1): Range => [Math.round(r[0] / step) * step, Math.round(r[1] / step) * step];

export function estimate(input: Inputs): Estimate {
  const platform = platforms.find((p) => p.id === input.platform) ?? platforms[2];
  const design = designLevels.find((d) => d.id === input.design) ?? designLevels[1];
  const compliance = complianceLevels.find((c) => c.id === input.compliance) ?? complianceLevels[0];
  const team = teams.find((t) => t.id === input.team) ?? teams[1];

  const chosen = features.filter((f) => input.features.includes(f.id));
  const featureHours = chosen.reduce<Range>((sum, f) => add(sum, f.hours), [0, 0]);

  // Engineering scales with platform choice; design mostly does not.
  const engineering = mul(add(FOUNDATION, featureHours), platform.factor);
  const designHours: Range = design.hours;
  const build = add(engineering, designHours);
  const qa = mul(build, QA_SHARE);
  const pm = mul(build, PM_SHARE);
  const subtotal = add(add(build, qa), pm);
  const total = round(mul(subtotal, compliance.factor), 5);
  const complianceHours = round([total[0] - subtotal[0], total[1] - subtotal[1]], 1);

  const lines: LineItem[] = [
    { label: "Project foundation (architecture, CI/CD, store setup)", hours: round(mul(FOUNDATION, platform.factor)) },
    ...chosen.map((f) => ({ label: f.label, hours: round(mul(f.hours, platform.factor)) })),
    { label: `Design: ${design.label.toLowerCase()}`, hours: designHours },
    { label: "Testing & bug fixing", hours: round(qa) },
    { label: "Project management & releases", hours: round(pm) },
    { label: "Privacy & compliance work", hours: complianceHours },
  ];

  const cur = currencies.find((c) => c.id === input.currency) ?? currencies[0];
  const pricing: Pricing = cur.id === "INR" && team.rateInr ? "domestic-inr" : "export";
  const rate: Range = pricing === "domestic-inr" && team.rateInr ? team.rateInr : [team.rate[0] * cur.perUsd, team.rate[1] * cur.perUsd];
  const step = cur.id === "INR" ? 5000 : 100;
  const cost = round([total[0] * rate[0], total[1] * rate[1]], step);
  const weeklyCapacity = team.devs * PRODUCTIVE_HOURS_PER_DEV_WEEK;
  const weeks: Range = [Math.max(2, Math.ceil(total[0] / weeklyCapacity)), Math.max(3, Math.ceil(total[1] / weeklyCapacity))];
  const maintenancePerYear = round([cost[0] * 0.15, cost[1] * 0.2], step);

  const fee = (usd: number) => Math.round(usd * cur.perUsd);
  const storeFees =
    platform.id === "pwa"
      ? { firstYear: 0, note: "No store fees for a PWA, only your domain and hosting." }
      : platform.id === "single"
        ? { firstYear: fee(99), note: "iOS: Apple Developer Program, $99 a year. Android: Google Play, $25 once." }
        : { firstYear: fee(124), note: "Apple $99 a year plus Google Play $25 once." };

  return { currency: cur.id, pricing, rate, lines, hours: total, cost, weeks, maintenancePerYear, storeFees };
}

/**
 * A smaller first phase with the same features: one platform instead of two and a
 * UI-kit design. Returned only when it's meaningfully cheaper, so the calculator can show
 * a realistic starting point instead of only the full-build number.
 */
export function leanPhase(input: Inputs): { inputs: Inputs; estimate: Estimate } | null {
  const lean: Inputs = {
    ...input,
    platform: input.platform === "cross" || input.platform === "native" ? "single" : input.platform,
    design: "kit",
  };
  if (lean.platform === input.platform && lean.design === input.design) return null;
  const full = estimate(input);
  const e = estimate(lean);
  return e.cost[1] < full.cost[1] * 0.85 ? { inputs: lean, estimate: e } : null;
}

/** Formats an amount that is already in `currency`, using Indian digit grouping for ₹. */
export function formatMoney(value: number, currency: CurrencyId): string {
  const c = currencies.find((x) => x.id === currency) ?? currencies[0];
  return new Intl.NumberFormat(c.locale, {
    style: "currency",
    currency: c.id,
    maximumFractionDigits: 0,
    notation: value >= 10_000_000 ? "compact" : "standard",
  }).format(value);
}

/* ---------- URL state (shareable, crawlable estimates) ---------- */

const ids = <T extends { id: string }>(list: readonly T[]) => list.map((x) => x.id) as string[];

export function parseInputs(params: Record<string, string | string[] | undefined>): Inputs {
  const one = (k: string) => (Array.isArray(params[k]) ? params[k]?.[0] : params[k]) as string | undefined;
  const pick = <T extends string>(value: string | undefined, allowed: string[], fallback: T): T =>
    value && allowed.includes(value) ? (value as T) : fallback;
  const f = one("f");
  const featureList = f === undefined ? defaultInputs.features : f.split(",").filter((x) => ids(features).includes(x));
  return {
    platform: pick(one("p"), ids(platforms), defaultInputs.platform),
    features: featureList as FeatureId[],
    design: pick(one("d"), ids(designLevels), defaultInputs.design),
    compliance: pick(one("c"), ids(complianceLevels), defaultInputs.compliance),
    team: pick(one("t"), ids(teams), defaultInputs.team),
    currency: pick(one("cur"), ids(currencies), defaultInputs.currency),
  };
}

export function serializeInputs(i: Inputs): string {
  const q = new URLSearchParams({ p: i.platform, f: i.features.join(","), d: i.design, c: i.compliance, t: i.team, cur: i.currency });
  return q.toString();
}

/** Human-friendly range. Rupees use lakh/crore, the way Indian clients compare quotes. */
export function formatRange([lo, hi]: Range, currency: CurrencyId): string {
  if (currency === "INR" && hi >= 100_000) {
    const crore = hi >= 10_000_000;
    const unit = crore ? 10_000_000 : 100_000;
    const f = (n: number) => {
      const x = n / unit;
      return x >= 10 ? Math.round(x).toString() : (Math.round(x * 10) / 10).toString();
    };
    return `₹${f(lo)} – ${f(hi)} ${crore ? "crore" : "lakh"}`;
  }
  return `${formatMoney(lo, currency)} – ${formatMoney(hi, currency)}`;
}

/** Default currency for a visitor: rupees for India, pounds for the UK, euros for the eurozone, else dollars. */
export function guessCurrency(): CurrencyId {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const lang = (navigator.languages?.[0] || navigator.language || "").toLowerCase();
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta" || lang.endsWith("-in")) return "INR";
    if (tz === "Europe/London" || lang === "en-gb") return "GBP";
    if (/^Europe\/(Berlin|Paris|Madrid|Rome|Amsterdam|Brussels|Vienna|Dublin|Lisbon|Helsinki|Athens)$/.test(tz)) return "EUR";
  } catch {}
  return "USD";
}
