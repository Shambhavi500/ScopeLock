import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { aiEnabled, providerLabel } from "@/lib/ai/provider";
import type {
  EventDTO,
  InvoiceDTO,
  LedgerRow,
  LedgerStatus,
  PayoutBatchDTO,
  ProjectState,
  TaskDTO,
} from "@/lib/api-types";
import { getDb, schema } from "@/lib/db/client";
import { lockedTasks } from "@/lib/domain/gating";
import type { InvoiceLite, MilestoneLite, RateCard, Role, TaskLite } from "@/lib/domain/types";
import { env } from "@/lib/env";

export class NotFoundError extends Error {}

export function loadTasks(projectId: string): TaskLite[] {
  return getDb()
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.projectId, projectId))
    .orderBy(asc(schema.tasks.sortOrder))
    .all()
    .map((t) => ({
      id: t.id,
      milestoneId: t.milestoneId,
      title: t.title,
      role: t.role as Role,
      startDate: t.startDate,
      durationDays: t.durationDays,
      dependsOn: t.dependsOn,
      source: t.source as TaskLite["source"],
      changeOrderId: t.changeOrderId,
    }));
}

export function loadRateCard(projectId: string): RateCard {
  const rows = getDb().select().from(schema.rateCard).where(eq(schema.rateCard.projectId, projectId)).all();
  return Object.fromEntries(rows.map((r) => [r.role, r.rateCentsPerHour])) as RateCard;
}

function invoiceStatusToLedger(status: string): LedgerStatus {
  if (status === "PAID") return "paid";
  if (status === "SENT") return "awaiting";
  return "draft";
}

function payoutStatusToLedger(status: string): LedgerStatus {
  if (status === "SUCCESS") return "sent";
  if (["FAILED", "DENIED", "RETURNED", "BLOCKED", "REFUNDED", "REVERSED", "CANCELED"].includes(status)) return "failed";
  return "processing";
}

