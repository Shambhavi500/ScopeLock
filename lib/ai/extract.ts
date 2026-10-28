import "server-only";
import { generateText } from "ai";
import { fallbackExtract } from "./fallback";
import { parseExtraction, stripFences, extractJsonObject } from "./parse";
import { EXTRACTION_SYSTEM, extractionPrompt } from "./prompts";
import { aiEnabled, model, providerOptions } from "./provider";
import type { Extraction, ExtractionSource } from "./schema";

export interface ExtractResult {
  extraction: Extraction;
  source: ExtractionSource;
  /** Why the fallback ran, when it did. Shown in the UI. */
  fallbackReason: string | null;
}

const TIMEOUT_MS = 15_000;

async function callModel(system: string, prompt: string): Promise<string> {
  const { text } = await generateText({
    model,
    system,
    prompt,
    temperature: 0.2,
    providerOptions,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return text;
}

/**
 * Gemini → strip code fences → Zod → drop hallucinated quotes. On invalid output, retry once with the
 * error appended. On a second failure, timeout or provider error, use the rule-based extractor.
 */
export async function extractScope(text: string, originalScope: string): Promise<ExtractResult> {
  if (!aiEnabled) {
    return { ...fallbackExtract(text), fallbackReason: "AI provider not configured" };
  }
  const prompt = extractionPrompt(originalScope, text);
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: string;
    try {
      raw = await callModel(
        EXTRACTION_SYSTEM,
        attempt === 0
          ? prompt
          : `${prompt}\n\nYour previous answer was invalid: ${lastError}. Return corrected JSON only.`,
      );
    } catch (e) {
      // Network error, timeout, 429: don't retry, fall back straight away.
      const reason = e instanceof Error ? e.message : String(e);
      return { ...fallbackExtract(text), fallbackReason: `AI unavailable: ${reason.slice(0, 160)}` };
    }
    try {
      const extraction = parseExtraction(raw, text);
      if (extraction.items.length === 0 && extraction.isScopeChange) {
        throw new Error("No items with a sourceQuote copied exactly from the client message");
      }
      return { extraction, source: "ai", fallbackReason: null };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  return { ...fallbackExtract(text), fallbackReason: `AI output invalid twice: ${lastError.slice(0, 160)}` };
}

/** Small helper for the P1 features: model text → JSON object, or null on any failure. */
export async function generateJson(system: string, prompt: string): Promise<unknown | null> {
  if (!aiEnabled) return null;
  try {
    const raw = await callModel(system, prompt);
    return extractJsonObject(stripFences(raw));
  } catch {
    return null;
  }
}
