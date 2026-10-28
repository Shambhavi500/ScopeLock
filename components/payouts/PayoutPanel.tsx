"use client";

import clsx from "clsx";
import { CircleCheck, CircleX, Send, Wallet } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PayoutBatchDTO, PayoutPreviewResponse, ProjectState } from "@/lib/api-types";
import type { Check } from "@/lib/domain/checks";
import { formatUSD } from "@/lib/domain/money";
import { Alert, Button, CopyId, EmptyState, StatusBadge, useToast } from "../ui";
import { api, ApiRequestError } from "../useProject";

const FINAL = new Set(["SUCCESS", "DENIED", "CANCELED"]);

export function PayoutPanel({ state, onChanged }: { state: ProjectState; onChanged: () => Promise<void> }) {
  const candidates = state.invoices.filter((i) => !i.seeded && i.status !== "DRAFT").reverse();
  const defaultId = (candidates.find((i) => i.status === "PAID" && !i.payoutBatchId) ?? candidates.find((i) => i.status === "PAID") ?? candidates[0])?.id ?? null;
  const [invoiceId, setInvoiceId] = useState<string | null>(defaultId);
  const selected = candidates.find((i) => i.id === invoiceId) ? invoiceId : defaultId;

  if (!selected) {
    return <EmptyState icon={<Wallet size={40} />} title="Nothing to pay out yet">Once a client pays an invoice, its contractor split shows up here.</EmptyState>;
  }
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="payout-invoice" className="t-label mb-2 block">
          Invoice
        </label>
        <select id="payout-invoice" className="field" value={selected} onChange={(e) => setInvoiceId(e.target.value)}>
          {candidates.map((i) => (
            <option key={i.id} value={i.id}>
              {i.invoiceNumber ? `#${i.invoiceNumber} · ` : ""}
              {i.title.slice(0, 60)} · {formatUSD(i.totalCents)} · {i.status === "PAID" ? (i.payoutBatchId ? "paid out" : "paid") : "unpaid"}
            </option>
          ))}
        </select>
      </div>
      <PayoutDetail key={selected} invoiceId={selected} invoiceStatus={candidates.find((c) => c.id === selected)!.status} onChanged={onChanged} />
    </div>
  );
}

