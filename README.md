# kartikeyamishra.info

Personal site and studio hub for Kartikeya Mishra: invite-only early access for upcoming apps, a free app cost calculator, long-form writing, client project intake, and Mitra, an animated multilingual site guide.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Motion · Firebase Admin (Firestore) · Resend · Upstash Redis · optional LLM (Anthropic or any OpenAI-compatible API).

## What's in it

| Area | Where | Notes |
|---|---|---|
| Home | `app/page.tsx` | Hero with live mascot, the lab (invite-only projects), calculator teaser, process, writing, FAQ |
| Early access | `app/early-access`, `app/api/waitlist/*` | Double opt-in, referral links, fraud scoring and penalties, one-click unsubscribe = deletion |
| Cost calculator | `app/tools/app-cost-calculator`, `lib/cost-model.ts` | Fully client-side, shareable URLs, published methodology |
| Blog | `content/blog/*.md`, `lib/blog.ts` | Markdown + front matter, TOC, FAQ schema, related posts, RSS, pagination |
| Projects | `app/work-with-me`, `app/contact`, `app/api/inquiry` | Lead capture with budget and timeline |
| Mitra | `components/mascot/*`, `lib/mitra/knowledge.ts`, `app/api/chat` | 18 emoji-style expressions, eyes follow the pointer, naps when idle, 7 languages, guided sign-up, AI fallback with hard cost caps |
| Ads | `components/AdSlot.tsx`, `app/ads.txt`, `lib/site.ts → ads` | Publisher `ca-pub-4557897331416844` and your 3 units configured; labelled, lazy, CLS-safe, content pages only; test ads on previews |
| SEO | `app/sitemap.ts`, `app/robots.ts`, `app/llms.txt`, `lib/seo.ts`, `components/JsonLd.tsx` | Canonicals, OG images per page, Person/WebSite/BlogPosting/FAQ/Breadcrumb/WebApplication schema |
| Legal | `app/privacy`, `app/terms`, `app/disclaimer` | Written for DPDP Act + GDPR; have a lawyer review before launch |

The old resume has been removed; `/resume`, `/cv` and `/portfolio` redirect to `/about`.

## Run it locally (Windows / PowerShell)

```powershell
# Node 20.9+ (22 LTS recommended)
npm install
Copy-Item .env.example .env.local   # fill in what you have; everything is optional locally
npm run dev                          # http://localhost:3000
```

Without Firebase configured, sign-ups and forms are accepted and logged to the terminal in development, so you can test the UI.

Before every deploy:

```powershell
npm run typecheck
npm run check:content   # blog quality gate: length, metadata, internal links
npm run build
```

## Deploy (Vercel)

1. Push this folder to `thekartikeyamishra/kartikeyamishraportfolio` (replace the old create-next-app files).
2. Import the repo in Vercel. Framework: Next.js; no build settings needed.
3. Add environment variables from `.env.example`. **Required in production:** `HASH_SALT`, `APP_SECRET`, `CRON_SECRET`, and Firebase credentials.
4. Domains: keep `www.kartikeyamishra.info` as primary and `kartikeyamishra.info` set to **Redirect to www.kartikeyamishra.info (308)**. The code never redirects between the two; Vercel does. If you ever make the bare domain primary, also set `NEXT_PUBLIC_SITE_URL=https://kartikeyamishra.info`, or canonical URLs will point at a redirect.
5. Firebase: create a project, enable Firestore (production mode), then deploy rules and indexes:
   ```powershell
   npm i -g firebase-tools; firebase login; firebase use <project-id>
   firebase deploy --only firestore:rules,firestore:indexes
   ```
   Create a service account (Project settings → Service accounts → Generate key) and put it in `FIREBASE_SERVICE_ACCOUNT_BASE64`.
6. Resend: verify your domain, set `RESEND_API_KEY` and `EMAIL_FROM`. This turns on double opt-in (referrals only count after confirmation).
7. Upstash Redis (free tier is enough): set the two `UPSTASH_*` vars so rate limits and the AI answer cache are shared across serverless instances.
8. Optional AI: set `AI_API_KEY` (and `AI_PROVIDER`/`AI_MODEL`). Without it Mitra answers from its scripted knowledge only, at zero cost.

Then work through [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md).

## Everyday edits

- **Ads on/off:** set `NEXT_PUBLIC_ADSENSE_CLIENT=off` (all ads) or a slot var to `off` (one unit) in Vercel and redeploy.
- **Brand, links, availability badge, lab projects, store URLs, ad slots:** `lib/site.ts` (or the env vars it reads).
- **Store buttons go live:** set `NEXT_PUBLIC_PLAY_STORE_URL` / `NEXT_PUBLIC_APP_STORE_URL` and redeploy. Empty = "Coming soon".
- **New article:** add `content/blog/my-new-slug.md` (copy an existing post's front matter), run `npm run check:content`, commit. Sitemap, RSS, llms.txt, OG image and related links update automatically.
- **Mitra answers:** `lib/mitra/knowledge.ts`. Check the `mitra_questions` collection monthly and turn the most-asked unanswered questions into new intents: each one you add is a question that never costs an AI call again.
- **Cost model rates/FX:** `lib/cost-model.ts`; bump `MODEL_REVIEWED` when you do.
- **Brand colours:** tokens at the top of `app/globals.css` (Ink `#131A33`, Paper `#F6F7FB`, Indigo `#4338FF`, Marigold `#FFB627`, Slate `#5B6478`, Mint `#0E9F6E`). Fonts: Bricolage Grotesque (display) and Figtree (text), self-hosted in `app/fonts`.

## Data model (Firestore)

| Collection | Contents |
|---|---|
| `waitlist/{sha256(canonical email)}` | email, code, interests, role, country, ipHash, confirmed, referredBy, referralStatus, referrals, voided, flagged, risk |
| `codes/{code}` | `{ id }` lookup for referral links |
| `stats/waitlist` | totals by interest, role and country: your demand signal per project |
| `inquiries/*` | project and contact messages |
| `mitra_questions/*` | anonymised unanswered chat questions with counts |

More detail: [`docs/SECURITY.md`](docs/SECURITY.md), [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md), [`docs/ADSENSE_AND_REVENUE.md`](docs/ADSENSE_AND_REVENUE.md), [`docs/BACKLINKS.md`](docs/BACKLINKS.md).
