import { absoluteUrl, site } from "@/lib/site";

export const dynamic = "force-static";

/** Supplemental plain-text summary (llmstxt.org convention). Not a ranking signal; the HTML pages are the source of truth. */
export function GET() {
  const body = `# ${site.name}

> ${site.description}

Status (${site.contentUpdated}): open browser playtest. Anyone can play the daily shared arena and friend challenges with no sign-up; confirming an email unlocks Quick Play, the leaderboard, streaks and saved scores. Four power-ups and a different Daily twist each weekday. Friend challenges show the challenger's ghost. Scores are server-verified by replay. No mobile apps yet. Campus Clash is planned. Made by Kartikeya Mishra at SEEVE Tech.

## Pages
- [Play](${absoluteUrl("/play")}): play today's Daily Arena in the browser
- [Community](${absoluteUrl("/community")}): Discord, YouTube, Instagram, X, LinkedIn
- [Guides](${absoluteUrl("/guides")}): strategy, scoring maths, power-ups, Daily twists, tournaments, anti-cheat
- [Changelog](${absoluteUrl("/changelog")})
- [How to Play](${absoluteUrl("/how-to-play")}): run structure, controls, scoring, modes, accessibility
- [Campus Clash](${absoluteUrl("/campus-clash")}): planned school/college competition formats and organizer guide
- [Early Access](${absoluteUrl("/early-access")}): how requests, confirmation and invitations work
- [Fair Play](${absoluteUrl("/fair-play")}): competition and anti-cheating rules
- [FAQ](${absoluteUrl("/faq")})
- [About](${absoluteUrl("/about")})
- [Privacy](${absoluteUrl("/privacy")})
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
