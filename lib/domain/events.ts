import "server-only";
import { getDb, schema } from "@/lib/db/client";

export type EventLevel = "info" | "success" | "warning" | "danger";

/** Append to the activity log that feeds the activity drawer. */
export function logEvent(
  projectId: string,
  type: string,
  message: string,
  opts: { paypalRef?: string | null; level?: EventLevel } = {},
): void {
  getDb()
    .insert(schema.events)
    .values({
      projectId,
      type,
      message,
      paypalRef: opts.paypalRef ?? null,
      level: opts.level ?? "info",
      createdAt: new Date().toISOString(),
    })
    .run();
}
