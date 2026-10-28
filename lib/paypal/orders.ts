import "server-only";
import { fromPayPalValue, toPayPalValue } from "@/lib/domain/money";
import { paypalFetch } from "./request";

export interface OrderLine {
  name: string;
  amountCents: number;
}

/** Create a CAPTURE order for one of our invoices. Server-side only (FR-19). */
export async function createOrder(input: {
  requestId: string;
  invoiceId: string; // our ID → reference_id
  invoiceNumber: string; // PayPal duplicate-payment guard → invoice_id
  description: string;
  totalCents: number;
  currency?: string;
  lines: OrderLine[];
}): Promise<{ orderId: string; raw: unknown }> {
  const currency = input.currency ?? "USD";
  const { data } = await paypalFetch<{ id: string }>("/v2/checkout/orders", {
    method: "POST",
    requestId: input.requestId,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.invoiceId,
          invoice_id: input.invoiceNumber,
          description: input.description.slice(0, 127),
          amount: {
            currency_code: currency,
            value: toPayPalValue(input.totalCents),
            breakdown: { item_total: { currency_code: currency, value: toPayPalValue(input.totalCents) } },
          },
          // Orders v2 needs whole-number quantities, so each line is "1 × line total".
          items: input.lines.map((l) => ({
            name: l.name.slice(0, 127),
            quantity: "1",
            unit_amount: { currency_code: currency, value: toPayPalValue(l.amountCents) },
            category: "DIGITAL_GOODS",
          })),
        },
      ],
    },
  });
  return { orderId: data.id, raw: data };
}

export interface CaptureResult {
  orderStatus: string;
  captureId: string | null;
  captureStatus: string | null;
  amountCents: number;
  currency: string;
  raw: unknown;
}

export async function captureOrder(
  orderId: string,
  opts: { requestId: string; mock?: string },
): Promise<CaptureResult> {
  const { data } = await paypalFetch<{
    status: string;
    purchase_units?: {
      payments?: { captures?: { id: string; status: string; amount: { value: string; currency_code: string } }[] };
    }[];
  }>(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    requestId: opts.requestId,
    mock: opts.mock,
    prefer: "return=representation",
    body: {},
  });
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    orderStatus: data.status,
    captureId: capture?.id ?? null,
    captureStatus: capture?.status ?? null,
    amountCents: capture ? fromPayPalValue(capture.amount.value) : 0,
    currency: capture?.amount.currency_code ?? "USD",
    raw: data,
  };
}
