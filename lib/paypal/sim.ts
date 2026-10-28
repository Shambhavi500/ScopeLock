import { randomBytes } from "node:crypto";

/**
 * In-memory stand-in for the PayPal sandbox REST endpoints ScopeLock uses. Active only when no
 * PAYPAL_CLIENT_ID/SECRET are configured, so the app can be developed and demoed offline. It
 * mirrors the response shapes, idempotency (PayPal-Request-Id replay), PayPal-Mock-Response
 * failures, duplicate invoice_id and sender_batch_id rejections, and payout batch progression.
 */

interface SimResult {
  status: number;
  body: unknown;
  debugId: string;
}

interface SimState {
  idempotency: Map<string, SimResult>;
  invoiceSeq: number;
  invoices: Map<string, Record<string, any>>;
  orders: Map<string, Record<string, any>>;
  capturedInvoiceIds: Set<string>;
  batches: Map<string, { createdAt: number; body: Record<string, any> }>;
  senderBatchIds: Set<string>;
}

const g = globalThis as unknown as { __paypalSim?: SimState };
const state = (): SimState =>
  (g.__paypalSim ??= {
    idempotency: new Map(),
    invoiceSeq: 1000,
    invoices: new Map(),
    orders: new Map(),
    capturedInvoiceIds: new Set(),
    batches: new Map(),
    senderBatchIds: new Set(),
  });

const rid = (n = 8) => randomBytes(n).toString("hex").toUpperCase();
const debugId = () => `sim${randomBytes(6).toString("hex")}`;
const BASE = "https://api-m.sandbox.paypal.com";

const ok = (status: number, body: unknown): SimResult => ({ status, body, debugId: debugId() });
const fail = (status: number, name: string, message: string, issue?: string, description?: string) =>
  ok(status, {
    name,
    message,
    debug_id: debugId(),
    details: issue ? [{ issue, description: description ?? message }] : [],
  });

function invoiceStatus(inv: Record<string, any>) {
  return inv.status as string;
}

