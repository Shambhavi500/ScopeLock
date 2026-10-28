import "server-only";
import { addDays } from "@/lib/domain/schedule";
import type { Role } from "@/lib/domain/types";
import { env } from "@/lib/env";
import { DEMO_PROJECT_ID, newId } from "@/lib/ids";
import type { Db } from "./client";
import { schema } from "./client";

const P = DEMO_PROJECT_ID;

/** Monday of the current week (UTC), as yyyy-mm-dd. */
function thisMonday(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - dow * 86_400_000).toISOString().slice(0, 10);
}

interface SeedTask {
  id: string;
  m: "m1" | "m2" | "m3";
  title: string;
  role: Role;
  offset: number; // days from the project start
  days: number;
  dep: string | null;
}

// Project start is three weeks before this Monday: Design is done, Build is under way.
const TASKS: SeedTask[] = [
  { id: "t1", m: "m1", title: "Discovery workshop", role: "pm", offset: 0, days: 2, dep: null },
  { id: "t2", m: "m1", title: "Wireframes", role: "design", offset: 2, days: 4, dep: "t1" },
  { id: "t3", m: "m1", title: "Visual design", role: "design", offset: 6, days: 5, dep: "t2" },
  { id: "t4", m: "m1", title: "Design sign-off", role: "pm", offset: 11, days: 1, dep: "t3" },
  { id: "t5", m: "m2", title: "Storefront frontend", role: "dev", offset: 12, days: 6, dep: "t4" },
  { id: "t6", m: "m2", title: "Catalog & inventory API", role: "dev", offset: 12, days: 5, dep: "t4" },
  { id: "t7", m: "m2", title: "Cart & checkout", role: "dev", offset: 18, days: 5, dep: "t5" },
  { id: "t8", m: "m2", title: "Order confirmation emails", role: "dev", offset: 23, days: 2, dep: "t7" },
  { id: "t9", m: "m3", title: "QA & accessibility pass", role: "qa", offset: 25, days: 3, dep: "t8" },
  { id: "t10", m: "m3", title: "Content load & SEO", role: "pm", offset: 25, days: 2, dep: "t8" },
  { id: "t11", m: "m3", title: "Go-live", role: "pm", offset: 28, days: 1, dep: "t9" },
  { id: "t12", m: "m3", title: "Post-launch support", role: "dev", offset: 29, days: 3, dep: "t11" },
];

