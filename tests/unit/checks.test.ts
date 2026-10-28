import { describe, expect, it } from "vitest";
import { prePayoutChecks, type PrePayoutContext } from "@/lib/domain/checks";

const good: PrePayoutContext = {
  invoice: { status: "PAID", totalCents: 170000, currency: "USD" },
  capture: { status: "COMPLETED", amountCents: 170000, currency: "USD" },
  marginCents: 34000,
  shares: [
    { name: "Dana", email: "dana@example.com", amountCents: 40800 },
    { name: "Ravi", email: "ravi@example.com", amountCents: 47600 },
    { name: "Mei", email: "mei@example.com", amountCents: 47600 },
  ],
  existingBatch: false,
  payoutCapCents: 500000,
};

const failing = (ctx: PrePayoutContext) =>
  prePayoutChecks(ctx).filter((c) => !c.pass).map((c) => c.id);

describe("prePayoutChecks", () => {
  it("passes all six on a clean capture", () => {
    const checks = prePayoutChecks(good);
    expect(checks).toHaveLength(6);
    expect(failing(good)).toEqual([]);
  });

  it("fails when not captured", () => {
    expect(failing({ ...good, capture: null })).toEqual(
      expect.arrayContaining(["captured", "amount", "split"]),
    );
    expect(failing({ ...good, invoice: { ...good.invoice, status: "SENT" } })).toContain("captured");
  });

  it("fails on amount or currency mismatch", () => {
    expect(failing({ ...good, capture: { ...good.capture!, amountCents: 169999 } })).toContain("amount");
    expect(failing({ ...good, capture: { ...good.capture!, currency: "EUR" } })).toContain("amount");
  });

  it("fails when the split is off by a cent", () => {
    expect(failing({ ...good, marginCents: 33999 })).toEqual(["split"]);
  });

  it("fails on bad emails, an existing batch, or the cap", () => {
    expect(failing({ ...good, shares: [{ ...good.shares[0], email: "nope" }, ...good.shares.slice(1)] })).toContain("emails");
    expect(failing({ ...good, existingBatch: true })).toEqual(["not_paid_out"]);
    expect(failing({ ...good, payoutCapCents: 45000 })).toEqual(["cap"]);
  });
});
