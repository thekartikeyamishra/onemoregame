import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// Each test gets its own simulated client IP so per-IP rate limits don't leak between tests.
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
});

async function lastMailLink(path: "/verify" | "/invite", email: string) {
  for (let i = 0; i < 40; i++) {
    const log = readFileSync(".e2e/server.log", "utf8");
    const blocks = log.split("[dev-mail]").filter((b) => b.includes(`to=${email}`));
    const m = blocks.at(-1)?.match(new RegExp(`https?://[^\\s]+${path}\\?token=[^\\s]+`));
    if (m) return new URL(m[0]).pathname + new URL(m[0]).search;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("no mail captured");
}

async function requestAccess(page: Page, email: string, url = "/early-access") {
  await page.goto(url);
  const form = page.locator("#request form");
  await form.getByLabel("Email address").fill(email);
  await form.getByLabel(/18 or older/).check();
  await form.getByRole("button", { name: "Unlock the playtest" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
}

test("homepage explains the product honestly and has correct metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toContainText("One minute. One challenge.");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^http/);
  await expect(page.getByText("Concept preview", { exact: true })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
  // Store buttons are in "Coming soon" state and link nowhere.
  await expect(page.locator('a[href*="play.google.com"], a[href*="apps.apple.com"]')).toHaveCount(0);
  await expect(page.getByText("Coming soon").first()).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld!)["@graph"][0]["@type"]).toBe("WebSite");
});

test("every public page has one h1, a unique title and a self canonical", async ({ page }) => {
  const titles = new Set<string>();
  for (const path of ["/", "/play", "/community", "/guides", "/changelog", "/editorial-policy", "/guides/beginners-guide", "/guides/combo-math", "/guides/dash-and-near-misses", "/guides/power-ups", "/guides/daily-twists", "/guides/run-a-college-tournament", "/guides/replay-anti-cheat", "/guides/methodology", "/how-to-play", "/campus-clash", "/early-access", "/fair-play", "/faq", "/about", "/contact", "/privacy", "/terms", "/cookies"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("h1"), path).toHaveCount(1);
    const title = await page.title();
    expect(titles.has(title), `duplicate title ${title}`).toBe(false);
    titles.add(title);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonical!).pathname.replace(/\/$/, "") || "/").toBe(path);
    expect(await page.locator('meta[name="robots"][content*="noindex"]').count(), path).toBe(0);
  }
});

