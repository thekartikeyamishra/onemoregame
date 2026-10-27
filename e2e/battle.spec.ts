import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
});

test("battle: create, invite, AI fill, defend, attack, results", async ({ page, browser }) => {
  test.setTimeout(150_000);
  await page.goto("/battle");
  await expect(page.getByRole("heading", { name: "Battle mode" })).toBeVisible();
  // Rulebook: opens from the "?" button, shows powers, closes with Escape.
  await page.getByRole("button", { name: /How Battle works/ }).click();
  await expect(page.getByRole("dialog", { name: "How Battle works" })).toBeVisible();
  await page.getByRole("tab", { name: "Attacker powers" }).click();
  await expect(page.getByRole("dialog").getByText("Eclipse")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Your gamer tag").fill("Host One");
  await page.getByRole("button", { name: /Create room/ }).click();
  await page.waitForURL(/\/b\/[A-Z0-9]{6}$/);
  const url = page.url();

  // A friend joins Team Tide from the invite link on a phone-sized screen.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const friend = await phone.newPage();
  await friend.goto(`${url}?team=B`);
  await expect(friend.getByText(/invited you to battle/)).toBeVisible();
  await friend.getByLabel("Gamer tag").fill("Friend Two");
  await friend.getByRole("button", { name: "Join battle" }).click();
  await expect(friend.getByText("Friend Two (you)")).toBeVisible();
  await expect(page.getByText("Friend Two")).toBeVisible({ timeout: 6000 });

  // Sound toggle and help are in the room too.
  await expect(page.getByRole("button", { name: /Sound on/ })).toBeVisible();
  await page.getByRole("button", { name: /Sound on/ }).click();
  await expect(page.getByRole("button", { name: /Sound off/ })).toBeVisible();
  await page.getByRole("button", { name: /Sound off/ }).click();
  // Host adds an AI teammate and starts.
  await page.getByRole("button", { name: "+ AI player" }).first().click();
  await expect(page.getByText(/\(AI\)/).first()).toBeVisible();
  await page.getByRole("button", { name: /Start battle · 2v1/ }).click();
  await expect(page.getByText("You DEFEND")).toBeVisible({ timeout: 6000 });
  await expect(friend.getByText("You ATTACK")).toBeVisible({ timeout: 6000 });

  // Round 1: host defends; friend strikes the host.
  await expect(page.locator(".battle-canvas")).toBeVisible({ timeout: 10_000 });
  await page.keyboard.down("KeyD"); await page.waitForTimeout(800); await page.keyboard.up("KeyD");
  await expect(friend.locator(".battle-mini").first()).toBeVisible();
  const box = (await friend.locator(".battle-mini").first().boundingBox())!;
  await friend.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(friend.locator(".battle-toast")).toContainText(/Strike/);

  // Round 1 result, then roles swap.
  await expect(page.getByText("Round 1 result")).toBeVisible({ timeout: 40_000 });
  await expect(page.getByText("You ATTACK")).toBeVisible();
  // Final (or a tie-break first).
  await expect(page.getByRole("heading", { name: /wins!|draw/ })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Flex board")).toBeVisible();
  await expect(page.getByRole("button", { name: "Rematch (same room)" })).toBeVisible();
  await page.getByRole("button", { name: "Rematch (same room)" }).click();
  await expect(page.getByRole("button", { name: /Start battle/ })).toBeVisible({ timeout: 6000 });
  await phone.close();
});

test("battle: unknown room and bad codes are handled", async ({ page, request }) => {
  await page.goto("/b/ZZZZZZ");
  await expect(page.getByRole("heading", { name: "Room not found" })).toBeVisible();
  const r = await request.post("/api/battle/ZZZZZZ", { data: { action: "tick" }, headers: { "x-battle-token": "x".repeat(32) } });
  expect(r.status()).toBe(404);
  const bad = await request.post("/api/battle", { data: { name: "<script>", seconds: 180 } });
  expect(bad.status()).toBe(400);
});
