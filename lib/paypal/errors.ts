export interface PayPalErrorDetail {
  issue?: string;
  description?: string;
  field?: string;
}

/** A non-2xx PayPal response, normalised. */
export class PayPalError extends Error {
  readonly status: number;
  readonly paypalName: string;
  readonly issue: string | null;
  readonly debugId: string | null;
  readonly details: PayPalErrorDetail[];

  constructor(init: {
    status: number;
    name: string;
    message: string;
    issue?: string | null;
    debugId?: string | null;
    details?: PayPalErrorDetail[];
  }) {
    super(init.message);
    this.name = "PayPalError";
    this.status = init.status;
    this.paypalName = init.name;
    this.issue = init.issue ?? null;
    this.debugId = init.debugId ?? null;
    this.details = init.details ?? [];
  }

  static fromResponse(status: number, body: unknown, debugIdHeader: string | null): PayPalError {
    const b = (body ?? {}) as {
      name?: string;
      message?: string;
      error?: string;
      error_description?: string;
      debug_id?: string;
      details?: PayPalErrorDetail[];
    };
    const details = Array.isArray(b.details) ? b.details : [];
    return new PayPalError({
      status,
      name: b.name ?? b.error ?? `HTTP_${status}`,
      message: b.message ?? b.error_description ?? `PayPal request failed with ${status}`,
      issue: details[0]?.issue ?? null,
      debugId: b.debug_id ?? debugIdHeader,
      details,
    });
  }
}

export function isPayPalError(e: unknown): e is PayPalError {
  return e instanceof PayPalError;
}