test("internal links resolve", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = new Set<string>();
  for (const p of ["/", "/faq", "/how-to-play", "/guides", "/guides/combo-math", "/guides/run-a-college-tournament", "/about", "/community", "/changelog"]) {
    await page.goto(p);
    for (const h of await page.locator("a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!))) hrefs.add(h.split("#")[0]);
  }
  for (const h of hrefs) expect((await request.get(h, { maxRedirects: 0 })).status(), h).toBeLessThan(400);
});

test("sitemap and robots expose only public routes", async ({ request }) => {
  const sm = await (await request.get("/sitemap.xml")).text();
  expect(sm).toContain("/how-to-play");
  for (const p of ["/verify", "/invite", "/unsubscribe", "/api", "/r/", "/play/", "/c/"]) expect(sm).not.toContain(p);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /verify");
  expect(robots).toContain("Sitemap:");
});

test("full early-access journey: request, verify, share, referral", async ({ page, request }) => {
  await requestAccess(page, "e2e-a@example.com");
  const verifyPath = await lastMailLink("/verify", "e2e-a@example.com");

  const res = await page.goto(verifyPath);
  expect(res?.headers()["cache-control"]).toContain("no-store");
  expect(res?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await expect(page.getByText("Email confirmed")).toBeVisible();
  const share = await page.getByLabel("Your personal share link").inputValue();
  expect(share).toMatch(/\/r\/[a-z2-9]{10}$/);
  await expect(page.locator("body")).not.toContainText("e2e-a@example.com");

  // Same link again: already confirmed, not an error.
  await page.goto(verifyPath);
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await expect(page.getByText("Already confirmed")).toBeVisible();

  // Referral link forwards to the public page without revealing anything.
  const code = share.split("/r/")[1];
  const r = await request.get(`/r/${code}`, { maxRedirects: 0 });
  expect(r.status()).toBe(307);
  expect(r.headers()["location"]).toContain(`/early-access?ref=${code}`);
  await requestAccess(page, "e2e-b@example.com", `/early-access?ref=${code}`);
});

test("invalid and missing tokens are handled safely", async ({ page }) => {
  await page.goto("/verify?token=abcdefgh.abcdefghijklmnopqrstuvwxyz");
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await expect(page.getByText("This link isn't valid")).toBeVisible();
  await page.goto("/invite");
  await expect(page.getByText("Link incomplete")).toBeVisible();
});

test("duplicate submissions show the same generic response and send one email", async ({ page }) => {
  await requestAccess(page, "dupe@example.com");
  await requestAccess(page, "dupe@example.com");
  const count = readFileSync(".e2e/server.log", "utf8").split("to=dupe@example.com").length - 1;
  expect(count).toBe(1);
});

test("form validation is accessible", async ({ page }) => {
  await page.goto("/early-access");
  const form = page.locator("#request form");
  await form.getByLabel("Email address").fill("not-an-email");
  await form.getByRole("button", { name: "Unlock the playtest" }).click();
  await expect(form.getByRole("alert")).toBeVisible();
  await expect(form.getByLabel("Email address")).toHaveAttribute("aria-invalid", "true");
});

test("API rejects bad input, catches honeypots and refuses GET", async ({ request }) => {
  const bad = await request.post("/api/waitlist", { data: { email: "x" } });
  expect(bad.status()).toBe(400);
  const bot = await request.post("/api/waitlist", { data: { email: "bot@example.com", ageConfirmed: true, website: "spam" } });
  expect(bot.status()).toBe(202);
  expect((await request.get("/api/waitlist")).status()).toBe(405);
  const cross = await request.post("/api/waitlist", { data: { email: "a@example.com", ageConfirmed: true }, headers: { Origin: "https://evil.example" } });
  expect(cross.status()).toBe(403);
  const campus = await request.post("/api/campus-interest", { data: { name: "", email: "bad" } });
  expect(campus.status()).toBe(400);
  expect((await campus.json()).errors.email).toBeTruthy();
});

test("campus interest form submits", async ({ page }) => {
  await page.goto("/campus-clash");
  await page.getByLabel("Your name").fill("Asha Rao");
  await page.getByLabel("Work or student email").fill("asha@example.edu");
  await page.getByLabel("School, college or club").fill("Example College Gaming Club");
  await page.getByRole("button", { name: "Register organizer interest" }).click();
  await expect(page.getByText("Thanks — interest received")).toBeVisible();
});

test("security headers are present", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("reduced motion starts the preview paused", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Play preview" })).toBeVisible();
  await ctx.close();
});

test("keyboard users reach the skip link first", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});

test("no ads render when advertising is disabled", async ({ page }) => {
  await page.goto("/how-to-play");
  await expect(page.locator("ins.adsbygoogle, script[src*='googlesyndication']")).toHaveCount(0);
});

test("AdSense verification is present without loading ad code, and ads.txt is correct", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="google-adsense-account"]')).toHaveAttribute("content", "ca-pub-4557897331416844");
  await expect(page.locator("script[src*='googlesyndication']")).toHaveCount(0);
  const ads = await (await request.get("/ads.txt")).text();
  expect(ads.trim()).toBe("google.com, pub-4557897331416844, DIRECT, f08c47fec0942fa0");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("User-Agent: Mediapartners-Google");
  const sm = await (await request.get("/sitemap.xml")).text();
  expect(sm).toContain("/guides/combo-math");
});

test("guides have article schema, a byline, dates and related links", async ({ page }) => {
  await page.goto("/guides/dash-and-near-misses");
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  const graph = JSON.parse(ld!)["@graph"];
  expect(graph[0]["@type"]).toBe("Article");
  expect(graph[0].author.name).toBe("Kartikeya Mishra");
  await expect(page.getByText(/By Kartikeya Mishra/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Related guides" })).toBeVisible();
  // headings: exactly one h1, sections are h2
  await expect(page.locator("h1")).toHaveCount(1);
  expect(await page.locator("article h2").count()).toBeGreaterThanOrEqual(4);
});
