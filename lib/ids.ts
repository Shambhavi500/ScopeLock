import { randomBytes } from "node:crypto";

/** Short random IDs. Random (not sequential) so PayPal idempotency keys never collide across re-seeds. */
export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

export const DEMO_PROJECT_ID = "demo";
