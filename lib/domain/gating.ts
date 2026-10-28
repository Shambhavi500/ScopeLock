import type { InvoiceLite, MilestoneLite, TaskLite } from "./types";

export interface LockInfo {
  invoiceId: string | null;
  invoiceNumber: string | null;
  amountCents: number;
  reason: string;
}

const cleared = (m: MilestoneLite) => m.status === "paid" || m.status === "paid_out";

/**
 * A task is locked when an earlier milestone hasn't been paid (the next phase waits for the
 * previous phase's invoice), or when it came from a change order whose invoice isn't PAID.
 */
export function lockedTasks(
  milestones: MilestoneLite[],
  invoices: InvoiceLite[],
  tasks: TaskLite[],
): Map<string, LockInfo> {
  const ordered = [...milestones].sort((a, b) => a.seq - b.seq);
  const invoiceById = new Map(invoices.map((i) => [i.id, i]));
  const coInvoice = new Map(
    invoices.filter((i) => i.kind === "change_order").map((i) => [i.refId, i]),
  );
  const locks = new Map<string, LockInfo>();

  for (const task of tasks) {
    const idx = ordered.findIndex((m) => m.id === task.milestoneId);
    const blocker = ordered.slice(0, Math.max(idx, 0)).find((m) => !cleared(m));
    if (blocker) {
      const inv = blocker.invoiceId ? invoiceById.get(blocker.invoiceId) : undefined;
      locks.set(task.id, {
        invoiceId: inv?.id ?? null,
        invoiceNumber: inv?.invoiceNumber ?? null,
        amountCents: inv?.totalCents ?? blocker.amountCents,
        reason: inv
          ? `${blocker.title} invoice isn't paid yet`
          : `${blocker.title} hasn't been invoiced yet`,
      });
      continue;
    }
    if (task.source === "change_order" && task.changeOrderId) {
      const inv = coInvoice.get(task.changeOrderId);
      if (!inv || inv.status !== "PAID") {
        locks.set(task.id, {
          invoiceId: inv?.id ?? null,
          invoiceNumber: inv?.invoiceNumber ?? null,
          amountCents: inv?.totalCents ?? 0,
          reason: "Change-order invoice isn't paid yet",
        });
      }
    }
  }
  return locks;
}

export function lockedTaskIds(
  milestones: MilestoneLite[],
  invoices: InvoiceLite[],
  tasks: TaskLite[],
): Set<string> {
  return new Set(lockedTasks(milestones, invoices, tasks).keys());
}
