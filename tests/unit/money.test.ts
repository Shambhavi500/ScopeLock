import { describe, expect, it } from "vitest";
import { formatUSD, fromPayPalValue, toCents, toPayPalValue } from "@/lib/domain/money";

describe("money", () => {
  it("converts to cents without float drift", () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents("950.00")).toBe(95000);
    expect(toCents(19.99)).toBe(1999);
  });

  it("formats USD with a true minus sign", () => {
    expect(formatUSD(104500)).toBe("$1,045.00");
    expect(formatUSD(-42000)).toBe("−$420.00");
    expect(formatUSD(0)).toBe("$0.00");
  });

  it("formats PayPal values", () => {
    expect(toPayPalValue(95000)).toBe("950.00");
    expect(toPayPalValue(5)).toBe("0.05");
    expect(toPayPalValue(100)).toBe("1.00");
    expect(() => toPayPalValue(-1)).toThrow();
    expect(() => toPayPalValue(1.5)).toThrow();
  });

  it("parses PayPal values", () => {
    expect(fromPayPalValue("950.00")).toBe(95000);
    expect(fromPayPalValue("1.5")).toBe(150);
    expect(fromPayPalValue("12")).toBe(1200);
    expect(() => fromPayPalValue("abc")).toThrow();
  });
});
