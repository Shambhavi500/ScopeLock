import { describe, expect, it } from "vitest";
import { priceItems, roundHours } from "@/lib/domain/pricing";
import type { RateCard } from "@/lib/domain/types";

const rates: RateCard = { design: 8000, dev: 9500, qa: 6000, pm: 7000 };

describe("pricing", () => {
  it("rounds hours to the nearest half, min 0.5", () => {
    expect(roundHours(2.24)).toBe(2);
    expect(roundHours(2.25)).toBe(2.5);
    expect(roundHours(0.1)).toBe(0.5);
    expect(roundHours(Number.NaN)).toBe(0.5);
  });

  it("prices items from the rate card", () => {
    const { lines, totalCents } = priceItems(
      [
        { title: "Gift-card page", role: "dev", hours: 10 },
        { title: "Allergen filter", role: "dev", hours: 6 },
        { title: "QA", role: "qa", hours: 3 },
      ],
      rates,
    );
    expect(lines.map((l) => l.amountCents)).toEqual([95000, 57000, 18000]);
    expect(totalCents).toBe(170000);
  });

  it("handles half hours exactly", () => {
    const { lines } = priceItems([{ title: "Tweak", role: "dev", hours: 2.5 }], {
      ...rates,
      dev: 9999,
    });
    expect(lines[0].amountCents).toBe(24998); // 2.5 × $99.99 = $249.975 → rounded
  });
});
