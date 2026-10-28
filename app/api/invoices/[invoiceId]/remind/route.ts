import { eq } from "drizzle-orm";
import { z } from "zod";
import { generateJson } from "@/lib/ai/extract";
import { REMINDER_SYSTEM } from "@/lib/ai/prompts";
import { AppError, parseBody, rateLimit } from "@/lib/app/http";
import { route } from "@/lib/app/route";
import { getDb, schema } from "@/lib/db/client";
import { logEvent } from "@/lib/domain/events";
import { formatUSD } from "@/lib/domain/money";
import { remindInvoice } from "@/lib/paypal/invoices";

export const dynamic = "force-dynamic";

const Body = z.union([
  z.object({ draft: z.literal(true), tone: z.enum(["friendly", "firm"]).default("friendly") }),
  z.object({ subject: z.string().trim().min(3).max(100), note: z.string().trim().min(3).max(600) }),
]);
const Draft = z.object({ subject: z.string().min(3).max(100), note: z.string().min(3).max(600) });

/** P1 (FR-16): `{ draft: true }` returns an AI draft; `{ subject, note }` sends it via PayPal. */
export const POST = route<{ invoiceId: string }>(async (req, { invoiceId }) => {
  const body = await parseBody(req, Body);
  const db = getDb();
  const inv = db.select().from(schema.invoices).where(eq(schema.invoices.id, invoiceId)).get();
  if (!inv) throw new AppError(404, "NOT_FOUND", "Invoice not found");
  if (inv.status !== "SENT" || !inv.paypalInvoiceId) {
    throw new AppError(409, "NOT_REMINDABLE", "Only sent, unpaid invoices can be reminded");
  }

  if ("draft" in body) {
    rateLimit(req, "remind-draft", 10, 60_000);
    const daysOverdue = inv.dueDate ? Math.max(0, Math.floor((Date.now() - Date.parse(inv.dueDate)) / 86_400_000)) : 0;
    const prompt = `Invoice ${inv.invoiceNumber}, "${inv.title}", ${formatUSD(inv.totalCents)}, due ${inv.dueDate}, ${daysOverdue} days overdue. Tone: ${body.tone}. Client: Acme Bakery.`;
    const parsed = Draft.safeParse(await generateJson(REMINDER_SYSTEM, prompt));
    if (parsed.success) return { ...parsed.data, source: "ai" as const };
    return {
      subject: `Friendly reminder: invoice ${inv.invoiceNumber}`,
      note: `Hi Acme Bakery team, a quick reminder that invoice ${inv.invoiceNumber} for ${formatUSD(inv.totalCents)} (${inv.title}) is due ${inv.dueDate}. The next phase of work starts as soon as it's paid. Thank you!`,
      source: "fallback" as const,
    };
  }

  await remindInvoice({
    paypalInvoiceId: inv.paypalInvoiceId,
    key: `${inv.id}-${Date.now()}`,
    subject: body.subject,
    note: body.note,
  });
  logEvent(inv.projectId, "invoice_reminded", `Reminder sent for invoice ${inv.invoiceNumber}`, { paypalRef: inv.paypalInvoiceId });
  return { ok: true };
});
