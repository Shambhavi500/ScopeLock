import "server-only";
import { and, desc, eq } from "drizzle-orm";
import type { PayoutBatchDTO, PayoutPreviewResponse } from "@/lib/api-types";
import { getDb, schema } from "@/lib/db/client";
import { prePayoutChecks } from "@/lib/domain/checks";
import { logEvent } from "@/lib/domain/events";
import { formatUSD } from "@/lib/domain/money";
import { computeSplit } from "@/lib/domain/splits";
import { env } from "@/lib/env";
import { newId } from "@/lib/ids";
import { isPayPalError } from "@/lib/paypal/errors";
import { createPayoutBatch, getPayoutBatch } from "@/lib/paypal/payouts";
import { AppError } from "./http";

const FINAL_BATCH = new Set(["SUCCESS", "DENIED", "CANCELED"]);

function batchDTO(batchId: string): PayoutBatchDTO | null {
  const db = getDb();
  const b = db.select().from(schema.payoutBatches).where(eq(schema.payoutBatches.id, batchId)).get();
  if (!b) return null;
  const contractors = db.select().from(schema.contractors).all();
  const items = db.select().from(schema.payoutItems).where(eq(schema.payoutItems.batchId, b.id)).all();
  return {
    id: b.id,
    invoiceId: b.invoiceId,
    paypalBatchId: b.paypalBatchId,
    status: b.status,
    marginCents: b.marginCents,
    createdAt: b.createdAt,
    items: items.map((i) => ({
      id: i.id,
      contractorId: i.contractorId,
      contractorName: contractors.find((c) => c.id === i.contractorId)?.name ?? i.contractorId,
      amountCents: i.amountCents,
      paypalItemId: i.paypalItemId,
      status: i.status,
    })),
  };
}

/** Split + the six deterministic checks. Pure reads; no PayPal calls. */
export function previewPayout(invoiceId: string): PayoutPreviewResponse {
  const db = getDb();
  const inv = db.select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId)).get();
  if (!inv) throw new AppError(404, "NOT_FOUND", "Invoice not found");
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, inv.projectId)).get()!;
  const contractors = db.select().from(schema.contractors).where(eq(schema.contractors.projectId, inv.projectId)).all();
  const capture = db
    .select()
    .from(schema.payments)
    .where(and(eq(schema.payments.invoiceId, inv.id), eq(schema.payments.status, "COMPLETED")))
    .orderBy(desc(schema.payments.createdAt))
    .get();
  const batch = db.select().from(schema.payoutBatches).where(eq(schema.payoutBatches.invoiceId, inv.id)).get();

  const basis = capture?.amountCents ?? inv.totalCents;
  const split = computeSplit(basis, project.agencyMarginBps, contractors.map((c) => ({ id: c.id, splitBps: c.splitBps })));
  const rows = contractors.map((c) => ({
    contractorId: c.id,
    name: c.name,
    title: c.title,
    email: c.payoutEmail,
    splitBps: c.splitBps,
    amountCents: split.shares.find((s) => s.contractorId === c.id)!.amountCents,
  }));

  const checks = prePayoutChecks({
    invoice: { status: inv.status, totalCents: inv.totalCents, currency: inv.currency },
    capture: capture ? { status: capture.status, amountCents: capture.amountCents, currency: capture.currency } : null,
    marginCents: split.marginCents,
    shares: rows.map((r) => ({ name: r.name, email: r.email, amountCents: r.amountCents })),
    existingBatch: !!batch,
    payoutCapCents: env.PAYOUT_CAP_CENTS,
  });

  return {
    invoiceId: inv.id,
    capturedCents: capture?.amountCents ?? null,
    split: rows,
    marginCents: split.marginCents,
    marginBps: project.agencyMarginBps,
    checks,
    canPay: checks.every((c) => c.pass) && !inv.seeded,
    batch: batch ? batchDTO(batch.id) : null,
  };
}

