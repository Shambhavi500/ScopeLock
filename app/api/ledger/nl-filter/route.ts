import { z } from "zod";
import { generateJson } from "@/lib/ai/extract";
import { LedgerFilter, ruleBasedFilter } from "@/lib/ai/nlFilter";
import { NL_FILTER_SYSTEM } from "@/lib/ai/prompts";
import { parseBody, rateLimit } from "@/lib/app/http";
import { route } from "@/lib/app/route";

export const dynamic = "force-dynamic";

const Body = z.object({ q: z.string().trim().min(2).max(200) });

/** P1 (FR-29): question → validated filter subset. The model output never reaches the grid as-is. */
export const POST = route(async (req) => {
  rateLimit(req, "nl-filter", 20, 60_000);
  const { q } = await parseBody(req, Body);
  const parsed = LedgerFilter.safeParse(await generateJson(NL_FILTER_SYSTEM, `Question: ${q}`));
  if (parsed.success && Object.keys(parsed.data).length > 0) return { filter: parsed.data, source: "ai" };
  return { filter: ruleBasedFilter(q), source: "fallback" };
});
