# Launch checklist

Work top to bottom. Items marked **[done in code]** are already implemented; the rest need you, because they happen in your accounts.

## 1. Technical SEO

| Item | Status |
|---|---|
| sitemap.xml (pages, posts, pagination, OG images) | [done in code] `app/sitemap.ts`, auto-updates per post |
| robots.txt (allows all crawlers incl. AI assistants; blocks `/api/`) | [done in code] `app/robots.ts` |
| No noindex on public pages | [done in code] only `/early-access/status`, 404 and `/api/*` are noindex |
| Canonical tag on every page (self-referencing, apex domain) | [done in code] `lib/seo.ts → pageMeta()` |
| Unique meta title (≤ 62 chars) and description (110–160) per page | [done in code] `npm run check:content` enforces it for posts |
| Exactly one H1 per page, no skipped heading levels | [done in code] verified across all sitemap URLs; markdown `#` is demoted to H2 |
| Alt text on images | [done in code] SVGs have `role="img"` + labels; markdown images require alt text |
| Schema markup | [done in code] Person, WebSite, Blog, BlogPosting, BreadcrumbList, FAQPage, WebApplication, ProfessionalService, ProfilePage, ContactPage |
| Internal links | [done in code] nav, footer, related posts, in-article links (3+ per post), calculator ↔ posts |
| Broken links | [done in code] none at build; re-check after edits with any crawler |
| Compressed images | [done in code] no raster images shipped; OG images generated as PNG at build; fonts are subset woff2 |
| Core Web Vitals | [done in code] local mobile Lighthouse: Performance 95–98, CLS 0, see `PERFORMANCE.md` |
| Mobile responsiveness (320 px → 4K) | [done in code] fluid type, no horizontal scroll at 390 px |
| HTTPS enforced | [done in code] HSTS header with preload; Vercel redirects HTTP → HTTPS |
| Clean URL slugs | [done in code] post file name = slug; old URLs redirect (`/resume`, `/cv`, `/portfolio`, `/projects`, `/hire`, `/waitlist`) |
| OG/Twitter image per page | [done in code] `opengraph-image.tsx` for home, calculator and every post |
| RSS feed and llms.txt for AI assistants | [done in code] `/feed.xml`, `/llms.txt` |

## 2. Search Console and Bing (you)

1. Google Search Console → Add property → **Domain** `kartikeyamishra.info` → verify with the DNS TXT record at your registrar (most robust). Alternatively choose URL-prefix and paste the HTML-tag token into `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
2. Sitemaps → submit `https://kartikeyamishra.info/sitemap.xml`.
3. URL Inspection → request indexing for `/`, `/tools/app-cost-calculator`, `/blog` and each post.
4. Bing Webmaster Tools → import from Google Search Console (one click). Bing powers several AI assistants' web results.
5. Weekly for the first two months: check Pages (indexed vs excluded) and Core Web Vitals reports.

## 3. Before applying to AdSense (you)

AdSense rejects sites for "low-value content" when there isn't enough original, useful material, or the site looks new and unmaintained. This build fixes the structural causes (server-rendered pages, real tool with published methodology, named author, About/Contact/Privacy/Terms, ads.txt). The remaining factor is **time and volume**, which only you can add:

- [ ] Site live and indexed for at least 3–4 weeks.
- [ ] At least **20–30 original articles** (10 are included) of 1,000+ words, published steadily (2 per week works), each passing `npm run check:content`. Write from your own projects: numbers, screenshots, decisions. Don't publish AI-spun or rewritten content; it's exactly what the policy targets.
- [ ] Some genuine traffic in Search Console (impressions growing week on week).
- [ ] Privacy policy reviewed by a lawyer; contact email working.
- [x] AdSense tag (`ca-pub-4557897331416844`), `ads.txt` and the `google-adsense-account` meta tag are built in. After deploying, open `https://kartikeyamishra.info/ads.txt` and confirm it shows `google.com, pub-4557897331416844, DIRECT, f08c47fec0942fa0`, then request review in AdSense.
- [ ] In AdSense → **Privacy & messaging**, create the **European regulations (GDPR) message** with Google's certified CMP. This is mandatory for serving ads to EEA/UK/Swiss visitors and needs no code.
- [x] Your three ad units are wired in: in-article `2364694405` (mid-article), in-article `1212676091` (end of article), responsive `8546959374` (below the calculator). Keep **Auto ads off** in AdSense so Google doesn't inject extra units into the layout.
- [ ] Don't open your own pages repeatedly to "check the ads" in production or click them. Preview deployments and local builds already request test ads only (`data-adtest="on"`).

If you are rejected: don't resubmit immediately. Add 5–10 more strong articles over two weeks, fix anything Search Console flags, then request review again.

## 4. Product and legal (you)

- [ ] Replace or confirm every claim in the copy: availability badge (`NEXT_PUBLIC_AVAILABILITY`), the project process and FAQ answers on `/work-with-me` (IP transfer, bug-fix window), reply time ("usually within two working days").
- [ ] Rename the three lab projects or keep the codenames; edit their one-line descriptions in `lib/site.ts`.
- [ ] Have a lawyer review `/privacy`, `/terms` and `/disclaimer` for India and the EU/UK.
- [ ] Set up a professional inbox on the domain (for `EMAIL_FROM` deliverability: SPF, DKIM and DMARC records from Resend).
- [ ] Test the full sign-up flow on a phone: join, confirm email, share link, join from the link on another device and network, check the referral count, unsubscribe.

## 5. Ongoing (monthly)

- [ ] 6–8 new articles; refresh one older article with new numbers (update `updated:` in front matter).
- [ ] Review `stats/waitlist` for demand by project, role and country. This is your pre-launch demand evidence.
- [ ] Review `mitra_questions`; turn the top unanswered questions into intents.
- [ ] Review `waitlist` documents with `flagged: true` and decide: clear or remove.
- [ ] Re-run Lighthouse on the home page, the calculator and the newest post.
