"use client";

import { CircleCheck, CircleX, FlaskConical, Info } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { InvoiceDTO } from "@/lib/api-types";
import { formatUSD } from "@/lib/domain/money";
import { Alert, Button, CopyId, Wordmark } from "../ui";
import { api, formatDate } from "../useProject";
import { PayPalCheckout, type CheckoutOutcome } from "./PayPalCheckout";

interface PublicInvoice {
  invoice: InvoiceDTO;
  project: { name: string; clientName: string };
  paypalMode: "sandbox" | "simulated";
}

export function PayPage({ invoiceId, sdkUrl }: { invoiceId: string; sdkUrl: string }) {
  const [data, setData] = useState<PublicInvoice | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CheckoutOutcome | null>(null);
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    try {
      setData(await api<PublicInvoice>(`/api/invoices/${invoiceId}`));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, [invoiceId]);

  useEffect(() => {
    let alive = true;
    api<PublicInvoice>(`/api/invoices/${invoiceId}`)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [invoiceId]);

  const handleOutcome = useCallback(
    (o: CheckoutOutcome) => {
      setOutcome(o);
      if (o.kind === "success" || o.kind === "already_paid") load();
    },
    [load],
  );

  const inv = data?.invoice;
  const alreadyPaid = inv?.status === "PAID" && outcome?.kind !== "success";

  return (
    <div className="min-h-screen bg-surface-warm">
      <div className="flex h-[72px] items-center justify-between bg-brand px-6">
        <Wordmark inverse />
        <span className="t-body-sm font-bold text-brand-accent">Invoice from Acme Agency</span>
      </div>

      <main className="mx-auto max-w-[560px] px-4 pt-12 pb-16">
        {loadError && <Alert tone="danger" title="Couldn't load this invoice">{loadError}</Alert>}
        {!data && !loadError && (
          <div className="flex flex-col gap-3">
            <div className="skeleton h-12" />
            <div className="skeleton h-80" />
          </div>
        )}

        {inv && data && (
          <>
            <h1 className="t-display-lg mb-6">Pay invoice</h1>
            <div className="rounded-lg bg-canvas p-5 shadow-raised sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="t-label text-ink-muted">Billed to {data.project.clientName}</div>
                  <div className="t-title-md">{inv.title}</div>
                  <div className="t-body-sm text-ink-muted">{data.project.name}</div>
                </div>
                <div className="sm:text-right">
                  {inv.invoiceNumber && <div className="t-mono">#{inv.invoiceNumber}</div>}
                  {inv.dueDate && <div className="t-body-sm text-ink-muted">Due {formatDate(inv.dueDate, { month: "short", day: "numeric", year: "numeric" })}</div>}
                </div>
              </div>

              <ul className="mt-8 flex flex-col gap-3">
                {inv.items.map((l, i) => (
                  <li key={i} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-bold">{l.title}</div>
                      {inv.kind === "change_order" && (
                        <div className="t-body-sm text-ink-muted tabular">
                          {l.hours} h × {formatUSD(l.rateCents)}
                        </div>
                      )}
                    </div>
                    <div className="t-numeric shrink-0 font-bold">{formatUSD(l.amountCents)}</div>
                  </li>
                ))}
              </ul>
              <hr className="my-6 border-hairline" />
              <div className="t-label text-ink-muted">Total due</div>
              <div className="t-amount-hero">{formatUSD(inv.totalCents)}</div>

              <div className="mt-6" aria-live="polite">
                {outcome?.kind === "success" ? (
                  <div className="rounded-sm bg-success-soft p-5 text-success">
                    <CircleCheck size={32} aria-hidden />
                    <div className="t-title-md mt-2 text-ink">Payment received</div>
                    <p className="t-body-sm text-ink">Thank you! The next phase of work is unlocked.</p>
                    {outcome.captureId && (
                      <div className="t-body-sm mt-2 flex items-center gap-2 text-ink">
                        Capture <CopyId value={outcome.captureId} max={24} />
                      </div>
                    )}
                  </div>
                ) : alreadyPaid || outcome?.kind === "already_paid" ? (
                  <div className="flex gap-3 rounded-sm bg-info-soft p-5 text-info">
                    <Info size={24} aria-hidden className="shrink-0" />
                    <div className="text-ink">
                      This invoice has already been paid{inv.paidAt ? ` on ${formatDate(inv.paidAt, { month: "long", day: "numeric", year: "numeric" })}` : ""}.
                    </div>
                  </div>
                ) : inv.seeded || inv.status === "DRAFT" ? (
                  <Alert tone="info" title="This invoice can't be paid online." />
                ) : outcome?.kind === "declined" ? (
                  <div className="rounded-sm bg-danger-soft p-5">
                    <CircleX size={32} className="text-danger" aria-hidden />
                    <div className="t-title-md mt-2">Your card was declined</div>
                    <p className="t-body-sm">No money was taken. Try again with a different payment method.</p>
                    {outcome.debugId && <div className="t-mono mt-2 text-ink-muted">paypal-debug-id: {outcome.debugId}</div>}
                    <Button
                      variant="primary"
                      size="lg"
                      className="mt-4"
                      onClick={() => {
                        setSimulateDecline(false);
                        setOutcome(null);
                        setAttempt((a) => a + 1);
                      }}
                    >
                      Try again
                    </Button>
                  </div>
                ) : (
                  <>
                    <PayPalCheckout
                      key={attempt}
                      invoiceId={inv.id}
                      simulateDecline={simulateDecline}
                      mode={data.paypalMode}
                      sdkUrl={sdkUrl}
                      onOutcome={handleOutcome}
                      onBusy={setBusy}
                    />
                    {busy && <p className="t-body-sm mt-2 text-center text-ink-muted">Confirming your payment…</p>}
                    {outcome?.kind === "cancelled" && <p className="t-body-sm mt-2 text-ink-muted">Payment cancelled. You can try again.</p>}
                    {outcome?.kind === "error" && (
                      <Alert tone="danger" title="Payment didn't go through" className="mt-3">
                        {outcome.message}
                        {outcome.debugId && <div className="t-mono mt-1">paypal-debug-id: {outcome.debugId}</div>}
                      </Alert>
                    )}
                  </>
                )}
              </div>
            </div>

            {!inv.seeded && inv.status !== "PAID" && (
              <div className="mt-8 rounded-md border-2 border-dashed border-border-control bg-surface-warm p-5">
                <div className="t-label flex items-center gap-2">
                  <FlaskConical size={16} aria-hidden /> Demo controls (not shown to real clients)
                </div>
                <label className="mt-3 flex cursor-pointer items-center justify-between gap-4">
                  <span>
                    <span className="block font-bold">Simulate declined card</span>
                    <span className="t-body-sm text-ink-muted">Forces INSTRUMENT_DECLINED on capture via PayPal-Mock-Response.</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-checked={simulateDecline}
                    className="peer sr-only"
                    checked={simulateDecline}
                    onChange={(e) => setSimulateDecline(e.target.checked)}
                  />
                  <span
                    aria-hidden
                    className="relative h-7 w-12 shrink-0 rounded-full bg-ink-subtle transition-colors peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5"
                  />
                </label>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