function PayoutDetail({ invoiceId, invoiceStatus, onChanged }: { invoiceId: string; invoiceStatus: string; onChanged: () => Promise<void> }) {
  const toast = useToast();
  const [preview, setPreview] = useState<PayoutPreviewResponse | null>(null);
  const [batch, setBatch] = useState<PayoutBatchDTO | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<{ message: string; debugId?: string | null } | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const pollStarted = useRef<number>(0);
  const polling = !!batch && !FINAL.has(batch.status) && !timedOut;

  const load = useCallback(async () => {
    const p = await api<PayoutPreviewResponse>("/api/payouts/preview", { body: { invoiceId } });
    setPreview(p);
    setBatch(p.batch);
  }, [invoiceId]);

  useEffect(() => {
    let alive = true;
    api<PayoutPreviewResponse>("/api/payouts/preview", { body: { invoiceId } })
      .then((p) => {
        if (!alive) return;
        setPreview(p);
        setBatch(p.batch);
      })
      .catch((e) => alive && setError({ message: e.message }));
    return () => {
      alive = false;
    };
  }, [invoiceId, invoiceStatus]);

  // Poll every 3 s for up to 60 s while the batch isn't final.
  useEffect(() => {
    if (!batch || !polling) return;
    if (!pollStarted.current) pollStarted.current = Date.now();
    const t = setTimeout(async () => {
      if (Date.now() - pollStarted.current > 60_000) {
        setTimedOut(true);
        return;
      }
      try {
        const b = await api<PayoutBatchDTO>(`/api/payouts/${batch.id}`);
        setBatch(b);
        if (FINAL.has(b.status)) {
          toast({ tone: b.status === "SUCCESS" ? "success" : "error", message: `Payout batch ${b.status}`, ref: b.paypalBatchId });
          await onChanged();
        }
      } catch (e) {
        setError({ message: e instanceof Error ? e.message : String(e) });
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [batch, polling, onChanged, toast]);

  async function pay() {
    setSending(true);
    setError(null);
    try {
      const { batchId } = await api<{ batchId: string }>("/api/payouts", { body: { invoiceId } });
      pollStarted.current = Date.now();
      toast({ tone: "info", message: "Payout batch sent to PayPal" });
      const b = await api<PayoutBatchDTO>(`/api/payouts/${batchId}`);
      setBatch(b);
      await load();
      await onChanged();
    } catch (e) {
      const body = e instanceof ApiRequestError ? e.body : null;
      setError({ message: e instanceof Error ? e.message : String(e), debugId: body?.debugId });
      await load().catch(() => undefined);
    } finally {
      setSending(false);
    }
  }

  if (!preview) {
    return (
      <div className="flex flex-col gap-2" aria-busy>
        <div className="skeleton h-32" />
        <div className="skeleton h-48" />
      </div>
    );
  }

  const failing = preview.checks.filter((c) => !c.pass);
  const sharesTotal = preview.split.reduce((s, x) => s + x.amountCents, 0);
  const basis = preview.capturedCents ?? sharesTotal + preview.marginCents;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Split */}
      <div>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <div className="t-label text-ink-muted">{preview.capturedCents !== null ? "Captured" : "Invoice total (not captured yet)"}</div>
            <div className="t-title-lg">{formatUSD(basis)}</div>
          </div>
        </div>
        <table className="t-body-sm w-full border-collapse">
          <thead>
            <tr className="t-label text-left text-ink-muted">
              <th className="pb-2 font-bold">Contractor</th>
              <th className="pb-2 text-right font-bold">Share</th>
              <th className="pb-2 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {preview.split.map((s) => (
              <tr key={s.contractorId} className="border-t border-hairline">
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="t-label flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-tint" aria-hidden>
                      {s.name.split(" ").map((p) => p[0]).join("")}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold">{s.name}</div>
                      <div className="truncate text-ink-muted">
                        {s.title} · {s.email || "no email"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 text-right tabular">{((s.splitBps * (10000 - preview.marginBps)) / 1_000_000).toFixed(0)}%</td>
                <td className="py-2.5 text-right font-bold tabular">{formatUSD(s.amountCents)}</td>
              </tr>
            ))}
            <tr className="border-t border-hairline text-ink-muted">
              <td className="py-2.5">Agency margin (retained)</td>
              <td className="py-2.5 text-right tabular">{preview.marginBps / 100}%</td>
              <td className="py-2.5 text-right tabular">{formatUSD(preview.marginCents)}</td>
            </tr>
            <tr className="border-t border-ink font-bold">
              <td className="py-2.5">
                {sharesTotal + preview.marginCents === basis && (
                  <span className="inline-flex items-center gap-1 text-success">
                    <CircleCheck size={16} aria-hidden /> Adds up to the cent
                  </span>
                )}
              </td>
              <td />
              <td className="py-2.5 text-right tabular">{formatUSD(sharesTotal + preview.marginCents)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. Checklist (once a batch exists, the only "failing" check is the idempotency guard) */}
      {batch ? (
        <Alert tone="info" title="Already paid out">
          All six checks passed before this batch was sent. A second payout for this invoice is blocked, here and by PayPal&apos;s
          sender_batch_id.
        </Alert>
      ) : (
        <Checklist checks={preview.checks} />
      )}

      {/* 3. Pay button */}
      {!batch && (
        <div className="flex flex-col gap-2">
          <Button variant="primary" size="lg" className="w-full" icon={<Send size={20} aria-hidden />} loading={sending} disabled={!preview.canPay} onClick={pay}>
            {sending ? "Sending…" : `Pay contractors ${formatUSD(sharesTotal)}`}
          </Button>
          {!preview.canPay && (
            <p className="t-body-sm text-center text-danger">
              {failing.length} check{failing.length === 1 ? "" : "s"} failing
              {invoiceStatus !== "PAID" && " · the client hasn't paid this invoice yet"}
            </p>
          )}
        </div>
      )}

      {error && (
        <Alert tone="danger" title="Payout problem">
          {error.message}
          {error.debugId && <div className="t-mono mt-1">paypal-debug-id: {error.debugId}</div>}
        </Alert>
      )}

      {/* 4. Batch status */}
      {batch && (
        <div className="rounded-md border border-hairline p-4" aria-live="polite">
          {polling && <div className="indeterminate mb-3" aria-hidden />}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold">Payout batch</span>
              <StatusBadge value={batch.status} />
            </div>
            {batch.paypalBatchId && <CopyId value={batch.paypalBatchId} />}
          </div>
          <ul className="flex flex-col gap-2">
            {batch.items.map((i) => (
              <li key={i.id} className="t-body-sm flex items-center justify-between gap-2">
                <span>{i.contractorName}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular">{formatUSD(i.amountCents)}</span>
                  <StatusBadge value={i.status} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Checklist({ checks }: { checks: Check[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-hairline">
      <div className="t-label border-b border-hairline bg-surface-warm px-4 py-2">Pre-payout checks (deterministic, code only)</div>
      <ul>
        {checks.map((c) => (
          <li key={c.id} className={clsx("flex gap-3 border-b border-hairline px-4 py-3 last:border-b-0", !c.pass && "bg-danger-soft")}>
            {c.pass ? (
              <CircleCheck size={20} className="mt-0.5 shrink-0 text-success" aria-label="Passed" />
            ) : (
              <CircleX size={20} className="mt-0.5 shrink-0 text-danger" aria-label="Failed" />
            )}
            <div className="min-w-0">
              <div>{c.label}</div>
              <div className="t-body-sm text-ink-muted">{c.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
