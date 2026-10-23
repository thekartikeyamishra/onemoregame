import { getPosts } from "@/lib/blog";
import { absoluteUrl, lab, site } from "@/lib/site";

export const dynamic = "force-static";

/** llms.txt: a plain-text map of the site for AI assistants and answer engines (https://llmstxt.org). */
export function GET() {
  const posts = getPosts();
  const body = `# ${site.name}

> ${site.description}

${site.author.bio}

## Tools
- [App development cost calculator](${absoluteUrl("/tools/app-cost-calculator")}): free, no sign-up. Estimates build cost, effort and timeline for mobile and web apps by feature, platform, design depth, compliance level and team region (India, Eastern Europe, UK, US), in USD, INR, GBP or EUR. The full effort model and rates are published on the page.

## Articles
${posts.map((p) => `- [${p.title}](${absoluteUrl(`/blog/${p.slug}`)}): ${p.description}`).join("\n")}

## Services
- [Work with me](${absoluteUrl("/work-with-me")}): MVP development (Flutter, PWA, Next.js), AI features with cost controls, app rescue, DPDP Act and GDPR-ready data flows. Remote, for clients in India and worldwide.

## Early access
- [Early access](${absoluteUrl("/early-access")}): free invite-only list for apps in development:
${lab.map((p) => `  - ${p.codename} (${p.kind}): ${p.line}`).join("\n")}

## About
- [About ${site.name}](${absoluteUrl("/about")})
- [Contact](${absoluteUrl("/contact")})
- Location: ${site.location}
- GitHub: ${site.social.github}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
