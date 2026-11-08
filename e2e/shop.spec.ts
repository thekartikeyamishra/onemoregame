import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
});

test("shop shows the Founder Pack, cosmetic-only promise and safe purchase states", async ({ page, request }) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "Founder Pack" })).toBeVisible();
  await expect(page.getByText("Cosmetic only.")).toBeVisible();
  await expect(page.locator(".shop-item")).toHaveCount(10);
  // Free items can always be equipped by anyone.
  await page.locator(".shop-item").filter({ hasText: "Classic Cyan" }).getByRole("button", { name: /Equip/ }).click();
  // No payment keys in e2e: website checkout is closed and buy buttons are disabled, never half-working.
  await expect(page.getByText(/Website checkout opens soon/)).toBeVisible();
  await expect(page.locator(".founder-card").getByRole("button", { name: /Buy/ })).toBeDisabled();
  await page.getByRole("button", { name: "Restore purchases" }).click();
  await expect(page.locator(".notice--err")).toContainText("Sign in");
  // APIs: ownership needs no sign-in to read; buying, syncing and equipping do.
  const shop = await (await request.get("/api/shop")).json();
  expect(shop).toMatchObject({ signedIn: false, owned: [], webCheckout: false });
  expect((await request.post("/api/shop/order", { data: { productId: "founder_pack" } })).status()).toBe(401);
  expect((await request.post("/api/shop/equip", { data: { skin: "skin_gold" } })).status()).toBe(401);
  expect((await request.post("/api/billing/razorpay", { data: { event: "order.paid" } })).status()).toBe(401);
  expect((await request.post("/api/billing/revenuecat", { data: {} })).status()).toBe(401);
});
