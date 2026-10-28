import "server-only";
import { toPayPalValue } from "@/lib/domain/money";
import { paypalFetch } from "./request";

export interface InvoiceLine {
  name: string;
  description: string;
  quantity: number; // hours (or 1 for a fixed milestone)
  unitCents: number;
  unitOfMeasure: "HOURS" | "QUANTITY";
}

export interface PayPalInvoice {
  id: string;
  status: string;
  detail?: { invoice_number?: string; metadata?: { recipient_view_url?: string } };
  amount?: { value: string; currency_code: string };
}

/** Pull the invoice ID out of either a full representation or a `{ href }` link response. */
function idFrom(data: { id?: string; href?: string }): string {
  if (data.id) return data.id;
  const m = data.href ? /invoices\/([^/?]+)/.exec(data.href) : null;
  if (!m) throw new Error("PayPal did not return an invoice ID");
  return m[1];
}

export async function generateInvoiceNumber(key: string): Promise<string> {
  const { data } = await paypalFetch<{ invoice_number: string }>(
    "/v2/invoicing/generate-next-invoice-number",
    { method: "POST", requestId: `num-${key}` },
  );
  return data.invoice_number;
}

export async function getInvoice(paypalInvoiceId: string): Promise<PayPalInvoice> {
  const { data } = await paypalFetch<PayPalInvoice>(`/v2/invoicing/invoices/${paypalInvoiceId}`);
  return data;
}

/** Create a draft, send it to the client, then read it back for status and the payer link. */
export async function createAndSendInvoice(input: {
  key: string; // our invoice ID, used for idempotency keys
  recipientEmail: string;
  lines: InvoiceLine[];
  note: string;
  dueDate: string; // yyyy-mm-dd
  currency?: string;
}): Promise<{ paypalInvoiceId: string; invoiceNumber: string; status: string; payerViewUrl: string | null; raw: PayPalInvoice }> {
  const currency = input.currency ?? "USD";
  const invoiceNumber = await generateInvoiceNumber(input.key);

  const created = await paypalFetch<{ id?: string; href?: string }>("/v2/invoicing/invoices", {
    method: "POST",
    requestId: `inv-create-${input.key}`,
    prefer: "return=representation",
    body: {
      detail: {
        invoice_number: invoiceNumber,
        currency_code: currency,
        note: input.note,
        payment_term: { term_type: "DUE_ON_DATE_SPECIFIED", due_date: input.dueDate },
      },
      primary_recipients: [{ billing_info: { email_address: input.recipientEmail } }],
      items: input.lines.map((l) => ({
        name: l.name.slice(0, 200),
        description: l.description.slice(0, 1000),
        quantity: String(l.quantity),
        unit_amount: { currency_code: currency, value: toPayPalValue(l.unitCents) },
        unit_of_measure: l.unitOfMeasure,
      })),
    },
  });
  const paypalInvoiceId = idFrom(created.data);

  await paypalFetch(`/v2/invoicing/invoices/${paypalInvoiceId}/send`, {
    method: "POST",
    requestId: `inv-send-${input.key}`,
    body: { send_to_recipient: true, send_to_invoicer: false },
  });

  const raw = await getInvoice(paypalInvoiceId);
  return {
    paypalInvoiceId,
    invoiceNumber: raw.detail?.invoice_number ?? invoiceNumber,
    status: raw.status,
    payerViewUrl: raw.detail?.metadata?.recipient_view_url ?? null,
    raw,
  };
}

/** Mark the PayPal invoice as paid after our own Orders capture succeeds (FR-20). */
export async function recordInvoicePayment(input: {
  paypalInvoiceId: string;
  key: string;
  amountCents: number;
  currency?: string;
  date: string; // yyyy-mm-dd
  note: string;
}): Promise<{ paymentId: string | null }> {
  const { data } = await paypalFetch<{ payment_id?: string }>(
    `/v2/invoicing/invoices/${input.paypalInvoiceId}/payments`,
    {
      method: "POST",
      requestId: `inv-pay-${input.key}`,
      body: {
        method: "PAYPAL",
        payment_date: input.date,
        note: input.note,
        amount: { currency_code: input.currency ?? "USD", value: toPayPalValue(input.amountCents) },
      },
    },
  );
  return { paymentId: data.payment_id ?? null };
}

export async function remindInvoice(input: {
  paypalInvoiceId: string;
  key: string;
  subject: string;
  note: string;
}): Promise<void> {
  await paypalFetch(`/v2/invoicing/invoices/${input.paypalInvoiceId}/remind`, {
    method: "POST",
    requestId: `inv-remind-${input.key}`,
    body: { subject: input.subject, note: input.note, send_to_invoicer: false },
  });
}
