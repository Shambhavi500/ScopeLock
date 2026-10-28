import { eq } from "drizzle-orm";
import { AppError } from "@/lib/app/http";
import { issueInvoice } from "@/lib/app/invoicing";
import { getProjectState } from "@/lib/app/project";
import { route } from "@/lib/app/route";
import { getDb, schema } from "@/lib/db/client";
import { getInvoice } from "@/lib/paypal/invoices";

export const dynamic = "force-dynamic";

function publicInvoice(invoiceId: string) {
  const row = getDb().select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId)).get();
  if (!row) throw new AppError(404, "NOT_FOUND", "Invoice not found");
  const state = getProjectState(row.projectId);
  const inv = state.invoices.find((i) => i.id === invoiceId)!;
  return {
    invoice: inv,
    project: { name: state.project.name, clientName: state.project.clientName },
    paypalMode: state.config.paypalMode,
    buyerEmail: state.config.buyerEmail,
  };
}

/** GET: invoice for the pay page; `?refresh=1` also syncs status from PayPal (FR-14/17). */
export const GET = route<{ invoiceId: string }>(async (req, { invoiceId }) => {
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const row = getDb().select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId)).get();
  if (refresh && row?.paypalInvoiceId && row.status !== "PAID") {
    const remote = await getInvoice(row.paypalInvoiceId);
    if (remote.status === "PAID" || remote.status === "MARKED_AS_PAID") {
      getDb().update(schema.invoices).set({ status: "PAID", paidAt: new Date().toISOString() }).where(eq(schema.invoices.id, invoiceId)).run();
      if (row.kind === "milestone") {
        getDb().update(schema.milestones).set({ status: "paid" }).where(eq(schema.milestones.id, row.refId)).run();
      } else {
        getDb().update(schema.changeOrders).set({ status: "paid" }).where(eq(schema.changeOrders.id, row.refId)).run();
      }
    }
  }
  return publicInvoice(invoiceId);
});

/** POST: retry sending a DRAFT invoice through PayPal (e.g. if the boot-time send failed). */
export const POST = route<{ invoiceId: string }>(async (_req, { invoiceId }) => {
  await issueInvoice(invoiceId);
  return publicInvoice(invoiceId);
});
