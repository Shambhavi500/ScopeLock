import { z } from "zod";
import { extractScope } from "@/lib/ai/extract";
import { MAX_MESSAGE_CHARS } from "@/lib/ai/schema";
import type { ExtractResponse } from "@/lib/api-types";
import { parseBody, rateLimit } from "@/lib/app/http";
import { getProjectState, originalScopeSummary } from "@/lib/app/project";
import { route } from "@/lib/app/route";
import { getDb, schema } from "@/lib/db/client";
import { logEvent } from "@/lib/domain/events";
import { newId } from "@/lib/ids";

export const dynamic = "force-dynamic";

const Body = z.object({
  projectId: z.string().min(1),
  text: z.string().trim().min(3).max(MAX_MESSAGE_CHARS),
});

export const POST = route(async (req): Promise<ExtractResponse> => {
  rateLimit(req, "extract", 10, 60_000);
  const { projectId, text } = await parseBody(req, Body);
  getProjectState(projectId); // 404s on an unknown project

  const result = await extractScope(text, originalScopeSummary(projectId));
  const id = newId("cr");
  getDb()
    .insert(schema.changeRequests)
    .values({
      id,
      projectId,
      rawText: text,
      extractionJson: JSON.stringify(result.extraction),
      extractionSource: result.source,
      createdAt: new Date().toISOString(),
    })
    .run();
  logEvent(
    projectId,
    "ai_extraction",
    `Change request analyzed (${result.source}): ${result.extraction.items.length} item(s)${result.fallbackReason ? ` · ${result.fallbackReason}` : ""}`,
    { level: result.source === "ai" ? "info" : "warning" },
  );
  return { changeRequestId: id, ...result };
});
