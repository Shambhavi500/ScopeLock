import "server-only";
import { toPayPalValue } from "@/lib/domain/money";
import { paypalFetch } from "./request";

export interface PayoutItemInput {
  receiver: string;
  amountCents: number;
  note: string;
  senderItemId: string;
}

export async function createPayoutBatch(input: {
  senderBatchId: string;
  subject: string;
  message: string;
  items: PayoutItemInput[];
  currency?: string;
}): Promise<{ batchId: string; status: string; raw: unknown }> {
  const currency = input.currency ?? "USD";
  const { data } = await paypalFetch<{ batch_header: { payout_batch_id: string; batch_status: string } }>(
    "/v1/payments/payouts",
    {
      method: "POST",
      requestId: `payout-${input.senderBatchId}`,
      body: {
        sender_batch_header: {
          sender_batch_id: input.senderBatchId,
          email_subject: input.subject,
          email_message: input.message,
        },
        items: input.items.map((i) => ({
          recipient_type: "EMAIL",
          receiver: i.receiver,
          amount: { value: toPayPalValue(i.amountCents), currency },
          note: i.note,
          sender_item_id: i.senderItemId,
        })),
      },
    },
  );
  return {
    batchId: data.batch_header.payout_batch_id,
    status: data.batch_header.batch_status,
    raw: data,
  };
}

export interface PayoutBatchStatus {
  status: string;
  items: { payoutItemId: string; senderItemId: string; status: string; transactionId: string | null }[];
  raw: unknown;
}

export async function getPayoutBatch(batchId: string): Promise<PayoutBatchStatus> {
  const { data } = await paypalFetch<{
    batch_header: { batch_status: string };
    items?: {
      payout_item_id: string;
      transaction_status: string;
      transaction_id?: string;
      payout_item: { sender_item_id: string };
    }[];
  }>(`/v1/payments/payouts/${batchId}`);
  return {
    status: data.batch_header.batch_status,
    items: (data.items ?? []).map((i) => ({
      payoutItemId: i.payout_item_id,
      senderItemId: i.payout_item.sender_item_id,
      status: i.transaction_status,
      transactionId: i.transaction_id ?? null,
    })),
    raw: data,
  };
}
