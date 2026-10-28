"use client";

import { Bell, ExternalLink, FileText, RefreshCw, Send } from "lucide-react";
import { useState } from "react";
import type { InvoiceDTO, ProjectState } from "@/lib/api-types";
import { formatUSD } from "@/lib/domain/money";
import { Alert, Badge, Button, CopyId, EmptyState, Modal, ProvenanceBadge, StatusBadge, useToast } from "../ui";
import { api, formatDate } from "../useProject";

export function InvoiceList({ state, onChanged }: { state: ProjectState; onChanged: () => Promise<void> }) {
  const [remindFor, setRemindFor] = useState<InvoiceDTO | null>(null);
  const invoices = [...state.invoices].reverse();
  if (invoices.length === 0) {
    return <EmptyState icon={<FileText size={40} />} title="No invoices yet">Create a change-order invoice to get started.</EmptyState>;
  }
  return (
    <div className="flex flex-col gap-3">
      {invoices.map((inv) => (
        <InvoiceCard key={inv.id} inv={inv} onChanged={onChanged} onRemind={() => setRemindFor(inv)} />
      ))}
      <ReminderModal invoice={remindFor} onClose={() => setRemindFor(null)} onSent={onChanged} />
    </div>
  );
}

function InvoiceCard({ inv, onChanged, onRemind }: { inv: InvoiceDTO; onChanged: () => Promise<void>; onRemind: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const declined = inv.payments.filter((p) => p.status === "DECLINED").length;

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      toast({ tone: "error", message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-sm border border-hairline p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold">{inv.title}</div>
          <div className="t-body-sm mt-0.5 flex flex-wrap items-center gap-x-2 text-ink-muted">
            {inv.invoiceNumber && <span className="t-mono">#{inv.invoiceNumber}</span>}
            <span>{inv.kind === "milestone" ? "Milestone" : "Change order"}</span>
            {inv.dueDate && inv.status !== "PAID" && <span>· due {formatDate(inv.dueDate)}</span>}
            {inv.paidAt && <span>· paid {formatDate(inv.paidAt)}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold tabular">{formatUSD(inv.totalCents)}</div>
          <StatusBadge value={inv.status} className="mt-1" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {inv.paypalInvoiceId && <CopyId value={inv.paypalInvoiceId} max={22} />}
        {inv.seeded && <Badge tone="info">Seeded history</Badge>}
        {declined > 0 && <Badge tone="danger">{declined} declined attempt{declined === 1 ? "" : "s"}</Badge>}
      </div>

      {!inv.seeded && (
        <div className="mt-3 flex flex-wrap gap-2">
          {inv.status === "DRAFT" && (
            <Button size="sm" variant="primary" icon={<Send size={16} aria-hidden />} loading={busy === "send"} onClick={() => run("send", () => api(`/api/invoices/${inv.id}`, { method: "POST" }))}>
              Retry sending
            </Button>
          )}
          {inv.status !== "DRAFT" && (
            <a className="btn btn-secondary btn-sm" href={`/pay/${inv.id}`} target="_blank" rel="noreferrer">
              Client pay page <ExternalLink size={14} aria-hidden />
            </a>
          )}
          {inv.payerViewUrl && (
            <a className="btn btn-outline btn-sm" href={inv.payerViewUrl} target="_blank" rel="noreferrer">
              PayPal invoice <ExternalLink size={14} aria-hidden />
            </a>
          )}
          {inv.status === "SENT" && (
            <>
              <Button size="sm" variant="outline" icon={<RefreshCw size={16} aria-hidden />} loading={busy === "refresh"} onClick={() => run("refresh", () => api(`/api/invoices/${inv.id}?refresh=1`))}>
                Refresh status
              </Button>
              <Button size="sm" icon={<Bell size={16} aria-hidden />} onClick={onRemind}>
                Send reminder
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReminderModal({ invoice, onClose, onSent }: { invoice: InvoiceDTO | null; onClose: () => void; onSent: () => Promise<void> }) {
  const toast = useToast();
  const [draft, setDraft] = useState<{ subject: string; note: string; source: "ai" | "fallback" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (invoice && loadedFor !== invoice.id && !loading) {
    setLoadedFor(invoice.id);
    setDraft(null);
    setError(null);
    setLoading(true);
    api<{ subject: string; note: string; source: "ai" | "fallback" }>(`/api/invoices/${invoice.id}/remind`, { body: { draft: true } })
      .then(setDraft)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  function close() {
    setLoadedFor(null);
    onClose();
  }

  async function send() {
    if (!invoice || !draft) return;
    setSending(true);
    try {
      await api(`/api/invoices/${invoice.id}/remind`, { body: { subject: draft.subject, note: draft.note } });
      toast({ tone: "success", message: `Reminder sent for invoice ${invoice.invoiceNumber}`, ref: invoice.paypalInvoiceId });
      await onSent();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={!!invoice} onClose={close} labelledBy="remind-title" width={560}>
      <div className="flex flex-col gap-4 p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 id="remind-title" className="t-title-lg">
            Payment reminder
          </h2>
          {draft && <ProvenanceBadge source={draft.source === "ai" ? "ai" : "fallback"} />}
        </div>
        <p className="t-body-sm text-ink-muted">
          The AI drafts it; you edit it; PayPal sends it for invoice {invoice?.invoiceNumber}.
        </p>
        {loading && (
          <div className="flex flex-col gap-2">
            <div className="skeleton h-10" />
            <div className="skeleton h-32" />
          </div>
        )}
        {draft && (
          <>
            <div>
              <label htmlFor="remind-subject" className="t-label mb-2 block">
                Subject
              </label>
              <input id="remind-subject" className="field" value={draft.subject} maxLength={100} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            </div>
            <div>
              <label htmlFor="remind-note" className="t-label mb-2 block">
                Note
              </label>
              <textarea id="remind-note" className="field" value={draft.note} maxLength={600} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            </div>
          </>
        )}
        {error && <Alert tone="danger" title="Couldn't send the reminder">{error}</Alert>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="lg" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" icon={<Send size={20} aria-hidden />} loading={sending} disabled={!draft} onClick={send}>
            Send reminder
          </Button>
        </div>
      </div>
    </Modal>
  );
}
