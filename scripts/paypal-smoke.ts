/**
 * Day-1 PayPal sandbox smoke test (implementation.md §7.6). Run: npm run smoke
 *
 * 1. OAuth token
 * 2. Create + send a $1 invoice to DEMO_CLIENT_EMAIL
 * 3. Create an order, print the approval link, wait for you to approve it as the sandbox buyer, capture
 * 4. Capture a second order with PayPal-Mock-Response → expect 422 INSTRUMENT_DECLINED
 * 5. $1 payout to the first contractor email → poll until it settles
 *
 * Needs PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET in .env (sandbox app). Uses the same lib code as the app.
 */
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { env } from "@/lib/env";
import { getAccessToken } from "@/lib/paypal/auth";
import { isPayPalError } from "@/lib/paypal/errors";
import { createAndSendInvoice } from "@/lib/paypal/invoices";
import { captureOrder, createOrder } from "@/lib/paypal/orders";
import { createPayoutBatch, getPayoutBatch } from "@/lib/paypal/payouts";
import { paypalFetch } from "@/lib/paypal/request";

const run = randomBytes(4).toString("hex");
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const step = (n: number, msg: string) => console.log(`\n${n}. ${msg}`);

async function main() {
  if (env.paypalMode !== "sandbox") {
    console.error("No PAYPAL_CLIENT_ID/SECRET set: the smoke test needs a real sandbox app (see .env.example).");
    process.exit(1);
  }
  console.log(`PayPal smoke test against ${env.PAYPAL_API_BASE} (run ${run})`);

  step(1, "OAuth token");
  const token = await getAccessToken();
  ok(`token ${token.slice(0, 12)}…`);

  step(2, `Create and send a $1 invoice to ${env.DEMO_CLIENT_EMAIL}`);
  const inv = await createAndSendInvoice({
    key: `smoke-${run}`,
    recipientEmail: env.DEMO_CLIENT_EMAIL,
    note: "ScopeLock smoke test",
    dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
    lines: [{ name: "Smoke test", description: "Day-1 check", quantity: 1, unitCents: 100, unitOfMeasure: "QUANTITY" }],
  });
  ok(`${inv.paypalInvoiceId} #${inv.invoiceNumber} status ${inv.status}`);
  ok(`payer view: ${inv.payerViewUrl ?? "(no recipient_view_url field: check detail.metadata)"}`);

  step(3, "Create an order, approve it in the browser, capture it");
  const order = await createOrder({
    requestId: `smoke-order-${run}`,
    invoiceId: `smoke-${run}`,
    invoiceNumber: `SMOKE-${run}`,
    description: "ScopeLock smoke test",
    totalCents: 100,
    lines: [{ name: "Smoke test", amountCents: 100 }],
  });
  const { data } = await paypalFetch<{ links: { rel: string; href: string }[] }>(`/v2/checkout/orders/${order.orderId}`);
  const approve = data.links.find((l) => l.rel === "approve" || l.rel === "payer-action");
  console.log(`  Approve as the sandbox buyer: ${approve?.href}`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await rl.question("  Press Enter once approved… ");
  rl.close();
  const cap = await captureOrder(order.orderId, { requestId: `smoke-capture-${run}` });
  ok(`capture ${cap.captureId} ${cap.captureStatus} $${(cap.amountCents / 100).toFixed(2)}`);

  step(4, "Forced decline with PayPal-Mock-Response");
  const order2 = await createOrder({
    requestId: `smoke-order2-${run}`,
    invoiceId: `smoke2-${run}`,
    invoiceNumber: `SMOKE2-${run}`,
    description: "ScopeLock smoke decline",
    totalCents: 100,
    lines: [{ name: "Smoke decline", amountCents: 100 }],
  });
  try {
    await captureOrder(order2.orderId, { requestId: `smoke-capture2-${run}`, mock: "INSTRUMENT_DECLINED" });
    console.error("  ✗ expected a 422 INSTRUMENT_DECLINED");
    process.exitCode = 1;
  } catch (e) {
    if (isPayPalError(e) && e.status === 422 && e.issue === "INSTRUMENT_DECLINED") ok(`422 INSTRUMENT_DECLINED (debug ${e.debugId})`);
    else throw e;
  }

  step(5, `$1 payout to ${env.DEMO_CONTRACTOR_EMAILS[0]}`);
  const batch = await createPayoutBatch({
    senderBatchId: `smoke-${run}`,
    subject: "ScopeLock smoke payout",
    message: "Day-1 check",
    items: [{ receiver: env.DEMO_CONTRACTOR_EMAILS[0], amountCents: 100, note: "Smoke", senderItemId: `smoke-${run}-1` }],
  });
  ok(`batch ${batch.batchId} ${batch.status}`);
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const s = await getPayoutBatch(batch.batchId);
    console.log(`  … ${s.status} (${s.items.map((x) => x.status).join(", ")})`);
    if (["SUCCESS", "DENIED", "CANCELED"].includes(s.status)) {
      if (s.status !== "SUCCESS") process.exitCode = 1;
      break;
    }
  }
  console.log(process.exitCode ? "\nSmoke test FAILED" : "\nAll smoke steps passed");
}

main().catch((e) => {
  console.error("\nSmoke test failed:", isPayPalError(e) ? `${e.status} ${e.paypalName} ${e.issue ?? ""} debug=${e.debugId}` : e);
  process.exit(1);
});
