import "server-only";
import { wipeDb } from "@/lib/db/client";
import { seed } from "@/lib/db/seed";
import { env } from "@/lib/env";
import { issueInvoice } from "./invoicing";

const g = globalThis as unknown as { __scopelockBoot?: Promise<void> };

/** migrate → wipe → seed → issue the M2 sandbox invoice. Every boot is a fresh demo. */
async function bootstrap(): Promise<void> {
  const db = wipeDb();
  const { m2InvoiceId } = seed(db);
  try {
    await issueInvoice(m2InvoiceId);
  } catch {
    // Logged as an event; the cockpit offers a retry. The rest of the demo still works.
  }
  console.log(`[scopelock] demo seeded (PayPal: ${env.paypalMode})`);
}

export function ensureBooted(): Promise<void> {
  g.__scopelockBoot ??= bootstrap().catch((e) => {
    g.__scopelockBoot = undefined;
    throw e;
  });
  return g.__scopelockBoot;
}

export async function resetDemo(): Promise<void> {
  await g.__scopelockBoot?.catch(() => undefined);
  g.__scopelockBoot = bootstrap();
  await g.__scopelockBoot;
}
