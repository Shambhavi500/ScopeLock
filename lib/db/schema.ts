import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// All money is integer cents with a currency column.

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  currency: text("currency").notNull().default("USD"),
  agencyMarginBps: integer("agency_margin_bps").notNull(),
});

export const rateCard = sqliteTable(
  "rate_card",
  {
    projectId: text("project_id").notNull(),
    role: text("role").notNull(),
    rateCentsPerHour: integer("rate_cents_per_hour").notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.role] })],
);

export const contractors = sqliteTable("contractors", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  title: text("title").notNull(),
  payoutEmail: text("payout_email").notNull(),
  splitBps: integer("split_bps").notNull(),
});

export const milestones = sqliteTable("milestones", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  seq: integer("seq").notNull(),
  title: text("title").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull(), // planned | invoiced | paid | paid_out
  invoiceId: text("invoice_id"),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  milestoneId: text("milestone_id").notNull(),
  title: text("title").notNull(),
  role: text("role").notNull(),
  startDate: text("start_date").notNull(),
  durationDays: integer("duration_days").notNull(),
  dependsOn: text("depends_on"),
  source: text("source").notNull(), // seed | change_order
  changeOrderId: text("change_order_id"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const changeRequests = sqliteTable("change_requests", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  rawText: text("raw_text").notNull(),
  extractionJson: text("extraction_json").notNull(),
  extractionSource: text("extraction_source").notNull(), // ai | fallback | cache
  createdAt: text("created_at").notNull(),
});

export const changeOrders = sqliteTable("change_orders", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  changeRequestId: text("change_request_id").notNull(),
  milestoneId: text("milestone_id").notNull(),
  itemsJson: text("items_json").notNull(),
  totalCents: integer("total_cents").notNull(),
  status: text("status").notNull(), // draft | invoiced | paid | paid_out
  createdAt: text("created_at").notNull(),
});

export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  kind: text("kind").notNull(), // milestone | change_order
  refId: text("ref_id").notNull(),
  title: text("title").notNull(),
  paypalInvoiceId: text("paypal_invoice_id"),
  invoiceNumber: text("invoice_number"),
  status: text("status").notNull(), // DRAFT | SENT | PAID | CANCELLED
  totalCents: integer("total_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  itemsJson: text("items_json").notNull(),
  note: text("note"),
  dueDate: text("due_date"),
  payerViewUrl: text("payer_view_url"),
  seeded: integer("seeded", { mode: "boolean" }).notNull().default(false),
  rawJson: text("raw_json"),
  createdAt: text("created_at").notNull(),
  paidAt: text("paid_at"),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull(),
  paypalOrderId: text("paypal_order_id"),
  paypalCaptureId: text("paypal_capture_id"),
  status: text("status").notNull(), // CREATED | COMPLETED | DECLINED | FAILED
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  failureCode: text("failure_code"),
  attempt: integer("attempt").notNull(),
  rawJson: text("raw_json"),
  createdAt: text("created_at").notNull(),
});

export const payoutBatches = sqliteTable("payout_batches", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().unique(),
  senderBatchId: text("sender_batch_id").notNull(),
  paypalBatchId: text("paypal_batch_id"),
  status: text("status").notNull(),
  marginCents: integer("margin_cents").notNull(),
  rawJson: text("raw_json"),
  createdAt: text("created_at").notNull(),
});

export const payoutItems = sqliteTable("payout_items", {
  id: text("id").primaryKey(),
  batchId: text("batch_id").notNull(),
  contractorId: text("contractor_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  paypalItemId: text("paypal_item_id"),
  status: text("status").notNull(),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  type: text("type").notNull(),
  level: text("level").notNull().default("info"), // info | success | warning | danger
  message: text("message").notNull(),
  paypalRef: text("paypal_ref"),
  createdAt: text("created_at").notNull(),
});
