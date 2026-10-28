import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { logEvent } from "@/lib/domain/events";
import { formatUSD } from "@/lib/domain/money";
import type { LineItem } from "@/lib/domain/types";
import { newId } from "@/lib/ids";
import { isPayPalError } from "@/lib/paypal/errors";
import { recordInvoicePayment } from "@/lib/paypal/invoices";
import { captureOrder, createOrder } from "@/lib/paypal/orders";
import { AppError } from "./http";

function loadInvoice(invoiceId: string) {
  const inv = getDb().select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId)).get();
  if (!inv) throw new AppError(404, "NOT_FOUND", "Invoice not found");
  return inv;
}

function alreadyPaid(inv: { paidAt: string | null; invoiceNumber: string | null }): AppError {
  return new AppError(409, "ALREADY_PAID", `Invoice ${inv.invoiceNumber ?? ""} has already been paid.`, {
    details: { paidAt: inv.paidAt },
  });
}

/** POST /api/orders: one Orders v2 order per payment attempt. Blocks already-paid invoices (FR-22). */
export async function createOrderForInvoice(invoiceId: string): Promise<{ orderId: string }> {
  const db = getDb();
  const inv = loadInvoice(invoiceId);
  if (inv.status === "PAID") throw alreadyPaid(inv);
  if (inv.seeded) throw new AppError(409, "SEEDED", "Seeded history can't be paid");
  if (!inv.paypalInvoiceId || !inv.invoiceNumber) {
    throw new AppError(409, "NOT_SENT", "This invoice hasn't been sent through PayPal yet");
  }

  const attempt = db.select().from(schema.payments).where(eq(schema.payments.invoiceId, inv.id)).all().length + 1;
  const lines = JSON.parse(inv.itemsJson) as LineItem[];
  try {
    const { orderId, raw } = await createOrder({
      requestId: `order-${inv.id}-${attempt}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      description: inv.title,
      totalCents: inv.totalCents,
      currency: inv.currency,
      lines: lines.map((l) => ({
        name: l.hours && inv.kind === "change_order" ? `${l.title} (${l.hours} h)` : l.title,
        amountCents: l.amountCents,
      })),
    });
    db.insert(schema.payments)
      .values({
        id: newId("pay"),
        invoiceId: inv.id,
        paypalOrderId: orderId,
        status: "CREATED",
        amountCents: inv.totalCents,
        currency: inv.currency,
        attempt,
        rawJson: JSON.stringify(raw),
        createdAt: new Date().toISOString(),
      })
      .run();
    logEvent(inv.projectId, "order_created", `Checkout started for invoice ${inv.invoiceNumber} (attempt ${attempt})`, {
      paypalRef: orderId,
    });
    return { orderId };
  } catch (e) {
    if (isPayPalError(e) && e.issue === "DUPLICATE_INVOICE_ID") throw alreadyPaid(inv);
    if (isPayPalError(e)) {
      logEvent(inv.projectId, "order_failed", `Couldn't start checkout: ${e.message}`, { paypalRef: e.debugId, level: "danger" });
    }
    throw e;
  }
}

/** POST /api/orders/:id/capture: capture, then mark the invoice paid here and on PayPal. */
export async function captureOrderForInvoice(orderId: string, simulateDecline: boolean) {
  const db = getDb();
  const payment = db.select().from(schema.payments).where(eq(schema.payments.paypalOrderId, orderId)).get();
  if (!payment) throw new AppError(404, "NOT_FOUND", "Unknown order");
  const inv = loadInvoice(payment.invoiceId);
  if (inv.status === "PAID") throw alreadyPaid(inv);

  let result;
  try {
    result = await captureOrder(orderId, {
      requestId: `capture-${inv.id}-${payment.attempt}`,
      mock: simulateDecline ? "INSTRUMENT_DECLINED" : undefined,
    });
  } catch (e) {
    if (isPayPalError(e) && e.status === 422 && e.issue === "INSTRUMENT_DECLINED") {
      db.update(schema.payments)
        .set({ status: "DECLINED", failureCode: e.issue, rawJson: JSON.stringify({ debugId: e.debugId, details: e.details }) })
        .where(eq(schema.payments.id, payment.id))
        .run();
      logEvent(inv.projectId, "payment_declined", `Payment declined for invoice ${inv.invoiceNumber} (INSTRUMENT_DECLINED). No money was taken.`, {
        paypalRef: e.debugId,
        level: "danger",
      });
      throw new AppError(422, "INSTRUMENT_DECLINED", "The card was declined. No money was taken. Try again with a different payment method.", {
        recoverable: true,
        debugId: e.debugId,
      });
    }
    if (isPayPalError(e)) {
      db.update(schema.payments)
        .set({ status: "FAILED", failureCode: e.issue ?? e.paypalName })
        .where(eq(schema.payments.id, payment.id))
        .run();
      logEvent(inv.projectId, "payment_failed", `Capture failed for invoice ${inv.invoiceNumber}: ${e.issue ?? e.message}`, {
        paypalRef: e.debugId,
        level: "danger",
      });
      throw new AppError(422, e.issue ?? "CAPTURE_FAILED", e.message, {
        recoverable: e.status === 422,
        debugId: e.debugId,
      });
    }
    throw e;
  }

  const completed = result.captureStatus === "COMPLETED";
  const paidAt = new Date().toISOString();
  db.transaction((tx) => {
    tx.update(schema.payments)
      .set({
        status: completed ? "COMPLETED" : (result.captureStatus ?? "PENDING"),
        paypalCaptureId: result.captureId,
        amountCents: result.amountCents,
        currency: result.currency,
        rawJson: JSON.stringify(result.raw),
      })
      .where(eq(schema.payments.id, payment.id))
      .run();
    if (!completed) return;
    tx.update(schema.invoices).set({ status: "PAID", paidAt }).where(eq(schema.invoices.id, inv.id)).run();
    if (inv.kind === "milestone") {
      tx.update(schema.milestones).set({ status: "paid" }).where(eq(schema.milestones.id, inv.refId)).run();
    } else {
      tx.update(schema.changeOrders).set({ status: "paid" }).where(eq(schema.changeOrders.id, inv.refId)).run();
    }
  });

  if (!completed) {
    logEvent(inv.projectId, "payment_pending", `Capture is ${result.captureStatus} for invoice ${inv.invoiceNumber}`, {
      paypalRef: result.captureId,
      level: "warning",
    });
    return { status: result.captureStatus ?? "PENDING", captureId: result.captureId };
  }

  logEvent(inv.projectId, "payment_captured", `Payment of ${formatUSD(result.amountCents)} captured for invoice ${inv.invoiceNumber}. Work unlocked.`, {
    paypalRef: result.captureId,
    level: "success",
  });

  // FR-20: mark it paid on PayPal's side too. A failure here doesn't undo the capture.
  try {
    await recordInvoicePayment({
      paypalInvoiceId: inv.paypalInvoiceId!,
      key: `${inv.id}-${payment.attempt}`,
      amountCents: result.amountCents,
      currency: result.currency,
      date: paidAt.slice(0, 10),
      note: `Paid via PayPal checkout, capture ${result.captureId}`,
    });
    logEvent(inv.projectId, "invoice_recorded", `PayPal invoice ${inv.invoiceNumber} marked as paid`, {
      paypalRef: inv.paypalInvoiceId,
      level: "success",
    });
  } catch (e) {
    logEvent(inv.projectId, "invoice_record_failed", `Couldn't mark PayPal invoice ${inv.invoiceNumber} as paid: ${e instanceof Error ? e.message : e}`, {
      paypalRef: isPayPalError(e) ? e.debugId : null,
      level: "warning",
    });
  }

  return { status: "COMPLETED", captureId: result.captureId };
}
