import "server-only";
import { env } from "@/lib/env";
import { getAccessToken } from "./auth";
import { PayPalError } from "./errors";
import { simulatePayPal } from "./sim";

export interface PayPalRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Required on every POST: PayPal's idempotency key. */
  requestId?: string;
  /** Sandbox-only forced failure, e.g. "INSTRUMENT_DECLINED". */
  mock?: string;
  prefer?: "return=representation" | "return=minimal";
}

export interface PayPalResponse<T> {
  status: number;
  data: T;
  debugId: string | null;
}

export async function paypalFetch<T = unknown>(
  path: string,
  opts: PayPalRequestOptions = {},
): Promise<PayPalResponse<T>> {
  const method = opts.method ?? "GET";
  if (method === "POST" && !opts.requestId) {
    throw new Error(`PayPal-Request-Id is required for POST ${path}`);
  }
  if (opts.mock && !env.PAYPAL_API_BASE.includes("sandbox")) {
    throw new Error("PayPal-Mock-Response is only allowed against the sandbox");
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.requestId) headers["PayPal-Request-Id"] = opts.requestId;
  if (opts.prefer) headers["Prefer"] = opts.prefer;
  if (opts.mock) {
    headers["PayPal-Mock-Response"] = JSON.stringify({ mock_application_codes: opts.mock });
  }

  if (env.paypalMode === "simulated") {
    const r = simulatePayPal(method, path, opts.body, headers);
    if (r.status >= 400) throw PayPalError.fromResponse(r.status, r.body, r.debugId);
    return { status: r.status, data: r.body as T, debugId: r.debugId };
  }

  headers["Authorization"] = `Bearer ${await getAccessToken()}`;
  const res = await fetch(`${env.PAYPAL_API_BASE}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const debugId = res.headers.get("paypal-debug-id");
  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (!res.ok) throw PayPalError.fromResponse(res.status, data, debugId);
  return { status: res.status, data: data as T, debugId };
}
