import type { LineItem, RateCard, Role } from "./types";

export interface PricingInput {
  title: string;
  description?: string;
  role: Role;
  hours: number;
}

/** Round to the nearest half hour, never below 0.5. */
export function roundHours(hours: number): number {
  if (!Number.isFinite(hours)) return 0.5;
  return Math.max(0.5, Math.round(hours * 2) / 2);
}

/** Prices are computed here, never by the model: hours (rounded to 0.5) × role rate. */
export function priceItems(
  items: PricingInput[],
  rateCard: RateCard,
): { lines: LineItem[]; totalCents: number } {
  const lines = items.map((item) => {
    const hours = roundHours(item.hours);
    const rateCents = rateCard[item.role];
    if (rateCents === undefined) throw new Error(`No rate for role ${item.role}`);
    // hours is a multiple of 0.5, so hours * 2 is an integer and the product stays exact.
    const amountCents = Math.round((rateCents * Math.round(hours * 2)) / 2);
    return {
      title: item.title,
      description: item.description ?? "",
      role: item.role,
      hours,
      rateCents,
      amountCents,
    };
  });
  return { lines, totalCents: lines.reduce((sum, l) => sum + l.amountCents, 0) };
}
