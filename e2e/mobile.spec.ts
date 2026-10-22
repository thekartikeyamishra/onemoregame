import { expect, test } from "@playwright/test";

// Each test gets its own simulated client IP so per-IP rate limits don't leak between tests.
test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
});

test("mobile navigation works at 320px and the page doesn't scroll sideways", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator("#primary-nav");
  await expect(nav).toBeHidden();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(nav).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  await page.getByRole("button", { name: "Open menu" }).click();
  await nav.getByRole("link", { name: "How to Play" }).click();
  await expect(page).toHaveURL(/how-to-play/);
  await expect(nav).toBeHidden();
  for (const p of ["/", "/how-to-play", "/campus-clash", "/early-access"]) {
    await page.goto(p);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, p).toBeLessThanOrEqual(0);
  }
});

test("early-access form is usable on a small screen", async ({ page }) => {
  await page.goto("/early-access");
  const form = page.locator("#request form");
  await form.getByLabel("Email address").fill("mobile@example.com");
  await form.getByLabel(/18 or older/).check();
  await form.getByRole("button", { name: "Unlock the playtest" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");
});
