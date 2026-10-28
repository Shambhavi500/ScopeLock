import type { Role } from "@/lib/domain/types";
import { findSample } from "./samples";
import type { Extraction, ExtractionSource } from "./schema";

// Split on sentence ends, and just before the phrases clients use to tack on another request.
const SPLIT = /(?<=[.!?])\s+|\s+(?=(?:and also|can we|could you|please add)\b)/i;
const REQUEST_HINT =
  /\b(add|make|change|update|need|want|include|create|build|remove|fix|improve|redesign|support|allow|show|integrate|filter)\b/i;
const LEAD_IN = /^(and|also|so|but|then|maybe|just|please|can you|could you|can we|we'd like to|i'd like to|let's)\b[\s,]*/i;

const ROLE_KEYWORDS: [Role, RegExp][] = [
  ["qa", /\b(test|testing|qa|bug|broken|check)\b/i],
  ["design", /\b(design|logo|colou?r|font|brand|on-brand|style|look|mockup|illustration|photo)\b/i],
  ["pm", /\b(meeting|call|plan|schedule|report|content|copy)\b/i],
  ["dev", /\b(page|feature|filter|form|api|integrat|checkout|cart|login|search|button|box|code)\b/i],
];

function guessRole(clause: string): Role {
  return ROLE_KEYWORDS.find(([, re]) => re.test(clause))?.[0] ?? "dev";
}

function toTitle(clause: string): string {
  let t = clause.replace(/[?.!]+$/, "").trim();
  for (let i = 0; i < 4; i++) t = t.replace(LEAD_IN, "").trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (t.length > 80) t = `${t.slice(0, 77).trimEnd()}…`;
  return t.length >= 3 ? t : "Requested change";
}

/** Rule-based extractor used when the AI is offline, slow or returns invalid output. */
export function fallbackExtract(text: string): { extraction: Extraction; source: ExtractionSource } {
  const sample = findSample(text);
  if (sample) return { extraction: sample.cached, source: "cache" };

  const input = text.trim();
  const clauses = input
    .split(SPLIT)
    .map((c) => (c ?? "").trim().replace(/^[,;:\s]+|[,;:\s]+$/g, ""))
    .filter((c) => c.length >= 6 && REQUEST_HINT.test(c));

  const picked = (clauses.length ? clauses : [input.slice(0, 200)]).slice(0, 10);
  const items = picked.map((clause) => {
    const quote = clause.slice(0, 200);
    return {
      title: toTitle(clause),
      description: "Estimated by the rule-based extractor. Check hours before invoicing.",
      role: guessRole(clause),
      estimatedHours: 4,
      inOriginalScope: false,
      confidence: 0.3,
      sourceQuote: input.includes(quote) ? quote : "",
    };
  });

  return {
    source: "fallback",
    extraction: {
      isScopeChange: true,
      summary: `Rule-based reading of the request: ${items.length} possible item${items.length === 1 ? "" : "s"}.`,
      items,
      requestedDeadline: null,
      clarifyingQuestions: [
        "Can you confirm exactly what you'd like added, and by when?",
      ],
    },
  };
}
