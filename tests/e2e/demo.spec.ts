import { expect, test } from "@playwright/test";

// Happy path from implementation.md §12. Runs against the PayPal simulator when no sandbox keys
// are set; with real keys, the pay step needs a sandbox buyer and is covered by the manual run.
test("change request → invoice → decline → pay → payout", async ({ page, request }) => {
  await request.post("/api/demo/reset");
  await page.addInitScript(() => localStorage.setItem("scopelock.guideSeen", "1"));
  await page.goto("/projects/demo");

  // Locked phase is visible from the start.
  await expect(page.getByText("🔒 Go-live").first()).toBeVisible();

  await page.getByRole("button", { name: "New features + deadline" }).click();
  await page.getByRole("button", { name: "Analyze" }).click();
  await expect(page.getByText("“add a gift-card page”")).toBeVisible();
  await expect(page.getByText("$1,700.00").first()).toBeVisible();

  await page.getByRole("button", { name: "Create invoice & send" }).click();
  await expect(page.getByText(/Change-order invoice .* sent · \$1,700\.00/)).toBeVisible();
  await expect(page.getByText("🔒 Gift-card page").first()).toBeVisible();

  const state = await (await request.get("/api/project/demo")).json();
  const invoice = state.invoices.find((i: { kind: string }) => i.kind === "change_order");
  test.skip(state.config.paypalMode !== "simulated", "Real sandbox checkout needs a buyer login");

  await page.goto(`/pay/${invoice.id}`);
  await page.getByRole("switch").check({ force: true });
  await page.getByRole("button", { name: "Pay with PayPal (simulated)" }).click();
  await expect(page.getByText("Your card was declined")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("button", { name: "Pay with PayPal (simulated)" }).click();
  await expect(page.getByText("Payment received")).toBeVisible();

  // Paying again is blocked.
  const dup = await request.post("/api/orders", { data: { invoiceId: invoice.id } });
  expect(dup.status()).toBe(409);

  await page.goto("/projects/demo");
  await expect(page.getByText("Gift-card page", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("🔒 Gift-card page")).toHaveCount(0);

  await page.getByRole("tab", { name: /Payouts/ }).click();
  await expect(page.getByText("Adds up to the cent", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Pay contractors/ }).click();
  await expect(page.getByText("Payout batch SUCCESS")).toBeVisible({ timeout: 30_000 });

  const again = await request.post("/api/payouts", { data: { invoiceId: invoice.id } });
  expect(again.status()).toBe(409);
});
