# SEO, AdSense and performance — what's done and what you do

Domain: **https://onemoregame.me** (canonical). `www.onemoregame.me` and any `http://` request 308-redirect to it (`next.config.ts`). Support email: **support@onemoregame.me**.

## 1. AdSense — avoiding "Low-value content"

Google's rejection says a site must (a) provide authentic, high-quality information or tools, (b) show ongoing curation, (c) show genuine user interest. What the site now has for each:

| Requirement | What's on the site |
|---|---|
| Authentic, high-quality information/tools | A playable game (the tool) plus 8 original guides written from the engine's real rules and statistics measured over 1,400 simulated runs (`npm run stats`), a methodology page, How to Play, Fair Play, Campus Clash organizer guide |
| Ongoing curation & structure | Dated changelog, "updated" dates on every guide, editorial policy, consistent navigation, breadcrumbs, related-guide links, sitemap with per-page last-modified dates |
| Genuine user interest | Can't be coded. It comes from real players: share loop, challenges, Discord, daily twists posted on socials |

**Do this, in order:**
1. Deploy, connect the domain, confirm `https://onemoregame.me/ads.txt` shows `google.com, pub-4557897331416844, DIRECT, f08c47fec0942fa0`.
2. In AdSense → Sites, choose the **Meta tag** or **ads.txt** verification method (both are already live; the site deliberately does not load the ad script on every page).
3. **Wait for real traffic before requesting review** — the most common reason for "low-value content" on a new domain is too few visitors and too short a history, not missing pages. A practical bar: several weeks live, steady daily visitors from search/social, a couple of new changelog entries or guides added in that time.
4. In AdSense → Privacy & messaging, enable the **EU consent message** (Google's certified CMP) before ads go live.
5. After approval: create one **in-article** ad unit, set `NEXT_PUBLIC_ADSENSE_SLOT_CONTENT=<slot id>` and `NEXT_PUBLIC_ADS_ENABLED=true` in `apphosting.yaml`, redeploy.
6. Keep **Auto ads off** (or exclude `/play`, `/c/*`, `/play/sign-in*`). The ad script loads only on pages that contain an ad slot (guides, How to Play), so the game and forms stay ad-free either way.

Never: click your own ads, ask anyone to click, buy traffic, or place ads near game controls.

## 2. SEO checklist (status)

| Item | Status |
|---|---|
| sitemap.xml | ✅ Generated from canonical public routes + each guide with its own last-modified date; private/token routes excluded (e2e-tested) |
| robots.txt | ✅ Allows public pages, disallows token/private routes, explicit allow for the AdSense crawler, sitemap + host lines |
| noindex | ✅ Removed from every public page. Kept **on purpose** only on private pages (verify, invite, unsubscribe, sign-in, personal challenge links) — indexing those would leak tokens and create thin duplicate pages |
| Canonical tags | ✅ Every public page, self-referencing, on `https://onemoregame.me` |
| Titles & descriptions | ✅ Unique per page (e2e checks uniqueness) |
| One H1, heading hierarchy | ✅ One H1 per page (e2e-tested on all public pages); guide sections are H2, sub-points H3 |
| Alt text | ✅ The site uses no raster `<img>`; the game canvas has an `aria-label`, decorative SVGs are `aria-hidden`, OG images have `alt` |
| Schema | ✅ WebSite, Organization (SEEVE Tech), Person (creator), VideoGame (free, browser), Article + BreadcrumbList on guides, ItemList on /guides, FAQPage, BreadcrumbList on content pages. No fake ratings |
| Internal links | ✅ Header/footer nav, home → guides, guides → related guides, How to Play/Fair Play/Campus Clash → relevant guides |
| Broken links | ✅ e2e crawls links from 9 hub pages and fails on any 4xx/5xx |
| Images / OG | ✅ Vector graphics only; OG images generated as PNG (site-wide + one per challenge) |
| Mobile | ✅ e2e at 320 px: no horizontal scroll, working menu and forms |
| HTTPS | ✅ App Hosting serves HTTPS; http → https and www → apex 308 redirects; HSTS header |
| URL slugs | ✅ Short, lowercase, hyphenated, stable (`/guides/combo-math`) |
| Search Console | ⏳ Needs your Google account (steps below) |
| Backlinks | ⏳ Strategy below; links must be earned |

### Search Console (10 minutes)
1. search.google.com/search-console → Add property → **Domain** → `onemoregame.me` → add the TXT record at your DNS provider (covers www + https).
   *Or* URL-prefix property → HTML tag → put the token in `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (apphosting.yaml) and redeploy.
2. Sitemaps → submit `https://onemoregame.me/sitemap.xml`.
3. URL inspection → request indexing for `/`, `/play`, `/guides` and each guide.
4. Check monthly: Pages (indexing), Core Web Vitals, Manual actions, Security issues. Also add the site to Bing Webmaster Tools (import from Search Console).

## 3. Backlink strategy (earned, not bought)
Ranked by likely value for this game:
1. **Open-source the deterministic engine** on GitHub (github.com/thekartikeyamishra) with a README linking to the replay article — developers link to useful code.
2. **Post the technical article** "How ONE MORE verifies every score by replaying it" to Hacker News (Show HN), r/gamedev, dev.to and your Medium (use canonical URL pointing to onemoregame.me).
3. **College fests & clubs**: offer the tournament guide to gaming/tech clubs; event pages and club sites link back. Register organizer interest leads → pilots → press in campus media.
4. **Web game communities**: r/WebGames, r/IndianGaming, itch.io (list as a browser game linking to the site), IndieDB, Product Hunt launch.
5. **Build-in-public**: LinkedIn and X threads with real numbers from the changelog and metrics; YouTube devlogs with the site in descriptions.
6. **Press kit** once there's real news (player counts from metrics, first campus event) — short facts page, logo, screenshots.
Avoid: paid links, link exchanges, PBNs, comment spam, mass directory submissions.

## 4. Performance checklist (status)

| Requested item | Status in this project |
|---|---|
| Compress images | No raster images to compress; vector SVG + self-hosted woff2 variable fonts (browser downloads only needed unicode ranges) |
| Lazy loading | Game renderer loads only when a run starts (`next/dynamic`); hero preview pauses off-screen; ad script lazy-loads on ad pages only |
| Code splitting | Per-route chunks (Next.js) + game renderer in its own chunk |
| Cache API responses | Public leaderboard top-20 cached 10 s per instance; challenge cards 30 s; personalised responses `no-store` by design |
| CDN | Firebase App Hosting serves static assets through Google's CDN; static pages `s-maxage=1 year`, hashed assets `immutable` (verified) |
| Minify JS/CSS | Next.js production build |
| Database indexes | `firestore.indexes.json`: composite indexes for every query, TTL policies, exemptions for large text fields |
| Reduce re-renders | Game loop runs outside React (refs + canvas); React state only for HUD-level changes |
| Debounce inputs | No live-search/autosave inputs exist; game input is sampled once per tick by design (debouncing would add input lag) |
| Paginate | Leaderboard limited to 20; admin review 50; deletions batched 400 |
| Remove unused deps | All dependencies are used (checked); dev-only tools are devDependencies |
| Defer non-critical scripts | AdSense `lazyOnload`; no third-party scripts otherwise |
| Loading skeletons | `/play` and `/c/*` route skeletons, arena placeholder, leaderboard rows |
| Load balancer | Provided by App Hosting (Cloud Run behind Google's load balancer, autoscaling `maxInstances` in apphosting.yaml) — adding another would be redundant |
| Compress payloads | gzip on HTML/JS (verified); App Hosting/CDN adds Brotli |
| Connection pooling | Single Firestore client per instance (gRPC connection reuse) |
| Cache computed results | TTL cache (leaderboard, challenge cards); measured stats precomputed at build into `stats.json` |
| N+1 queries | Leaderboard review uses one batched `getAll`; other paths are single reads/queries |
| Server-side caching | 30+ pages statically prerendered at build; guides via `generateStaticParams` |
| Lighthouse | See `docs/lighthouse/RESULTS.md` (re-run on the live domain after deploy) |
