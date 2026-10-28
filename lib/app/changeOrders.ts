import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { logEvent } from "@/lib/domain/events";
import { formatUSD } from "@/lib/domain/money";
import { priceItems, type PricingInput } from "@/lib/domain/pricing";
import { addDays, applyChangeOrder } from "@/lib/domain/schedule";
import { newId } from "@/lib/ids";
import { AppError } from "./http";
import { issueInvoice } from "./invoicing";
import { loadRateCard, loadTasks } from "./project";

/** The milestone new work attaches to: the first one that isn't fully paid out and has tasks. */
function currentMilestone(projectId: string) {
  const ms = getDb()
    .select()
    .from(schema.milestones)
    .where(eq(schema.milestones.projectId, projectId))
    .orderBy(asc(schema.milestones.seq))
    .all();
  return ms.find((m) => m.status === "invoiced" || m.status === "planned") ?? ms[ms.length - 1];
}

/**
 * Approve edited scope items: price them in code, issue and send a PayPal invoice, then insert
 * the new (locked) tasks and shift the schedule. If PayPal fails nothing else changes.
 */
export async function createChangeOrder(input: { changeRequestId: string; items: PricingInput[] }) {
  const db = getDb();
  const cr = db.select().from(schema.changeRequests).where(eq(schema.changeRequests.id, input.changeRequestId)).get();
  if (!cr) throw new AppError(404, "NOT_FOUND", "Change request not found");
  const existing = db
    .select()
    .from(schema.changeOrders)
    .where(and(eq(schema.changeOrders.changeRequestId, cr.id)))
    .get();
  if (existing) throw new AppError(409, "ALREADY_INVOICED", "This change request was already turned into an invoice");

  const projectId = cr.projectId;
  const { lines, totalCents } = priceItems(input.items, loadRateCard(projectId));
  if (totalCents <= 0) throw new AppError(400, "EMPTY", "Add at least one item to invoice");

  const milestone = currentMilestone(projectId);
  const changeOrderId = newId("co");
  const invoiceId = newId("inv");
  const now = new Date().toISOString();
  const tasksBefore = loadTasks(projectId);
  const preview = applyChangeOrder(
    tasksBefore,
    milestone.id,
    lines.map((l) => ({ title: l.title, role: l.role, hours: l.hours })),
    { changeOrderId, newId: () => newId("t") },
  );

  db.insert(schema.invoices)
    .values({
      id: invoiceId,
      projectId,
      kind: "change_order",
      refId: changeOrderId,
      title: `Change order — ${lines.map((l) => l.title).join(", ")}`.slice(0, 120),
      status: "DRAFT",
      totalCents,
      currency: "USD",
      itemsJson: JSON.stringify(lines),
      note: `Change order for additional scope requested on ${now.slice(0, 10)}. Work starts once this invoice is paid.`,
      dueDate: addDays(now.slice(0, 10), 7),
      createdAt: now,
    })
    .run();

  let invoice;
  try {
    invoice = await issueInvoice(invoiceId);
  } catch (e) {
    db.delete(schema.invoices).where(eq(schema.invoices.id, invoiceId)).run();
    throw e;
  }

  db.transaction((tx) => {
    tx.insert(schema.changeOrders)
      .values({
        id: changeOrderId,
        projectId,
        changeRequestId: cr.id,
        milestoneId: milestone.id,
        itemsJson: JSON.stringify(lines),
        totalCents,
        status: "invoiced",
        createdAt: now,
      })
      .run();
    for (const s of preview.tasks) {
      const before = tasksBefore.find((t) => t.id === s.id);
      if (before && (before.startDate !== s.startDate || before.dependsOn !== s.dependsOn)) {
        tx.update(schema.tasks).set({ startDate: s.startDate, dependsOn: s.dependsOn }).where(eq(schema.tasks.id, s.id)).run();
      }
    }
    for (const t of preview.added) {
      tx.insert(schema.tasks)
        .values({
          id: t.id,
          projectId,
          milestoneId: t.milestoneId,
          title: t.title,
          role: t.role,
          startDate: t.startDate,
          durationDays: t.durationDays,
          dependsOn: t.dependsOn,
          source: "change_order",
          changeOrderId,
          sortOrder: 0,
        })
        .run();
    }
    // Display order: new tasks go right after the last existing task of their milestone.
    const lastIdx = tasksBefore.reduce((idx, t, i) => (t.milestoneId === milestone.id ? i : idx), -1);
    const order = [
      ...tasksBefore.slice(0, lastIdx + 1).map((t) => t.id),
      ...preview.added.map((t) => t.id),
      ...tasksBefore.slice(lastIdx + 1).map((t) => t.id),
    ];
    order.forEach((id, i) => {
      tx.update(schema.tasks).set({ sortOrder: i }).where(eq(schema.tasks.id, id)).run();
    });
  });

  logEvent(
    projectId,
    "change_order",
    `Change order ${invoice.invoiceNumber} for ${formatUSD(totalCents)}: ${lines.length} item(s), +${preview.addedDays} day(s). New tasks locked until paid.`,
    { paypalRef: invoice.paypalInvoiceId, level: "warning" },
  );

  return {
    changeOrderId,
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      paypalInvoiceId: invoice.paypalInvoiceId,
      status: invoice.status,
      totalCents,
      payerViewUrl: invoice.payerViewUrl,
    },
    tasksAdded: preview.added.length,
    addedDays: preview.addedDays,
  };
}
