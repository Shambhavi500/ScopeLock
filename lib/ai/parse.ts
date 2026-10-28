import { Extraction } from "./schema";

/** Remove the Markdown code fences Gemini sometimes wraps JSON in. */
export function stripFences(raw: string): string {
  return raw.replace(/```(?:json)?/gi, "").trim();
}

/** Grab the outermost JSON object from model text. */
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in model output");
  return JSON.parse(text.slice(start, end + 1));
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Parse and validate model output. Items whose sourceQuote isn't in the client's message are
 * dropped as hallucinations. Throws with a readable message when the output is invalid.
 */
export function parseExtraction(raw: string, input: string): Extraction {
  const json = extractJsonObject(stripFences(raw));
  const result = Extraction.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Schema validation failed: ${issues}`);
  }
  const haystack = norm(input);
  return {
    ...result.data,
    items: result.data.items.filter(
      (item) => item.sourceQuote.trim().length > 0 && haystack.includes(norm(item.sourceQuote)),
    ),
  };
}
