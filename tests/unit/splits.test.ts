import { describe, expect, it } from "vitest";
import { computeSplit } from "@/lib/domain/splits";

const team = [
  { id: "designer", splitBps: 3000 },
  { id: "frontend", splitBps: 3500 },
  { id: "backend", splitBps: 3500 },
];

const sum = (r: ReturnType<typeof computeSplit>) =>
  r.marginCents + r.shares.reduce((s, x) => s + x.amountCents, 0);

describe("computeSplit", () => {
  it("splits an even amount exactly", () => {
    const r = computeSplit(170000, 2000, team);
    expect(r.marginCents).toBe(34000);
    expect(r.shares.map((s) => s.amountCents)).toEqual([40800, 47600, 47600]);
    expect(sum(r)).toBe(170000);
  });

  it("adds up to the cent on awkward amounts", () => {
    for (const cents of [1, 2, 3, 7, 99, 101, 12345, 104599, 999999]) {
      expect(sum(computeSplit(cents, 2000, team))).toBe(cents);
    }
  });

  it("handles zero", () => {
    expect(sum(computeSplit(0, 2000, team))).toBe(0);
  });

  it("rejects splits that don't add up to 100%", () => {
    expect(() => computeSplit(100, 2000, [{ id: "a", splitBps: 5000 }])).toThrow();
  });

  it("rejects fractional cents", () => {
    expect(() => computeSplit(10.5, 2000, team)).toThrow();
  });
});
