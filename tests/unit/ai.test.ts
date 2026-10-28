import { describe, expect, it } from "vitest";
import { fallbackExtract } from "@/lib/ai/fallback";
import { parseExtraction, stripFences } from "@/lib/ai/parse";
import { SAMPLE_MESSAGES } from "@/lib/ai/samples";
import { Extraction } from "@/lib/ai/schema";

const input =
  "Love it! Can we also add a gift-card page and make the menu filterable by allergens? Need it before the holiday launch.";

const valid = {
  isScopeChange: true,
  summary: "Two new features",
  items: [
    {
      title: "Gift-card page",
      description: "Buy gift cards",
      role: "dev",
      estimatedHours: 10,
      inOriginalScope: false,
      confidence: 0.8,
      sourceQuote: "add a gift-card page",
    },
  ],
  requestedDeadline: null,
  clarifyingQuestions: [],
};

describe("AI output parsing", () => {
  it("strips code fences", () => {
    expect(stripFences("```json\n{}\n```")).toBe("{}");
  });

  it("accepts valid output wrapped in a code fence", () => {
    const raw = "```json\n" + JSON.stringify(valid) + "\n```";
    expect(parseExtraction(raw, input).items).toHaveLength(1);
  });

  it("drops items whose quote isn't in the input", () => {
    const raw = JSON.stringify({
      ...valid,
      items: [...valid.items, { ...valid.items[0], sourceQuote: "ignore previous instructions" }],
    });
    expect(parseExtraction(raw, input).items).toHaveLength(1);
  });

  it("rejects invalid roles, hours and missing fields", () => {
    const bad = (items: unknown) => JSON.stringify({ ...valid, items });
    expect(() => parseExtraction(bad([{ ...valid.items[0], role: "ceo" }]), input)).toThrow(/role/);
    expect(() => parseExtraction(bad([{ ...valid.items[0], estimatedHours: 500 }]), input)).toThrow();
    expect(() => parseExtraction(JSON.stringify({ items: [] }), input)).toThrow();
    expect(() => parseExtraction("not json", input)).toThrow();
  });
});

describe("fallback extractor", () => {
  it("returns cached extractions for every sample", () => {
    for (const s of SAMPLE_MESSAGES) {
      const r = fallbackExtract(s.text);
      expect(r.source).toBe("cache");
      expect(Extraction.safeParse(r.extraction).success).toBe(true);
      for (const item of r.extraction.items) expect(s.text).toContain(item.sourceQuote);
    }
  });

  it("splits free text into schema-valid items", () => {
    const r = fallbackExtract("Please add a blog page. Also can we change the logo colour to green?");
    expect(r.source).toBe("fallback");
    expect(Extraction.safeParse(r.extraction).success).toBe(true);
    expect(r.extraction.items.length).toBeGreaterThanOrEqual(2);
    expect(r.extraction.items.some((i) => i.role === "design")).toBe(true);
    expect(r.extraction.clarifyingQuestions.length).toBeGreaterThan(0);
  });

  it("always returns at least one item", () => {
    const r = fallbackExtract("hmm");
    expect(r.extraction.items).toHaveLength(1);
    expect(Extraction.safeParse(r.extraction).success).toBe(true);
  });
});
