/** All money is integer cents. Decimal strings exist only at the PayPal boundary. */

export function toCents(value: number | string): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) throw new Error(`Not a number: ${value}`);
  return Math.round(n * 100);
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** formatUSD(104500) → "$1,045.00"; negatives use a true minus sign: "−$420.00". */
export function formatUSD(cents: number): string {
  const s = usd.format(Math.abs(cents) / 100);
  return cents < 0 ? `−${s}` : s;
}

/** toPayPalValue(95000) → "950.00". Integer arithmetic only, so no float drift. */
export function toPayPalValue(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error(`Invalid cents: ${cents}`);
  const whole = Math.floor(cents / 100);
  const frac = String(cents % 100).padStart(2, "0");
  return `${whole}.${frac}`;
}

/** fromPayPalValue("950.00") → 95000. */
export function fromPayPalValue(value: string): number {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!m) throw new Error(`Invalid PayPal amount: ${value}`);
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
}
