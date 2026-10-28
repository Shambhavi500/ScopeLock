import { z } from "zod";
import { ROLES } from "@/lib/domain/types";

export const ScopeItem = z.object({
  title: z.string().min(3).max(80),
  description: z.string().max(300),
  role: z.enum(ROLES),
  estimatedHours: z.number().min(0.5).max(80),
  inOriginalScope: z.boolean(),
  confidence: z.number().min(0).max(1),
  sourceQuote: z.string().max(200), // must be a substring of the input
});
export type ScopeItem = z.infer<typeof ScopeItem>;

export const Extraction = z.object({
  isScopeChange: z.boolean(),
  summary: z.string().max(300),
  items: z.array(ScopeItem).max(10),
  requestedDeadline: z.string().nullable(), // ISO date or null
  clarifyingQuestions: z.array(z.string().max(300)).max(5),
});
export type Extraction = z.infer<typeof Extraction>;

export type ExtractionSource = "ai" | "fallback" | "cache";

export const MAX_MESSAGE_CHARS = 4000;
