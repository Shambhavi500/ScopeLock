import "server-only";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env } from "@/lib/env";

/** Gemini through Google's OpenAI-compatible endpoint. No key → rule-based extractor. */
export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

export const aiEnabled = !!env.GEMINI_API_KEY;

export const llm = createOpenAICompatible({
  name: "llm",
  baseURL: GEMINI_BASE_URL,
  apiKey: env.GEMINI_API_KEY,
});

export const model = llm(env.GEMINI_MODEL);

/** Gemini 2.5 Flash thinks by default; "none" keeps extraction fast. */
export const providerOptions = { llm: { reasoningEffort: "none" } };

export const providerLabel = aiEnabled ? `Gemini · ${env.GEMINI_MODEL}` : "disabled";
