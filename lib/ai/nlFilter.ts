import { z } from "zod";

/** The only filter shape the model may produce. Mapped to AG Grid by code, never passed through. */
export const LedgerFilter = z
  .object({
    status: z.enum(["paid", "unpaid", "declined", "sent", "processing"]).optional(),
    kind: z.enum(["invoice", "payment", "payout"]).optional(),
    minAmount: z.number().min(0).max(1_000_000).optional(),
    maxAmount: z.number().min(0).max(1_000_000).optional(),
    text: z.string().max(80).optional(),
  })
  .strict();
export type LedgerFilter = z.infer<typeof LedgerFilter>;

/** Rule-based reading used when the AI is offline, e.g. "unpaid invoices over $500". */
export function ruleBasedFilter(q: string): LedgerFilter {
  const s = q.toLowerCase();
  const f: LedgerFilter = {};
  if (/\bunpaid|awaiting|outstanding|overdue\b/.test(s)) f.status = "unpaid";
  else if (/\bdeclined|failed\b/.test(s)) f.status = "declined";
  else if (/\bprocessing|pending\b/.test(s)) f.status = "processing";
  else if (/\bpaid|sent\b/.test(s)) f.status = "paid";
  if (/\binvoices?\b/.test(s)) f.kind = "invoice";
  else if (/\bpayouts?\b|contractor/.test(s)) f.kind = "payout";
  else if (/\bpayments?\b|captures?\b/.test(s)) f.kind = "payment";
  const over = /(?:over|above|more than|>)\s*\$?([\d,]+(?:\.\d+)?)/.exec(s);
  const under = /(?:under|below|less than|<)\s*\$?([\d,]+(?:\.\d+)?)/.exec(s);
  if (over) f.minAmount = Number(over[1].replace(/,/g, ""));
  if (under) f.maxAmount = Number(under[1].replace(/,/g, ""));
  if (Object.keys(f).length === 0 && q.trim()) f.text = q.trim().slice(0, 80);
  return f;
}
