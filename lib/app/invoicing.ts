import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { logEvent } from "@/lib/domain/events";
import type { LineItem } from "@/lib/domain/types";
import { isPayPalError } from "@/lib/paypal/errors";
import { createAndSendInvoice } from "@/lib/paypal/invoices";

/**
 * Issue a DRAFT invoice row on PayPal: create, send to the client, then store the INV2- ID,
 * number, status and payer link. Throws (after logging) if PayPal fails.
 */
export async function issueInvoice(invoiceId: string): Promise<typeof schema.invoices.$inferSelect> {
  const db = getDb();
  const inv = db.select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId)).get();
  if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
  if (inv.paypalInvoiceId) return inv;
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, inv.projectId)).get()!;
  const lines = JSON.parse(inv.itemsJson) as LineItem[];

  try {
    const r = await createAndSendInvoice({
      key: inv.id,
      recipientEmail: project.clientEmail,
      note: inv.note ?? "",
      dueDate: inv.dueDate ?? new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
      currency: inv.currency,
      lines: lines.map((l) =>
        inv.kind === "milestone"
          ? { name: l.title, description: l.description, quantity: 1, unitCents: l.amountCents, unitOfMeasure: "QUANTITY" as const }
          : { name: l.title, description: `${l.description} (${l.role})`.trim(), quantity: l.hours, unitCents: l.rateCents, unitOfMeasure: "HOURS" as const },
      ),
    });
    db.update(schema.invoices)
      .set({
        paypalInvoiceId: r.paypalInvoiceId,
        invoiceNumber: r.invoiceNumber,
        status: r.status === "PAID" ? "PAID" : "SENT",
        payerViewUrl: r.payerViewUrl,
        rawJson: JSON.stringify(r.raw),
      })
      .where(eq(schema.invoices.id, inv.id))
      .run();
    logEvent(inv.projectId, "invoice_sent", `Invoice ${r.invoiceNumber} (${inv.title}) sent to ${project.clientEmail}`, {
      paypalRef: r.paypalInvoiceId,
      level: "info",
    });
    return db.select().from(schema.invoices).where(eq(schema.invoices.id, inv.id)).get()!;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logEvent(inv.projectId, "invoice_failed", `Couldn't send invoice for ${inv.title}: ${msg}`, {
      paypalRef: isPayPalError(e) ? e.debugId : null,
      level: "danger",
    });
    throw e;
  }
}