function route(method: string, path: string, body: any, headers: Record<string, string>): SimResult {
  const s = state();
  const mock = headers["PayPal-Mock-Response"]
    ? (JSON.parse(headers["PayPal-Mock-Response"]).mock_application_codes as string)
    : null;
  let m: RegExpExecArray | null;

  // ---- Invoicing v2 ----
  if (method === "POST" && path === "/v2/invoicing/generate-next-invoice-number") {
    s.invoiceSeq += 1;
    return ok(200, { invoice_number: `SIM-${s.invoiceSeq}` });
  }
  if (method === "POST" && path === "/v2/invoicing/invoices") {
    const id = `INV2-${rid(2)}-${rid(2)}-${rid(2)}-${rid(2)}`;
    const inv = {
      id,
      status: "DRAFT",
      detail: {
        ...body.detail,
        metadata: { create_time: new Date().toISOString(), recipient_view_url: `https://www.sandbox.paypal.com/invoice/p/#${id}` },
      },
      primary_recipients: body.primary_recipients,
      items: body.items,
      amount: {
        currency_code: body.detail?.currency_code ?? "USD",
        value: (
          (body.items ?? []).reduce(
            (sum: number, it: any) =>
              sum + Math.round(Number(it.quantity) * Math.round(Number(it.unit_amount.value) * 100)),
            0,
          ) / 100
        ).toFixed(2),
      },
    };
    s.invoices.set(id, inv);
    return ok(201, headers["Prefer"] === "return=representation" ? inv : { rel: "self", href: `${BASE}/v2/invoicing/invoices/${id}`, method: "GET" });
  }
  if ((m = /^\/v2\/invoicing\/invoices\/([^/]+)$/.exec(path)) && method === "GET") {
    const inv = s.invoices.get(m[1]);
    return inv ? ok(200, inv) : fail(404, "RESOURCE_NOT_FOUND", "Invoice not found", "INVALID_RESOURCE_ID");
  }
  if ((m = /^\/v2\/invoicing\/invoices\/([^/]+)\/send$/.exec(path)) && method === "POST") {
    const inv = s.invoices.get(m[1]);
    if (!inv) return fail(404, "RESOURCE_NOT_FOUND", "Invoice not found", "INVALID_RESOURCE_ID");
    if (invoiceStatus(inv) !== "DRAFT") return fail(422, "UNPROCESSABLE_ENTITY", "Invoice already sent", "INVALID_INVOICE_STATUS");
    inv.status = "SENT";
    return ok(200, { rel: "payer-view", href: inv.detail.metadata.recipient_view_url, method: "GET" });
  }
  if ((m = /^\/v2\/invoicing\/invoices\/([^/]+)\/payments$/.exec(path)) && method === "POST") {
    const inv = s.invoices.get(m[1]);
    if (!inv) return fail(404, "RESOURCE_NOT_FOUND", "Invoice not found", "INVALID_RESOURCE_ID");
    if (invoiceStatus(inv) === "PAID") return fail(422, "UNPROCESSABLE_ENTITY", "Invoice already paid", "INVALID_INVOICE_STATUS");
    inv.status = "PAID";
    inv.payments = { transactions: [{ payment_id: `EXTR-${rid(6)}`, ...body }] };
    return ok(200, { payment_id: inv.payments.transactions[0].payment_id });
  }
  if ((m = /^\/v2\/invoicing\/invoices\/([^/]+)\/remind$/.exec(path)) && method === "POST") {
    return s.invoices.has(m[1]) ? ok(204, {}) : fail(404, "RESOURCE_NOT_FOUND", "Invoice not found");
  }

  // ---- Orders v2 ----
  if (method === "POST" && path === "/v2/checkout/orders") {
    const pu = body.purchase_units?.[0];
    if (pu?.invoice_id && s.capturedInvoiceIds.has(pu.invoice_id)) {
      return fail(422, "UNPROCESSABLE_ENTITY", "Duplicate invoice ID", "DUPLICATE_INVOICE_ID", "Duplicate Invoice ID detected.");
    }
    const id = rid(8).slice(0, 17);
    const order = { id, status: "CREATED", intent: body.intent, purchase_units: body.purchase_units };
    s.orders.set(id, order);
    return ok(201, {
      id,
      status: "CREATED",
      links: [{ href: `https://www.sandbox.paypal.com/checkoutnow?token=${id}`, rel: "approve", method: "GET" }],
    });
  }
  if ((m = /^\/v2\/checkout\/orders\/([^/]+)\/capture$/.exec(path)) && method === "POST") {
    const order = s.orders.get(m[1]);
    if (!order) return fail(404, "RESOURCE_NOT_FOUND", "Order not found", "INVALID_RESOURCE_ID");
    if (order.status === "COMPLETED") return fail(422, "UNPROCESSABLE_ENTITY", "Order already captured", "ORDER_ALREADY_CAPTURED");
    if (mock) {
      return fail(422, "UNPROCESSABLE_ENTITY", "The requested action could not be performed, semantically incorrect, or failed business validation.", mock, "The instrument presented was either declined by the processor or bank, or it can't be used for this payment.");
    }
    const pu = order.purchase_units[0];
    order.status = "COMPLETED";
    if (pu.invoice_id) s.capturedInvoiceIds.add(pu.invoice_id);
    const capture = {
      id: rid(8).slice(0, 17),
      status: "COMPLETED",
      amount: { currency_code: pu.amount.currency_code, value: pu.amount.value },
      invoice_id: pu.invoice_id,
      final_capture: true,
      create_time: new Date().toISOString(),
    };
    return ok(201, {
      id: order.id,
      status: "COMPLETED",
      payer: { email_address: "buyer@sandbox.example", payer_id: rid(6) },
      purchase_units: [{ reference_id: pu.reference_id, payments: { captures: [capture] } }],
    });
  }

  // ---- Payouts v1 ----
  if (method === "POST" && path === "/v1/payments/payouts") {
    const sb = body.sender_batch_header?.sender_batch_id;
    if (s.senderBatchIds.has(sb)) {
      return fail(400, "USER_BUSINESS_ERROR", "Batch with given sender_batch_id already exists", "DUPLICATE_SENDER_BATCH_ID");
    }
    s.senderBatchIds.add(sb);
    const id = rid(6);
    const batch = { sender_batch_header: body.sender_batch_header, items: body.items };
    s.batches.set(id, { createdAt: Date.now(), body: batch });
    return ok(201, { batch_header: { payout_batch_id: id, batch_status: "PENDING", sender_batch_header: body.sender_batch_header } });
  }
  if ((m = /^\/v1\/payments\/payouts\/([^/]+)$/.exec(path)) && method === "GET") {
    const b = s.batches.get(m[1]);
    if (!b) return fail(404, "RESOURCE_NOT_FOUND", "Batch not found", "INVALID_RESOURCE_ID");
    const age = Date.now() - b.createdAt;
    const batchStatus = age < 2500 ? "PENDING" : age < 6000 ? "PROCESSING" : "SUCCESS";
    const itemStatus = batchStatus === "SUCCESS" ? "SUCCESS" : batchStatus === "PROCESSING" ? "PENDING" : "PENDING";
    return ok(200, {
      batch_header: { payout_batch_id: m[1], batch_status: batchStatus, sender_batch_header: b.body.sender_batch_header },
      items: b.body.items.map((it: any, i: number) => ({
        payout_item_id: `${m![1]}${String(i).padStart(3, "0")}`,
        transaction_status: itemStatus,
        transaction_id: itemStatus === "SUCCESS" ? rid(8).slice(0, 17) : undefined,
        payout_item: { ...it },
      })),
    });
  }

  return fail(404, "NOT_FOUND", `Simulator has no route for ${method} ${path}`);
}

export function simulatePayPal(
  method: string,
  path: string,
  body: unknown,
  headers: Record<string, string>,
): SimResult {
  const s = state();
  const key = headers["PayPal-Request-Id"] ? `${method} ${path} ${headers["PayPal-Request-Id"]}` : null;
  if (key && s.idempotency.has(key)) return s.idempotency.get(key)!;
  const result = route(method, path, body ?? {}, headers);
  // Like PayPal, replay successful writes for the same request ID; let failures be retried.
  if (key && result.status < 400) s.idempotency.set(key, result);
  return result;
}
