/** Public, browser-safe configuration. Only NEXT_PUBLIC_* values may be read here. */

function clean(v: string | undefined): string {
  return (v ?? "").trim();
}

export const ADSENSE_CLIENT = "ca-pub-4557897331416844";

export function safeHttpsUrl(raw: string | undefined, allowedHosts?: string[]): string | null {
  const v = clean(raw);
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:") return null;
    if (allowedHosts && !allowedHosts.includes(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Canonical origin is the apex domain; www redirects to it (next.config.ts). */
export const PRODUCTION_URL = "https://onemoregame.me";
const rawSiteUrl = clean(process.env.NEXT_PUBLIC_SITE_URL) || (process.env.NODE_ENV === "production" ? PRODUCTION_URL : "http://localhost:3000");

export const site = {
  name: "ONE MORE",
  tagline: "One minute. One challenge. One more.",
  description:
    "ONE MORE is a skill-first browser arcade game in open playtest, built around one-minute challenges, personal bests, friend challenges and Campus Clash competitions for schools and colleges. Play today's arena free in your browser.",
  url: rawSiteUrl.replace(/\/+$/, ""),
  contactEmail: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL) || "support@onemoregame.me",
  operatorName: clean(process.env.NEXT_PUBLIC_OPERATOR_NAME) || "Kartikeya Mishra",
  googleSiteVerification: clean(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION) || null,
  stores: {
    googlePlay: safeHttpsUrl(process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL, ["play.google.com"]),
    appStore: safeHttpsUrl(process.env.NEXT_PUBLIC_APP_STORE_URL, ["apps.apple.com"]),
  },
  ads: {
    /** AdSense publisher ID: used for site verification (meta tag + /ads.txt) even while ad units are switched off. */
    client: /^ca-pub-\d{10,20}$/.test(clean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT) || ADSENSE_CLIENT)
      ? clean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT) || ADSENSE_CLIENT
      : null,
    get enabled() {
      return clean(process.env.NEXT_PUBLIC_ADS_ENABLED) === "true" && this.client !== null;
    },
  },
  /** Last substantive content review date; update when public content changes materially. */
  contentUpdated: "2026-11-08",
} as const;

/** Public, indexable routes. The sitemap is generated from this list only. */
export const publicRoutes = [
  { path: "/", priority: 1.0 },
  { path: "/play", priority: 0.9 },
  { path: "/battle", priority: 0.9 },
  { path: "/shop", priority: 0.6 },
  { path: "/refunds", priority: 0.3 },
  { path: "/guides", priority: 0.9 },
  { path: "/changelog", priority: 0.5 },
  { path: "/editorial-policy", priority: 0.3 },
  { path: "/community", priority: 0.5 },
  { path: "/how-to-play", priority: 0.9 },
  { path: "/campus-clash", priority: 0.9 },
  { path: "/early-access", priority: 0.8 },
  { path: "/fair-play", priority: 0.6 },
  { path: "/faq", priority: 0.7 },
  { path: "/about", priority: 0.6 },
  { path: "/contact", priority: 0.4 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
  { path: "/cookies", priority: 0.2 },
  { path: "/developers", priority: 0.4 },
] as const;

export const privateRoutePrefixes = ["/verify", "/invite", "/unsubscribe", "/r/", "/api/", "/play/", "/c/", "/b/", "/account"] as const;

export function absoluteUrl(path: string): string {
  return `${site.url}${path === "/" ? "" : path}` || site.url;
}
