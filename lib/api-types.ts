/** JSON shapes shared by the API routes and the browser. No server imports here. */
import type { Extraction, ExtractionSource } from "@/lib/ai/schema";
import type { Check } from "@/lib/domain/checks";
import type { LineItem, MilestoneStatus, RateCard, Role, TaskLite } from "@/lib/domain/types";

export interface ProjectDTO {
  id: string;
  name: string;
  clientName: string;
  clientEmail: string;
  currency: string;
  agencyMarginBps: number;
}

export interface ContractorDTO {
  id: string;
  name: string;
  role: Role;
  title: string;
  payoutEmail: string;
  splitBps: number;
}

export interface MilestoneDTO {
  id: string;
  seq: number;
  title: string;
  amountCents: number;
  status: MilestoneStatus;
  invoiceId: string | null;
}

export interface TaskDTO extends TaskLite {
  locked: boolean;
  lockReason: string | null;
  lockInvoiceNumber: string | null;
  lockAmountCents: number | null;
}

export interface PaymentDTO {
  id: string;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  status: string;
  amountCents: number;
  failureCode: string | null;
  attempt: number;
  createdAt: string;
}

export interface InvoiceDTO {
  id: string;
  kind: "milestone" | "change_order";
  refId: string;
  title: string;
  paypalInvoiceId: string | null;
  invoiceNumber: string | null;
  status: "DRAFT" | "SENT" | "PAID" | "CANCELLED";
  totalCents: number;
  currency: string;
  items: LineItem[];
  note: string | null;
  dueDate: string | null;
  payerViewUrl: string | null;
  seeded: boolean;
  createdAt: string;
  paidAt: string | null;
  payments: PaymentDTO[];
  payoutBatchId: string | null;
}

export interface PayoutItemDTO {
  id: string;
  contractorId: string;
  contractorName: string;
  amountCents: number;
  paypalItemId: string | null;
  status: string;
}

export interface PayoutBatchDTO {
  id: string;
  invoiceId: string;
  paypalBatchId: string | null;
  status: string;
  marginCents: number;
  createdAt: string;
  items: PayoutItemDTO[];
}

export interface EventDTO {
  id: number;
  type: string;
  level: "info" | "success" | "warning" | "danger";
  message: string;
  paypalRef: string | null;
  createdAt: string;
}

export type LedgerStatus = "draft" | "awaiting" | "paid" | "declined" | "processing" | "sent" | "failed";

export interface LedgerRow {
  id: string;
  date: string;
  kind: "invoice" | "payment" | "payout";
  reference: string | null;
  description: string;
  counterparty: string;
  amountCents: number; // payouts are negative (money out)
  status: LedgerStatus;
  seeded: boolean;
}

export interface ProjectState {
  project: ProjectDTO;
  rateCard: RateCard;
  contractors: ContractorDTO[];
  milestones: MilestoneDTO[];
  tasks: TaskDTO[];
  invoices: InvoiceDTO[];
  payoutBatches: PayoutBatchDTO[];
  events: EventDTO[];
  ledger: LedgerRow[];
  config: {
    paypalMode: "sandbox" | "simulated";
    aiProvider: string;
    aiEnabled: boolean;
    buyerEmail: string | null;
    buyerPassword: string | null;
    payoutCapCents: number;
  };
}

export interface ExtractResponse {
  changeRequestId: string;
  extraction: Extraction;
  source: ExtractionSource;
  fallbackReason: string | null;
}

export interface PayoutPreviewResponse {
  invoiceId: string;
  capturedCents: number | null;
  split: { contractorId: string; name: string; title: string; email: string; splitBps: number; amountCents: number }[];
  marginCents: number;
  marginBps: number;
  checks: Check[];
  canPay: boolean;
  batch: PayoutBatchDTO | null;
}

export interface ApiError {
  error: string;
  code: string;
  debugId?: string | null;
  recoverable?: boolean;
  details?: unknown;
}
