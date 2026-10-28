import { formatUSD } from "./money";

export interface Check {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

export interface PrePayoutContext {
  invoice: { status: string; totalCents: number; currency: string };
  capture: { status: string; amountCents: number; currency: string } | null;
  marginCents: number;
  shares: { name: string; email: string; amountCents: number }[];
  existingBatch: boolean;
  payoutCapCents: number;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The six deterministic checks from prd §8.2. Any failure disables the payout button. */
export function prePayoutChecks(ctx: PrePayoutContext): Check[] {
  const { invoice, capture } = ctx;
  const sharesTotal = ctx.shares.reduce((s, x) => s + x.amountCents, 0);
  const badEmails = ctx.shares.filter((s) => !EMAIL.test(s.email));
  const overCap = ctx.shares.filter((s) => s.amountCents > ctx.payoutCapCents);
  const largest = Math.max(0, ...ctx.shares.map((s) => s.amountCents));

  return [
    {
      id: "captured",
      label: "Payment captured",
      pass: invoice.status === "PAID" && capture?.status === "COMPLETED",
      detail: capture
        ? `Invoice ${invoice.status}, capture ${capture.status}`
        : `Invoice ${invoice.status}, no completed capture yet`,
    },
    {
      id: "amount",
      label: "Amount matches the invoice",
      pass:
        !!capture &&
        capture.amountCents === invoice.totalCents &&
        capture.currency === invoice.currency,
      detail: capture
        ? `Captured ${formatUSD(capture.amountCents)} ${capture.currency} = invoice ${formatUSD(invoice.totalCents)} ${invoice.currency}`
        : "Nothing captured yet",
    },
    {
      id: "split",
      label: "Split adds up to the cent",
      pass: !!capture && sharesTotal + ctx.marginCents === capture.amountCents,
      detail: `Shares ${formatUSD(sharesTotal)} + margin ${formatUSD(ctx.marginCents)} = ${formatUSD(sharesTotal + ctx.marginCents)}`,
    },
    {
      id: "emails",
      label: "Every contractor has a payout email",
      pass: ctx.shares.length > 0 && badEmails.length === 0,
      detail: badEmails.length
        ? `Missing or invalid: ${badEmails.map((s) => s.name).join(", ")}`
        : `${ctx.shares.length} valid sandbox emails`,
    },
    {
      id: "not_paid_out",
      label: "Not already paid out",
      pass: !ctx.existingBatch,
      detail: ctx.existingBatch ? "A payout batch already exists for this invoice" : "No previous batch",
    },
    {
      id: "cap",
      label: "Each payout is under the cap",
      pass: overCap.length === 0,
      detail: overCap.length
        ? `${overCap.map((s) => s.name).join(", ")} over ${formatUSD(ctx.payoutCapCents)}`
        : `Largest ${formatUSD(largest)} ≤ cap ${formatUSD(ctx.payoutCapCents)}`,
    },
  ];
}
