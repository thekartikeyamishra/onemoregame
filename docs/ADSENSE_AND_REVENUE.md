# AdSense and the $2,500/month goal

## The honest maths

Nobody can guarantee AdSense approval or a revenue figure; Google decides both. What you can control is traffic, audience geography and placement quality. Revenue is roughly:

```
monthly revenue ≈ monthly pageviews × page RPM ÷ 1,000
```

Page RPM (revenue per 1,000 pageviews) varies widely by niche and country. Business and software-development content read by US, UK, Canadian and Australian visitors sits in the higher bands; the same content read from India earns a fraction of that. As a planning assumption only:

| Audience mix | Assumed page RPM | Pageviews needed for $2,500/month |
|---|---|---|
| Mostly US/UK | $15–$25 | ~100,000–170,000 |
| Mixed (50% tier-1) | $8–$12 | ~210,000–310,000 |
| Mostly India | $1–$3 | ~830,000–2,500,000 |

Your real RPM will be visible in AdSense after a few weeks; replace these assumptions with it.

That's why the content strategy targets founders and product owners in the US, UK and EU (budgeting, hiring, compliance, AI costs) as well as India, and why the tool prices in dollars, pounds and euros.

**The bigger lever:** one client project from the `/work-with-me` form is worth many months of ad revenue at this traffic level. Treat ads as a bonus on top of leads, not the business model.

## The system that learns toward the goal

Run this loop every month. It's the "learning system": decisions are driven by your own numbers, not guesses.

1. **Measure** in AdSense: page RPM by country and by page (Reports → Pages / Countries).
2. **Find winners:** which articles have the highest RPM × pageviews? Those topics get the next articles (and internal links pointing to them).
3. **Grow tier-1 reach:** in Search Console, filter by country (US, UK) and find queries with impressions but low click-through. Rewrite those titles and descriptions; expand those sections.
4. **Placement tests:** each slot can be switched off by setting its env var to `off`. Change one thing per month (e.g. remove the end-of-article unit) and compare RPM and session length. Never trade engagement for a small RPM gain; it costs rankings.
5. **Refresh:** update the two or three top articles with new numbers each quarter.

Track it in a simple sheet: month, pageviews, tier-1 share, page RPM, revenue, articles published, leads received.

## Placements in this build (and why)

Publisher `ca-pub-4557897331416844`. Units: `2364694405` and `1212676091` (in-article, fluid), `8546959374` (responsive display). The loader script is included once in the page `<head>`; each unit pushes itself when it's about to scroll into view.


| Slot | Where | Why it's policy-safe and not annoying |
|---|---|---|
| `inArticle` | Mid-article, at a section boundary | Native in-article format, labelled, never adjacent to buttons |
| `endOfArticle` | After the author box | Reader has finished the content |
| `toolResult` | Below the calculator | After the tool, separated from the result's buttons |

Rules baked in: no ads on home, early access, contact, project, legal or status pages (thin or form pages); every unit is labelled "Advertisement"; space is reserved so nothing jumps (CLS 0); units load only when near the viewport; nothing encourages clicks.

## Policy pitfalls to avoid

- Don't click your own ads or ask anyone to. Don't place ads in Mitra's chat panel or near the sign-up form.
- Don't publish copied, spun or mass-generated articles. Write from your own work.
- Don't add pop-ups or interstitials before content.
- Don't buy traffic from low-quality sources; invalid traffic can close the account.
- Keep the GDPR message active in AdSense Privacy & messaging.
