import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// Each test gets its own simulated client IP so per-IP rate limits don't leak between tests.
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
});

async function mailLink(path: string, email: string) {
  for (let i = 0; i < 40; i++) {
    const blocks = readFileSync(".e2e/server.log", "utf8").split("[dev-mail]").filter((b) => b.includes(`to=${email}`));
    const m = blocks.at(-1)?.match(new RegExp(`https?://[^\\s]+${path}\\?token=[^\\s]+`));
    if (m) return new URL(m[0]).pathname + new URL(m[0]).search;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no ${path} mail for ${email}`);
}

async function becomePlaytester(page: Page, email: string) {
  await page.goto("/early-access");
  const form = page.locator("#request form");
  await form.getByLabel("Email address").fill(email);
  await form.getByLabel(/18 or older/).check();
  await form.getByRole("button", { name: "Unlock the playtest" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
  await page.goto(await mailLink("/verify", email));
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await expect(page.getByText("Email confirmed")).toBeVisible();
  expect((await page.request.post("/api/dev/issue-invites")).status()).toBe(200);
  await page.goto(await mailLink("/invite", email));
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await page.getByRole("link", { name: "Play now" }).click();
  await expect(page).toHaveURL(/\/play$/);
}

test("guests can start today's Daily Arena but not Quick Play", async ({ page, request }) => {
  await page.goto("/play");
  await expect(page.getByRole("heading", { name: "Today's arena" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible(); // public leaderboard
  expect((await request.post("/api/game/start", { data: { mode: "daily" } })).status()).toBe(200);
  expect((await request.post("/api/game/start", { data: { mode: "quick" } })).status()).toBe(401);
  expect((await request.post("/api/game/start", { data: { mode: "challenge", challengeId: "abcdefghjk" } })).status()).toBe(404);
});

test("playtester plays a full verified Daily Arena run and appears on the leaderboard", async ({ page }) => {
  test.setTimeout(180_000);
  await becomePlaytester(page, "player1@example.com");
  await page.getByLabel("Leaderboard name").fill("Tester_1");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.getByRole("button", { name: "Daily Arena" }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const canvas = page.locator("canvas.game-canvas");
  await expect(canvas).toBeVisible();
  // Steer in a circle with the keyboard for a while, then let the clock run out.
  await canvas.focus();
  for (const k of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]) { await page.keyboard.down(k); await page.waitForTimeout(1500); await page.keyboard.up(k); }
  await page.keyboard.press("Space");
  await expect(page.getByText("Score verified by replay ✓")).toBeVisible({ timeout: 90_000 });
  await expect(page.locator(".big-score")).toBeVisible();

  await page.getByRole("button", { name: "Modes" }).click();
  await expect(page.locator(".lb")).toContainText("Tester_1");

  // Pause and quit a run.
  await page.goto("/play");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator("canvas.game-canvas")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Paused")).toBeVisible();
  await page.getByRole("button", { name: "Quit run" }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

test("challenge links work for guests and point them to early access", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await becomePlaytester(page, "player2@example.com");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText("Score verified by replay ✓")).toBeVisible({ timeout: 90_000 });
  await expect(page.locator(".share-preview")).toContainText("ONE MORE");
  const created = page.waitForResponse((r) => r.url().includes("/api/game/challenge"));
  await page.getByRole("button", { name: "Share result" }).click();
  const url = (await (await created).json()).url as string;
  expect(url).toMatch(/\/c\/[a-z2-9]{10}$/);

  const guest = await browser.newContext();
  const g = await guest.newPage();
  const res = await g.goto(new URL(url).pathname);
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(g.getByText(/scored/)).toBeVisible();
  await expect(g.getByText(/ghost races alongside you/)).toBeVisible();
  const path = new URL(url).pathname;
  const start = await g.request.post("/api/game/start", { data: { mode: "challenge", challengeId: path.split("/c/")[1] } });
  expect(start.status()).toBe(200);
  expect((await g.request.post("/api/game/start", { data: { mode: "quick" } })).status()).toBe(401);
  await guest.close();
});

test("a playtester can sign in on another device with an email link", async ({ page, browser }) => {
  await becomePlaytester(page, "player3@example.com");
  const other = await browser.newContext();
  const p = await other.newPage();
  await p.goto("/play/sign-in");
  await p.getByLabel("Email address").fill("player3@example.com");
  await p.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(p.getByText("Check your inbox")).toBeVisible();
  await p.goto(await mailLink("/play/sign-in/confirm", "player3@example.com"));
  await p.getByRole("button", { name: "Sign in and play" }).click();
  await expect(p.getByRole("button", { name: "Sign out" })).toBeVisible();
  await p.getByRole("button", { name: "Sign out" }).click();
  await expect(p.getByRole("link", { name: "Already confirmed? Sign in" })).toBeVisible();
  await other.close();
});

test("tampered scores are rejected by the server", async ({ page }) => {
  await becomePlaytester(page, "player4@example.com");
  const start = await (await page.request.post("/api/game/start", { data: { mode: "quick" } })).json();
  const res = await page.request.post("/api/game/finish", { data: { runId: start.runId, ticket: start.ticket, inputs: [], score: 999999, version: 3 } });
  expect(res.status()).toBe(422);
  const old = await page.request.post("/api/game/finish", { data: { runId: start.runId, ticket: start.ticket, inputs: [], score: 0, version: 2 } });
  expect(old.status()).toBe(409); // outdated client is told to refresh
});

test("guest plays today's arena, saves the run with an email, and lands on the leaderboard", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/play");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText("Score verified by replay")).toBeVisible({ timeout: 90_000 });
  const score = (await page.locator(".big-score").textContent())!.trim();
  await expect(page.getByText(/confirm your email below to put it on the leaderboard/)).toBeVisible();
  await page.getByLabel("Email address").fill("guest-claim@example.com");
  await page.getByLabel(/18 or older/).check();
  await page.getByRole("button", { name: "Email me a confirmation link" }).click();
  await expect(page.getByText(/this run is saved to your profile/)).toBeVisible();
  await page.goto(await mailLink("/verify", "guest-claim@example.com"));
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await expect(page.getByText(`Your guest run of ${score} is saved`)).toBeVisible();
  await page.getByRole("link", { name: "Play now" }).click();
  await expect(page.getByRole("button", { name: "Quick Play" })).toBeVisible();
  await expect(page.locator(".lb")).toContainText(score);
});

test("guests can try Level 1 of Levels; later levels stay locked", async ({ page, request }) => {
  await page.goto("/play");
  await page.getByRole("button", { name: "Levels" }).click();
  await expect(page.getByRole("heading", { name: "Level 1" })).toBeVisible();
  await expect(page.getByText(/Target/).first()).toBeVisible();
  const ok = await request.post("/api/game/start", { data: { mode: "level", level: 1 } });
  expect(ok.status()).toBe(200);
  expect((await ok.json()).level).toMatchObject({ n: 1 });
  expect((await request.post("/api/game/start", { data: { mode: "level", level: 2 } })).status()).toBe(403);
  await page.getByRole("button", { name: "Play Level 1" }).click();
  await expect(page.locator("canvas")).toBeVisible();
});
