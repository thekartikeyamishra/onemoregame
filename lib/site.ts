/**
 * Single source of truth for brand, links and launch switches.
 * Edit this file (or the matching env vars) — never hard-code these elsewhere.
 */

// NOTE: env vars must be referenced literally (process.env.NEXT_PUBLIC_X) so Next.js can inline them into client code.
const v = (value: string | undefined, fallback = "") => value?.trim() || fallback;

export const site = {
  name: "Kartikeya Mishra",
  shortName: "Kartikeya",
  /** Must match the domain marked as primary in Vercel → Settings → Domains. */
  url: v(process.env.NEXT_PUBLIC_SITE_URL, "https://www.kartikeyamishra.info").replace(/\/$/, ""),
  locale: "en_IN",
  title: "Kartikeya Mishra — independent app & AI product engineer",
  description:
    "Kartikeya Mishra builds AI-native mobile apps, PWAs and SaaS from Lucknow, India. Free app cost calculator, practical guides and invite-only early access.",
  tagline: "I build apps people keep using.",
  location: "Lucknow, India",
  /** Shown in the hero badge. Keep it true. */
  availability: v(process.env.NEXT_PUBLIC_AVAILABILITY, "Open to new client projects"),
  email: v(process.env.NEXT_PUBLIC_CONTACT_EMAIL, "workmailkartikeya@gmail.com"),
  social: {
    github: "https://github.com/thekartikeyamishra",
    linkedin: v(process.env.NEXT_PUBLIC_LINKEDIN_URL),
    x: v(process.env.NEXT_PUBLIC_X_URL, ""),
  },
  author: {
    name: "Kartikeya Mishra",
    role: "Independent full-stack & AI product engineer",
    bio: "Solo founder and engineer based in Lucknow, India. I design, build and ship mobile apps, PWAs and AI-powered SaaS for clients and for my own studio, with a focus on privacy law (DPDP Act, GDPR), unit economics and fast, accessible interfaces.",
    knowsAbout: [
      "Flutter",
      "Firebase",
      "Next.js",
      "Node.js",
      "LLM application engineering",
      "Retrieval-augmented generation",
      "Progressive web apps",
      "DPDP Act compliance",
      "GDPR compliance",
      "App development cost estimation",
    ],
  },
} as const;

/**
 * App store links. Leave empty while the app is unreleased — buttons render as
 * "Coming soon". Paste the listing URL (env or here) and they become live links.
 */
export const stores = {
  playStore: v(process.env.NEXT_PUBLIC_PLAY_STORE_URL),
  appStore: v(process.env.NEXT_PUBLIC_APP_STORE_URL),
};

/**
 * Invite-only lab. Codenames keep curiosity high and keep public claims
 * modest: nothing here promises features, dates or prices.
 * `id` is stored with each sign-up so you can measure demand per project.
 */
export const lab = [
  {
    id: "project-01",
    codename: "Project 01",
    kind: "AI-native mobile app for iOS and Android",
    line: "A personal assistant that finishes small tasks instead of just reminding you about them.",
    status: "Private build",
  },
  {
    id: "project-02",
    codename: "Project 02",
    kind: "Web app for small teams",
    line: "Turns scattered client requests into a priced, trackable plan in minutes.",
    status: "Design partner phase",
  },
  {
    id: "project-03",
    codename: "Project 03",
    kind: "Developer tool",
    line: "Shows what each AI feature in your product costs per user, before the bill arrives.",
    status: "Research",
  },
] as const;

export type LabId = (typeof lab)[number]["id"];

/**
 * Google AdSense. Publisher and slot IDs are public (they appear in every page's HTML),
 * so they live here as defaults. Env vars override them; set an env var to "off" to
 * disable a single unit, or NEXT_PUBLIC_ADSENSE_CLIENT=off to remove ads entirely.
 */
const adEnv = (value: string | undefined, fallback: string) => {
  const x = value?.trim();
  if (x === "off") return "";
  return x || fallback;
};

export type AdFormat = "in-article" | "responsive";

export const ads = {
  client: adEnv(process.env.NEXT_PUBLIC_ADSENSE_CLIENT, "ca-pub-4557897331416844"),
  /** Real ads only on the production deployment; previews and localhost request test ads. */
  test: (process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV) !== "production",
  slots: {
    inArticle: { id: adEnv(process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE, "2364694405"), format: "in-article" as AdFormat },
    endOfArticle: { id: adEnv(process.env.NEXT_PUBLIC_ADSENSE_SLOT_END_ARTICLE, "1212676091"), format: "in-article" as AdFormat },
    toolResult: { id: adEnv(process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOOL, "8546959374"), format: "responsive" as AdFormat },
  },
};

export const nav = [
  { href: "/tools/app-cost-calculator", label: "Cost calculator" },
  { href: "/blog", label: "Writing" },
  { href: "/work-with-me", label: "Work with me" },
  { href: "/about", label: "About" },
] as const;

/** Registrable domain without "www.", for same-site checks that must accept both hosts. */
export const rootDomain = () => new URL(site.url).host.replace(/^www\./, "");
export const isOwnHost = (host: string) => {
  const h = host.toLowerCase().replace(/:\d+$/, "");
  const root = rootDomain();
  return h === root || h.endsWith(`.${root}`);
};

export const absoluteUrl = (path = "/") => `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
