"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PayPalSdkInstance } from "@/types/paypal";
import { Alert, Button } from "../ui";
import { api, ApiRequestError } from "../useProject";

export type CheckoutOutcome =
  | { kind: "success"; captureId: string | null }
  | { kind: "declined"; message: string; debugId?: string | null }
  | { kind: "already_paid"; paidAt?: string | null }
  | { kind: "cancelled" }
  | { kind: "error"; message: string; debugId?: string | null };

interface Props {
  invoiceId: string;
  simulateDecline: boolean;
  mode: "sandbox" | "simulated";
  sdkUrl: string;
  onOutcome: (o: CheckoutOutcome) => void;
  onBusy: (busy: boolean) => void;
}

/** Create the order on our server; a 409 means the invoice is already paid (FR-22). */
async function createOrder(invoiceId: string): Promise<{ orderId: string }> {
  return api<{ orderId: string }>("/api/orders", { body: { invoiceId } });
}

async function capture(orderId: string, simulateDecline: boolean): Promise<CheckoutOutcome> {
  try {
    const r = await api<{ status: string; captureId: string | null }>(`/api/orders/${orderId}/capture`, {
      body: { simulateDecline },
    });
    if (r.status === "COMPLETED") return { kind: "success", captureId: r.captureId };
    return { kind: "error", message: `Payment is ${r.status}. We'll confirm once PayPal settles it.` };
  } catch (e) {
    if (e instanceof ApiRequestError) {
      if (e.body.code === "ALREADY_PAID") return { kind: "already_paid", paidAt: (e.body.details as { paidAt?: string })?.paidAt };
      if (e.body.recoverable) return { kind: "declined", message: e.body.error, debugId: e.body.debugId };
      return { kind: "error", message: e.body.error, debugId: e.body.debugId };
    }
    return { kind: "error", message: e instanceof Error ? e.message : String(e) };
  }
}

function outcomeFromCreateError(e: unknown): CheckoutOutcome {
  if (e instanceof ApiRequestError && e.body.code === "ALREADY_PAID") {
    return { kind: "already_paid", paidAt: (e.body.details as { paidAt?: string })?.paidAt };
  }
  return { kind: "error", message: e instanceof Error ? e.message : String(e) };
}

export function PayPalCheckout(props: Props) {
  return props.mode === "sandbox" ? <SdkV6Button {...props} /> : <SimulatedButton {...props} />;
}

/** Real PayPal JS SDK v6 button (sandbox). Orders are created and captured on our server only. */
function SdkV6Button({ invoiceId, simulateDecline, sdkUrl, onOutcome, onBusy }: Props) {
  const [scriptReady, setScriptReady] = useState(false);
  const [sdk, setSdk] = useState<PayPalSdkInstance | null>(null);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  // onApprove fires long after the click, so read the toggle through a ref.
  const declineRef = useRef(simulateDecline);
  useEffect(() => {
    declineRef.current = simulateDecline;
  }, [simulateDecline]);

  useEffect(() => {
    if (!scriptReady || !window.paypal) return;
    let cancelled = false;
    (async () => {
      try {
        const { clientToken } = await api<{ clientToken: string }>("/api/paypal/client-token", { method: "POST" });
        const instance = await window.paypal!.createInstance({
          clientToken,
          components: ["paypal-payments"],
          pageType: "checkout",
        });
        const methods = await instance.findEligibleMethods({ currencyCode: "USD" });
        if (cancelled) return;
        setSdk(instance);
        setEligible(methods.isEligible("paypal"));
      } catch (e) {
        if (!cancelled) setInitError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scriptReady]);

  const onClick = useCallback(async () => {
    if (!sdk) return;
    // A fresh session per click, so "Try again" after a decline starts cleanly.
    const session = sdk.createPayPalOneTimePaymentSession({
      onApprove: async ({ orderId }) => {
        onBusy(true);
        onOutcome(await capture(orderId, declineRef.current));
        onBusy(false);
      },
      onCancel: () => onOutcome({ kind: "cancelled" }),
      onError: (e) => onOutcome({ kind: "error", message: e instanceof Error ? e.message : "PayPal checkout error" }),
    });
    const orderPromise = createOrder(invoiceId).catch((e) => {
      onOutcome(outcomeFromCreateError(e));
      throw e;
    });
    try {
      await session.start({ presentationMode: "auto" }, orderPromise);
    } catch {
      /* already reported via onOutcome / onError */
    }
  }, [sdk, invoiceId, onBusy, onOutcome]);

  const buttonRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [onClick, eligible]);

  return (
    <div className="min-h-12">
      <Script src={sdkUrl} strategy="afterInteractive" onReady={() => setScriptReady(true)} onError={() => setInitError("Couldn't load the PayPal SDK")} />
      {initError ? (
        <Alert tone="danger" title="PayPal checkout couldn't start">{initError}</Alert>
      ) : eligible === false ? (
        <Alert tone="warning" title="PayPal isn't available for this payment" />
      ) : eligible ? (
        <paypal-button ref={buttonRef} type="pay" className="block w-full" />
      ) : (
        <div className="skeleton h-12 w-full" aria-label="Loading PayPal" />
      )}
    </div>
  );
}

/** Stand-in used when no sandbox keys are configured. Clearly labelled; calls the same server routes. */
function SimulatedButton({ invoiceId, simulateDecline, onOutcome, onBusy }: Props) {
  const [busy, setBusy] = useState(false);
  async function pay() {
    setBusy(true);
    onBusy(true);
    try {
      const { orderId } = await createOrder(invoiceId);
      onOutcome(await capture(orderId, simulateDecline));
    } catch (e) {
      onOutcome(outcomeFromCreateError(e));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <Button variant="primary" size="lg" className="w-full" loading={busy} onClick={pay}>
        {busy ? "Processing…" : "Pay with PayPal (simulated)"}
      </Button>
      <p className="t-body-sm text-center text-ink-muted">PayPal simulator: no sandbox keys are configured on this server.</p>
    </div>
  );
}
