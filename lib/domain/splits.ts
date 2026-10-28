export interface SplitContractor {
  id: string;
  splitBps: number; // share of the contractor pool in basis points; all add up to 10000
}

export interface SplitResult {
  marginCents: number;
  shares: { contractorId: string; amountCents: number }[];
  totalCents: number;
}

/**
 * Agency margin comes off the top and the rest is shared by split. Largest-remainder rounding
 * guarantees margin + shares === captured, to the cent.
 */
export function computeSplit(
  capturedCents: number,
  marginBps: number,
  contractors: SplitContractor[],
): SplitResult {
  if (!Number.isInteger(capturedCents) || capturedCents < 0) {
    throw new Error(`Invalid captured amount: ${capturedCents}`);
  }
  const poolBps = contractors.reduce((s, c) => s + c.splitBps, 0);
  if (poolBps !== 10000) throw new Error(`Contractor splits add up to ${poolBps} bps, not 10000`);
  if (marginBps < 0 || marginBps > 10000) throw new Error(`Invalid margin: ${marginBps}`);

  // Weights over a common denominator of 10000 * 10000; BigInt keeps large amounts exact.
  const weights = [
    BigInt(marginBps) * 10000n,
    ...contractors.map((c) => BigInt(10000 - marginBps) * BigInt(c.splitBps)),
  ];
  const denom = 100000000n;
  const total = BigInt(capturedCents);
  const floors = weights.map((w) => (total * w) / denom);
  const remainders = weights.map((w, i) => ({ i, r: (total * w) % denom }));
  let leftover = Number(total - floors.reduce((a, b) => a + b, 0n));
  remainders.sort((a, b) => (b.r > a.r ? 1 : b.r < a.r ? -1 : a.i - b.i));
  const amounts = floors.map(Number);
  for (const { i } of remainders) {
    if (leftover <= 0) break;
    amounts[i] += 1;
    leftover -= 1;
  }

  return {
    marginCents: amounts[0],
    shares: contractors.map((c, idx) => ({ contractorId: c.id, amountCents: amounts[idx + 1] })),
    totalCents: capturedCents,
  };
}