/** Send the Payouts batch. Re-runs every check server-side; the unique invoice_id blocks doubles. */
export async function sendPayout(invoiceId: string): Promise<{ batchId: string }> {
  const db = getDb();
  const preview = previewPayout(invoiceId);
  if (!preview.canPay) {
    const failing = preview.checks.filter((c) => !c.pass);
    const code = failing.some((c) => c.id === "not_paid_out") ? "ALREADY_PAID_OUT" : "CHECKS_FAILED";
    throw new AppError(409, code, `${failing.length} pre-payout check(s) failing: ${failing.map((c) => c.label).join(", ")}`, {
      details: preview.checks,
    });
  }
  const inv = db.select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId)).get()!;
  const batchId = newId("pb");
  const senderBatchId = `co-${invoiceId}`;
  try {
    db.insert(schema.payoutBatches)
      .values({ id: batchId, invoiceId, senderBatchId, status: "CREATING", marginCents: preview.marginCents, createdAt: new Date().toISOString() })
      .run();
  } catch {
    throw new AppError(409, "ALREADY_PAID_OUT", "A payout batch already exists for this invoice");
  }

  try {
    const r = await createPayoutBatch({
      senderBatchId,
      subject: `You've been paid for ${inv.title}`.slice(0, 255),
      message: `Your share of invoice ${inv.invoiceNumber} for the Acme Bakery project.`,
      items: preview.split.map((s) => ({
        receiver: s.email,
        amountCents: s.amountCents,
        note: `${s.title} share (${s.splitBps / 100}% of the contractor pool) for invoice ${inv.invoiceNumber}`,
        senderItemId: `${invoiceId}-${s.contractorId}`,
      })),
    });
    db.transaction((tx) => {
      tx.update(schema.payoutBatches)
        .set({ paypalBatchId: r.batchId, status: r.status, rawJson: JSON.stringify(r.raw) })
        .where(eq(schema.payoutBatches.id, batchId))
        .run();
      for (const s of preview.split) {
        tx.insert(schema.payoutItems)
          .values({ id: newId("pi"), batchId, contractorId: s.contractorId, amountCents: s.amountCents, status: "PENDING" })
          .run();
      }
    });
    logEvent(inv.projectId, "payout_sent", `Payout batch for ${formatUSD(preview.split.reduce((a, s) => a + s.amountCents, 0))} sent to ${preview.split.length} contractors (margin ${formatUSD(preview.marginCents)} retained)`, {
      paypalRef: r.batchId,
      level: "warning",
    });
    return { batchId };
  } catch (e) {
    // Nothing reached PayPal (or PayPal rejected it): free the slot so the lead can retry.
    db.delete(schema.payoutBatches).where(eq(schema.payoutBatches.id, batchId)).run();
    logEvent(inv.projectId, "payout_failed", `Payout batch failed: ${e instanceof Error ? e.message : e}`, {
      paypalRef: isPayPalError(e) ? e.debugId : null,
      level: "danger",
    });
    throw e;
  }
}

/** GET /api/payouts/:batchId: refresh from PayPal until the batch settles. */
export async function pollPayout(batchId: string): Promise<PayoutBatchDTO> {
  const db = getDb();
  const b = db.select().from(schema.payoutBatches).where(eq(schema.payoutBatches.id, batchId)).get();
  if (!b) throw new AppError(404, "NOT_FOUND", "Payout batch not found");
  if (FINAL_BATCH.has(b.status) || !b.paypalBatchId) return batchDTO(b.id)!;

  const r = await getPayoutBatch(b.paypalBatchId);
  const inv = db.select().from(schema.invoices).where(eq(schema.invoices.id, b.invoiceId)).get()!;
  const items = db.select().from(schema.payoutItems).where(eq(schema.payoutItems.batchId, b.id)).all();
  const wasFinal = FINAL_BATCH.has(b.status);

  db.transaction((tx) => {
    tx.update(schema.payoutBatches).set({ status: r.status, rawJson: JSON.stringify(r.raw) }).where(eq(schema.payoutBatches.id, b.id)).run();
    for (const item of items) {
      const remote = r.items.find((x) => x.senderItemId === `${b.invoiceId}-${item.contractorId}`);
      if (remote) {
        tx.update(schema.payoutItems).set({ status: remote.status, paypalItemId: remote.payoutItemId }).where(eq(schema.payoutItems.id, item.id)).run();
      }
    }
    if (r.status === "SUCCESS") {
      if (inv.kind === "milestone") {
        tx.update(schema.milestones).set({ status: "paid_out" }).where(eq(schema.milestones.id, inv.refId)).run();
      } else {
        tx.update(schema.changeOrders).set({ status: "paid_out" }).where(eq(schema.changeOrders.id, inv.refId)).run();
      }
    }
  });

  if (!wasFinal && FINAL_BATCH.has(r.status)) {
    const okItems = r.items.filter((i) => i.status === "SUCCESS").length;
    logEvent(inv.projectId, "payout_settled", `Payout batch ${r.status}: ${okItems}/${r.items.length} contractors paid`, {
      paypalRef: b.paypalBatchId,
      level: r.status === "SUCCESS" ? "success" : "danger",
    });
  }
  return batchDTO(b.id)!;
}
