export const ROLES = ["design", "dev", "qa", "pm"] as const;
export type Role = (typeof ROLES)[number];

export type RateCard = Record<Role, number>; // cents per hour

export type MilestoneStatus = "planned" | "invoiced" | "paid" | "paid_out";
export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "CANCELLED";
export type InvoiceKind = "milestone" | "change_order";

export interface MilestoneLite {
  id: string;
  seq: number;
  title: string;
  status: MilestoneStatus;
  amountCents: number;
  invoiceId: string | null;
}

export interface InvoiceLite {
  id: string;
  kind: InvoiceKind;
  refId: string; // milestone id or change order id
  invoiceNumber: string | null;
  status: InvoiceStatus;
  totalCents: number;
}

export interface TaskLite {
  id: string;
  milestoneId: string;
  title: string;
  role: Role;
  startDate: string; // yyyy-mm-dd
  durationDays: number;
  dependsOn: string | null;
  source: "seed" | "change_order";
  changeOrderId: string | null;
}

export interface LineItem {
  title: string;
  description: string;
  role: Role;
  hours: number;
  rateCents: number;
  amountCents: number;
}