/** Insert the demo project. M2's real PayPal invoice is issued separately (see boot.ts). */
export function seed(db: Db, now = new Date()): { m2InvoiceId: string } {
  const start = addDays(thisMonday(now), -21);
  const ts = now.toISOString();
  const emails = env.DEMO_CONTRACTOR_EMAILS;

  db.insert(schema.projects)
    .values({
      id: P,
      name: "Acme Bakery — e-commerce site",
      clientName: "Acme Bakery",
      clientEmail: env.DEMO_CLIENT_EMAIL,
      currency: "USD",
      agencyMarginBps: 2000,
    })
    .run();

  db.insert(schema.rateCard)
    .values([
      { projectId: P, role: "design", rateCentsPerHour: 8000 },
      { projectId: P, role: "dev", rateCentsPerHour: 9500 },
      { projectId: P, role: "qa", rateCentsPerHour: 6000 },
      { projectId: P, role: "pm", rateCentsPerHour: 7000 },
    ])
    .run();

  const contractors = [
    { id: "c_designer", name: "Dana Okafor", role: "design", title: "Designer", splitBps: 3000 },
    { id: "c_frontend", name: "Ravi Menon", role: "dev", title: "Frontend dev", splitBps: 3500 },
    { id: "c_backend", name: "Mei Lin", role: "dev", title: "Backend dev", splitBps: 3500 },
  ].map((c, i) => ({ ...c, projectId: P, payoutEmail: emails[i] ?? "" }));
  db.insert(schema.contractors).values(contractors).run();

  const m1Invoice = newId("inv");
  const m2Invoice = newId("inv");
  db.insert(schema.milestones)
    .values([
      { id: "m1", projectId: P, seq: 1, title: "Design", amountCents: 240000, status: "paid_out", invoiceId: m1Invoice },
      { id: "m2", projectId: P, seq: 2, title: "Build", amountCents: 680000, status: "invoiced", invoiceId: m2Invoice },
      { id: "m3", projectId: P, seq: 3, title: "Launch", amountCents: 160000, status: "planned", invoiceId: null },
    ])
    .run();

  db.insert(schema.tasks)
    .values(
      TASKS.map((t, i) => ({
        id: t.id,
        projectId: P,
        milestoneId: t.m,
        title: t.title,
        role: t.role,
        startDate: addDays(start, t.offset),
        durationDays: t.days,
        dependsOn: t.dep,
        source: "seed",
        changeOrderId: null,
        sortOrder: i,
      })),
    )
    .run();

  // M1: seeded history, clearly marked as such (no PayPal IDs).
  const m1Paid = new Date(`${addDays(start, 12)}T15:00:00Z`).toISOString();
  db.insert(schema.invoices)
    .values({
      id: m1Invoice,
      projectId: P,
      kind: "milestone",
      refId: "m1",
      title: "Milestone 1 — Design",
      paypalInvoiceId: null,
      invoiceNumber: "DEMO-0001",
      status: "PAID",
      totalCents: 240000,
      currency: "USD",
      itemsJson: JSON.stringify([
        { title: "Milestone 1 — Design", description: "Discovery, wireframes, visual design", role: "design", hours: 1, rateCents: 240000, amountCents: 240000 },
      ]),
      note: "Seeded history",
      dueDate: addDays(start, 14),
      seeded: true,
      createdAt: new Date(`${addDays(start, 11)}T10:00:00Z`).toISOString(),
      paidAt: m1Paid,
    })
    .run();
  db.insert(schema.payments)
    .values({
      id: newId("pay"),
      invoiceId: m1Invoice,
      paypalOrderId: "DEMO-ORDER-0001",
      paypalCaptureId: "DEMO-CAPTURE-0001",
      status: "COMPLETED",
      amountCents: 240000,
      currency: "USD",
      attempt: 1,
      createdAt: m1Paid,
    })
    .run();
  const batchId = newId("pb");
  db.insert(schema.payoutBatches)
    .values({
      id: batchId,
      invoiceId: m1Invoice,
      senderBatchId: "DEMO-BATCH-0001",
      paypalBatchId: "DEMO-BATCH-0001",
      status: "SUCCESS",
      marginCents: 48000,
      createdAt: new Date(`${addDays(start, 12)}T16:00:00Z`).toISOString(),
    })
    .run();
  db.insert(schema.payoutItems)
    .values([
      { id: newId("pi"), batchId, contractorId: "c_designer", amountCents: 57600, paypalItemId: "DEMO-ITEM-1", status: "SUCCESS" },
      { id: newId("pi"), batchId, contractorId: "c_frontend", amountCents: 67200, paypalItemId: "DEMO-ITEM-2", status: "SUCCESS" },
      { id: newId("pi"), batchId, contractorId: "c_backend", amountCents: 67200, paypalItemId: "DEMO-ITEM-3", status: "SUCCESS" },
    ])
    .run();

  // M2: the row exists now; boot.ts issues the real sandbox invoice for it.
  db.insert(schema.invoices)
    .values({
      id: m2Invoice,
      projectId: P,
      kind: "milestone",
      refId: "m2",
      title: "Milestone 2 — Build",
      status: "DRAFT",
      totalCents: 680000,
      currency: "USD",
      itemsJson: JSON.stringify([
        { title: "Milestone 2 — Build", description: "Storefront, catalog API, cart & checkout, order emails", role: "dev", hours: 1, rateCents: 680000, amountCents: 680000 },
      ]),
      note: "Milestone 2 of 3. Thank you for your business!",
      dueDate: addDays(thisMonday(now), 7),
      seeded: false,
      createdAt: ts,
    })
    .run();

  db.insert(schema.events)
    .values([
      { projectId: P, type: "seed", level: "info", message: "Milestone 1 (Design) invoice paid — seeded history", paypalRef: "DEMO-CAPTURE-0001", createdAt: m1Paid },
      { projectId: P, type: "seed", level: "success", message: "Milestone 1 paid out to 3 contractors — seeded history", paypalRef: "DEMO-BATCH-0001", createdAt: new Date(`${addDays(start, 12)}T16:00:00Z`).toISOString() },
      { projectId: P, type: "seed", level: "info", message: "Demo workspace seeded", paypalRef: null, createdAt: ts },
    ])
    .run();

  return { m2InvoiceId: m2Invoice };
}