export function getProjectState(projectId: string): ProjectState {
  const db = getDb();
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, projectId)).get();
  if (!project) throw new NotFoundError(`Project ${projectId} not found`);

  const contractors = db.select().from(schema.contractors).where(eq(schema.contractors.projectId, projectId)).all();
  const contractorName = new Map(contractors.map((c) => [c.id, c.name]));
  const milestones = db
    .select()
    .from(schema.milestones)
    .where(eq(schema.milestones.projectId, projectId))
    .orderBy(asc(schema.milestones.seq))
    .all();
  const invoiceRows = db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.projectId, projectId))
    .orderBy(asc(schema.invoices.createdAt))
    .all();
  const invoiceIds = invoiceRows.map((i) => i.id);
  const paymentRows = invoiceIds.length
    ? db.select().from(schema.payments).where(inArray(schema.payments.invoiceId, invoiceIds)).orderBy(asc(schema.payments.createdAt)).all()
    : [];
  const batchRows = invoiceIds.length
    ? db.select().from(schema.payoutBatches).where(inArray(schema.payoutBatches.invoiceId, invoiceIds)).all()
    : [];
  const itemRows = batchRows.length
    ? db.select().from(schema.payoutItems).where(inArray(schema.payoutItems.batchId, batchRows.map((b) => b.id))).all()
    : [];
  const eventRows = db
    .select()
    .from(schema.events)
    .where(eq(schema.events.projectId, projectId))
    .orderBy(desc(schema.events.createdAt), desc(schema.events.id))
    .limit(100)
    .all();

  const tasks = loadTasks(projectId);
  const msLite: MilestoneLite[] = milestones.map((m) => ({
    id: m.id,
    seq: m.seq,
    title: m.title,
    status: m.status as MilestoneLite["status"],
    amountCents: m.amountCents,
    invoiceId: m.invoiceId,
  }));
  const invLite: InvoiceLite[] = invoiceRows.map((i) => ({
    id: i.id,
    kind: i.kind as InvoiceLite["kind"],
    refId: i.refId,
    invoiceNumber: i.invoiceNumber,
    status: i.status as InvoiceLite["status"],
    totalCents: i.totalCents,
  }));
  const locks = lockedTasks(msLite, invLite, tasks);

  const taskDTOs: TaskDTO[] = tasks.map((t) => {
    const l = locks.get(t.id);
    return {
      ...t,
      locked: !!l,
      lockReason: l?.reason ?? null,
      lockInvoiceNumber: l?.invoiceNumber ?? null,
      lockAmountCents: l?.amountCents ?? null,
    };
  });

  const payoutBatches: PayoutBatchDTO[] = batchRows.map((b) => ({
    id: b.id,
    invoiceId: b.invoiceId,
    paypalBatchId: b.paypalBatchId,
    status: b.status,
    marginCents: b.marginCents,
    createdAt: b.createdAt,
    items: itemRows
      .filter((i) => i.batchId === b.id)
      .map((i) => ({
        id: i.id,
        contractorId: i.contractorId,
        contractorName: contractorName.get(i.contractorId) ?? i.contractorId,
        amountCents: i.amountCents,
        paypalItemId: i.paypalItemId,
        status: i.status,
      })),
  }));

  const invoices: InvoiceDTO[] = invoiceRows.map((i) => ({
    id: i.id,
    kind: i.kind as InvoiceDTO["kind"],
    refId: i.refId,
    title: i.title,
    paypalInvoiceId: i.paypalInvoiceId,
    invoiceNumber: i.invoiceNumber,
    status: i.status as InvoiceDTO["status"],
    totalCents: i.totalCents,
    currency: i.currency,
    items: JSON.parse(i.itemsJson),
    note: i.note,
    dueDate: i.dueDate,
    payerViewUrl: i.payerViewUrl,
    seeded: i.seeded,
    createdAt: i.createdAt,
    paidAt: i.paidAt,
    payments: paymentRows
      .filter((p) => p.invoiceId === i.id)
      .map((p) => ({
        id: p.id,
        paypalOrderId: p.paypalOrderId,
        paypalCaptureId: p.paypalCaptureId,
        status: p.status,
        amountCents: p.amountCents,
        failureCode: p.failureCode,
        attempt: p.attempt,
        createdAt: p.createdAt,
      })),
    payoutBatchId: batchRows.find((b) => b.invoiceId === i.id)?.id ?? null,
  }));

  const ledger: LedgerRow[] = [];
  for (const inv of invoices) {
    ledger.push({
      id: `invoice-${inv.id}`,
      date: inv.createdAt,
      kind: "invoice",
      reference: inv.paypalInvoiceId ?? inv.invoiceNumber,
      description: `${inv.title}${inv.invoiceNumber ? ` · #${inv.invoiceNumber}` : ""}`,
      counterparty: project.clientName,
      amountCents: inv.totalCents,
      status: invoiceStatusToLedger(inv.status),
      seeded: inv.seeded,
    });
    for (const p of inv.payments) {
      if (p.status === "CREATED") continue;
      ledger.push({
        id: `payment-${p.id}`,
        date: p.createdAt,
        kind: "payment",
        reference: p.paypalCaptureId ?? p.paypalOrderId,
        description: `Payment for ${inv.title}${p.failureCode ? ` · ${p.failureCode}` : ""}`,
        counterparty: project.clientName,
        amountCents: p.amountCents,
        status: p.status === "COMPLETED" ? "paid" : p.status === "DECLINED" ? "declined" : p.status === "FAILED" ? "failed" : "processing",
        seeded: inv.seeded,
      });
    }
  }
  for (const b of payoutBatches) {
    const inv = invoices.find((i) => i.id === b.invoiceId);
    for (const item of b.items) {
      ledger.push({
        id: `payout-${item.id}`,
        date: b.createdAt,
        kind: "payout",
        reference: item.paypalItemId ?? b.paypalBatchId,
        description: `Payout for ${inv?.title ?? "invoice"}`,
        counterparty: item.contractorName,
        amountCents: -item.amountCents,
        status: payoutStatusToLedger(item.status),
        seeded: inv?.seeded ?? false,
      });
    }
  }
  ledger.sort((a, b) => b.date.localeCompare(a.date));

  const events: EventDTO[] = eventRows.map((e) => ({
    id: e.id,
    type: e.type,
    level: e.level as EventDTO["level"],
    message: e.message,
    paypalRef: e.paypalRef,
    createdAt: e.createdAt,
  }));

  return {
    project: {
      id: project.id,
      name: project.name,
      clientName: project.clientName,
      clientEmail: project.clientEmail,
      currency: project.currency,
      agencyMarginBps: project.agencyMarginBps,
    },
    rateCard: loadRateCard(projectId),
    contractors: contractors.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role as Role,
      title: c.title,
      payoutEmail: c.payoutEmail,
      splitBps: c.splitBps,
    })),
    milestones: msLite,
    tasks: taskDTOs,
    invoices,
    payoutBatches,
    events,
    ledger,
    config: {
      paypalMode: env.paypalMode,
      aiProvider: providerLabel,
      aiEnabled,
      buyerEmail: env.DEMO_BUYER_EMAIL ?? null,
      buyerPassword: env.DEMO_BUYER_PASSWORD ?? null,
      payoutCapCents: env.PAYOUT_CAP_CENTS,
    },
  };
}

export function originalScopeSummary(projectId: string): string {
  const db = getDb();
  const ms = db.select().from(schema.milestones).where(eq(schema.milestones.projectId, projectId)).orderBy(asc(schema.milestones.seq)).all();
  const tasks = loadTasks(projectId);
  return ms
    .map((m) => `- ${m.title}: ${tasks.filter((t) => t.milestoneId === m.id).map((t) => t.title).join(", ")}`)
    .join("\n");
}
