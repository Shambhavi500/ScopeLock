import { describe, expect, it } from "vitest";
import { lockedTaskIds, lockedTasks } from "@/lib/domain/gating";
import type { InvoiceLite, MilestoneLite, TaskLite } from "@/lib/domain/types";

const ms = (over: Partial<MilestoneLite>[] = []): MilestoneLite[] =>
  [
    { id: "m1", seq: 1, title: "Design", status: "paid_out", amountCents: 240000, invoiceId: "i1" },
    { id: "m2", seq: 2, title: "Build", status: "invoiced", amountCents: 680000, invoiceId: "i2" },
    { id: "m3", seq: 3, title: "Launch", status: "planned", amountCents: 160000, invoiceId: null },
  ].map((m, i) => ({ ...m, ...(over[i] ?? {}) }) as MilestoneLite);

const invoices: InvoiceLite[] = [
  { id: "i1", kind: "milestone", refId: "m1", invoiceNumber: "0001", status: "PAID", totalCents: 240000 },
  { id: "i2", kind: "milestone", refId: "m2", invoiceNumber: "0002", status: "SENT", totalCents: 680000 },
];

const task = (id: string, milestoneId: string, extra: Partial<TaskLite> = {}): TaskLite => ({
  id,
  milestoneId,
  title: id,
  role: "dev",
  startDate: "2026-11-02",
  durationDays: 1,
  dependsOn: null,
  source: "seed",
  changeOrderId: null,
  ...extra,
});

const tasks = [task("a", "m1"), task("b", "m2"), task("c", "m3")];

describe("gating", () => {
  it("locks phases behind an unpaid earlier milestone", () => {
    expect([...lockedTaskIds(ms(), invoices, tasks)]).toEqual(["c"]);
    const info = lockedTasks(ms(), invoices, tasks).get("c");
    expect(info?.invoiceNumber).toBe("0002");
  });

  it("unlocks once the earlier milestone is paid", () => {
    const paid = ms([{}, { status: "paid" }]);
    expect(lockedTaskIds(paid, invoices, tasks).size).toBe(0);
  });

  it("locks change-order tasks until their own invoice is paid", () => {
    const co = task("co1", "m2", { source: "change_order", changeOrderId: "co" });
    const coInvoice: InvoiceLite = {
      id: "i3",
      kind: "change_order",
      refId: "co",
      invoiceNumber: "0003",
      status: "SENT",
      totalCents: 170000,
    };
    expect(lockedTaskIds(ms(), [...invoices, coInvoice], [co]).has("co1")).toBe(true);
    expect(
      lockedTaskIds(ms(), [...invoices, { ...coInvoice, status: "PAID" }], [co]).has("co1"),
    ).toBe(false);
  });

  it("locks change-order tasks with no invoice at all", () => {
    const co = task("co1", "m2", { source: "change_order", changeOrderId: "missing" });
    expect(lockedTaskIds(ms(), invoices, [co]).has("co1")).toBe(true);
  });
});
