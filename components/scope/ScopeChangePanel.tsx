"use client";

import clsx from "clsx";
import {
  CalendarClock,
  CircleHelp,
  ExternalLink,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { MAX_MESSAGE_CHARS } from "@/lib/ai/schema";
import { SAMPLE_MESSAGES } from "@/lib/ai/samples";
import type { ExtractResponse, ProjectState } from "@/lib/api-types";
import { formatUSD } from "@/lib/domain/money";
import { priceItems, roundHours } from "@/lib/domain/pricing";
import { applyChangeOrder } from "@/lib/domain/schedule";
import { ROLES, type Role } from "@/lib/domain/types";
import { Alert, Badge, Button, CopyId, ProvenanceBadge, useToast } from "../ui";
import { api, ApiRequestError, formatDate } from "../useProject";

interface EditableItem {
  key: number;
  include: boolean;
  title: string;
  description: string;
  role: Role;
  hours: number;
  confidence: number | null;
  inOriginalScope: boolean;
  sourceQuote: string;
}

const ROLE_LABEL: Record<Role, string> = { design: "Design", dev: "Dev", qa: "QA", pm: "PM" };

export function ScopeChangePanel({ state, onChanged }: { state: ProjectState; onChanged: () => Promise<void> }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<{ message: string; debugId?: string | null } | null>(null);
  const [created, setCreated] = useState<{ invoiceId: string; invoiceNumber: string | null; paypalInvoiceId: string | null; totalCents: number; payerViewUrl: string | null } | null>(null);

  const included = items.filter((i) => i.include && i.title.trim().length >= 3);
  const pricing = useMemo(
    () => priceItems(included.map((i) => ({ title: i.title, role: i.role, hours: i.hours, description: i.description })), state.rateCard),
    [included, state.rateCard],
  );
  const milestone = state.milestones.find((m) => m.status === "invoiced" || m.status === "planned");
  const preview = useMemo(() => {
    if (!milestone || included.length === 0) return null;
    return applyChangeOrder(state.tasks, milestone.id, included.map((i) => ({ title: i.title, role: i.role, hours: roundHours(i.hours) })));
  }, [state.tasks, milestone, included]);

  const counterTone = text.length >= MAX_MESSAGE_CHARS ? "text-danger" : text.length >= MAX_MESSAGE_CHARS * 0.9 ? "text-warning" : "text-ink-muted";

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    setCreated(null);
    try {
      const r = await api<ExtractResponse>("/api/scope/extract", { body: { projectId: state.project.id, text } });
      setResult(r);
      setItems(
        r.extraction.items.map((it, i) => ({
          key: i,
          include: !it.inOriginalScope,
          title: it.title,
          description: it.description,
          role: it.role,
          hours: it.estimatedHours,
          confidence: it.confidence,
          inOriginalScope: it.inOriginalScope,
          sourceQuote: it.sourceQuote,
        })),
      );
      await onChanged();
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setAnalyzing(false);
    }
  }

  async function createInvoice() {
    if (!result) return;
    setCreating(true);
    setError(null);
    try {
      const r = await api<{ invoice: { id: string; invoiceNumber: string | null; paypalInvoiceId: string | null; totalCents: number; payerViewUrl: string | null } }>(
        "/api/change-orders",
        {
          body: {
            changeRequestId: result.changeRequestId,
            items: included.map((i) => ({ title: i.title.trim(), description: i.description, role: i.role, hours: roundHours(i.hours) })),
          },
        },
      );
      setCreated({ ...r.invoice, invoiceId: r.invoice.id });
      toast({ tone: "success", message: `Invoice ${r.invoice.invoiceNumber} sent to ${state.project.clientName}`, ref: r.invoice.paypalInvoiceId });
      setResult(null);
      setItems([]);
      setText("");
      await onChanged();
    } catch (e) {
      const body = e instanceof ApiRequestError ? e.body : null;
      setError({ message: e instanceof Error ? e.message : String(e), debugId: body?.debugId });
    } finally {
      setCreating(false);
    }
  }

  const update = (key: number, patch: Partial<EditableItem>) =>
    setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  return (
    <div className="flex flex-col gap-4">
      {!state.config.aiEnabled && (
        <Alert tone="warning" title="AI is unavailable. Using the rule-based extractor.">
          Set GEMINI_API_KEY in .env to turn on AI extraction.
        </Alert>
      )}

      {created && (
        <Alert
          tone="success"
          title={`Change-order invoice ${created.invoiceNumber} sent · ${formatUSD(created.totalCents)}`}
          action={
            <div className="flex flex-wrap items-center gap-3">
              <a className="btn btn-primary btn-sm" href={`/pay/${created.invoiceId}`} target="_blank" rel="noreferrer">
                Open client pay page <ExternalLink size={14} aria-hidden />
              </a>
              {created.paypalInvoiceId && <CopyId value={created.paypalInvoiceId} max={24} />}
            </div>
          }
        >
          The new tasks are on the timeline, locked until the client pays.
        </Alert>
      )}

      {/* 1. Samples */}
      <div>
        <div className="t-label mb-2 text-ink-muted">Try a sample client message</div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_MESSAGES.map((s) => (
            <Button key={s.id} size="sm" icon={<MessageSquare size={16} aria-hidden />} onClick={() => setText(s.text)} disabled={analyzing}>
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 2. Paste box */}
      <div>
        <label htmlFor="cr-text" className="t-label mb-2 block">
          Client message
        </label>
        <textarea
          id="cr-text"
          className="field"
          placeholder="Paste what the client sent, e.g. “Can we also add…”"
          value={text}
          maxLength={MAX_MESSAGE_CHARS}
          disabled={analyzing}
          onChange={(e) => setText(e.target.value)}
          aria-describedby="cr-count"
        />
        <div id="cr-count" className={clsx("t-body-sm mt-1 text-right tabular", counterTone)}>
          {text.length.toLocaleString()} / {MAX_MESSAGE_CHARS.toLocaleString()}
        </div>
      </div>

      {/* 3. Analyze */}
      <div className="flex items-center gap-3">
        <Button variant="primary" icon={<Sparkles size={20} aria-hidden />} loading={analyzing} disabled={text.trim().length < 3} onClick={analyze}>
          {analyzing ? "Reading the request…" : "Analyze"}
        </Button>
        <span className="t-body-sm text-ink-muted">{state.config.aiProvider !== "disabled" ? state.config.aiProvider : "Rule-based"}</span>
      </div>

      {error && (
        <Alert tone="danger" title="That didn't work">
          {error.message}
          {error.debugId && <div className="t-mono mt-1">paypal-debug-id: {error.debugId}</div>}
        </Alert>
      )}

      {/* 4–8. Result */}
      <div aria-live="polite">
        {result && (
          <div className="fade-in flex flex-col gap-4 rounded-sm border border-hairline p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ProvenanceBadge source={result.source} />
              {result.extraction.isScopeChange ? <Badge tone="warning">Scope change</Badge> : <Badge tone="info">Not a scope change</Badge>}
            </div>
            <p className="t-body-sm">{result.extraction.summary}</p>
            {result.fallbackReason && <p className="t-body-sm text-ink-muted">Fallback because: {result.fallbackReason}</p>}

            <ScopeItemsTable items={items} rateCard={state.rateCard} update={update} remove={(k) => setItems((xs) => xs.filter((x) => x.key !== k))} />
            <div>
              <Button
                size="sm"
                icon={<Plus size={16} aria-hidden />}
                onClick={() =>
                  setItems((xs) => [
                    ...xs,
                    { key: Date.now(), include: true, title: "", description: "", role: "dev", hours: 2, confidence: null, inOriginalScope: false, sourceQuote: "" },
                  ])
                }
              >
                Add item
              </Button>
            </div>

            {result.extraction.clarifyingQuestions.length > 0 && (
              <div className="rounded-sm bg-info-soft p-4">
                <div className="t-label mb-2 text-info">Questions to ask the client</div>
                <ul className="flex flex-col gap-1.5">
                  {result.extraction.clarifyingQuestions.map((q) => (
                    <li key={q} className="t-body-sm flex gap-2">
                      <CircleHelp size={16} className="mt-0.5 shrink-0 text-info" aria-hidden />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview && preview.addedDays > 0 && (
              <div className="t-body-sm flex items-center gap-2">
                <CalendarClock size={20} className="text-warning" aria-hidden />
                <span>
                  <span className="font-bold text-warning">
                    +{preview.addedDays} day{preview.addedDays === 1 ? "" : "s"}
                  </span>{" "}
                  · Launch moves {formatDate(preview.endBefore)} → {formatDate(preview.endAfter)}
                  {preview.shifted.length > 0 && ` · ${preview.shifted.length} later tasks shift`}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-hairline pt-4">
              <div>
                <div className="t-label text-ink-muted">Change-order total</div>
                <div className="t-title-lg">{formatUSD(pricing.totalCents)}</div>
                <div className="t-body-sm text-ink-muted">Priced by code from the rate card, not by the AI.</div>
              </div>
              <Button variant="primary" icon={<Send size={20} aria-hidden />} loading={creating} disabled={included.length === 0} onClick={createInvoice}>
                {creating ? "Sending…" : "Create invoice & send"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScopeItemsTable({
  items,
  rateCard,
  update,
  remove,
}: {
  items: EditableItem[];
  rateCard: ProjectState["rateCard"];
  update: (key: number, patch: Partial<EditableItem>) => void;
  remove: (key: number) => void;
}) {
  if (items.length === 0) return <p className="t-body-sm text-ink-muted">No billable items found. Add one manually.</p>;
  return (
    <ul className="flex flex-col divide-y divide-hairline border-y border-hairline" aria-label="Scope items">
      {items.map((it) => {
        const hours = roundHours(it.hours);
        const amount = Math.round((rateCard[it.role] * Math.round(hours * 2)) / 2);
        const low = it.confidence !== null && it.confidence < 0.5;
        return (
          <li key={it.key} className={clsx("t-body-sm flex gap-3 py-3", !it.include && "opacity-60")}>
            <input
              type="checkbox"
              className="mt-2.5 h-4 w-4 shrink-0 accent-black"
              checked={it.include}
              onChange={(e) => update(it.key, { include: e.target.checked })}
              aria-label={`Include ${it.title || "item"} on the invoice`}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-start gap-2">
                <input
                  className="field field-sm min-w-0 flex-1 font-bold"
                  value={it.title}
                  maxLength={80}
                  placeholder="Item title"
                  aria-label="Item title"
                  aria-invalid={it.title.trim().length < 3}
                  onChange={(e) => update(it.key, { title: e.target.value })}
                />
                <span className="t-numeric mt-1.5 w-24 shrink-0 text-right font-bold">{formatUSD(amount)}</span>
              </div>
              {it.sourceQuote && (
                <div className="rounded-[4px] border-l-[3px] border-brand bg-brand-accent-soft px-2 py-1 italic">“{it.sourceQuote}”</div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <select className="field field-sm !w-24" value={it.role} aria-label="Role" onChange={(e) => update(it.key, { role: e.target.value as Role })}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="field field-sm !w-20 text-right tabular"
                  min={0.5}
                  max={80}
                  step={0.5}
                  value={it.hours}
                  aria-label="Hours"
                  onChange={(e) => update(it.key, { hours: Number(e.target.value) })}
                />
                <span className="text-ink-muted tabular">h × {formatUSD(rateCard[it.role])}</span>
                {it.inOriginalScope && <Badge tone="info">Already in scope</Badge>}
                <span className="ml-auto flex items-center gap-1">
                  {it.confidence !== null && (
                    <span
                      className={clsx("inline-flex items-center gap-1 tabular", low ? "text-warning" : "text-ink-muted")}
                      title={low ? "Low confidence: check this estimate" : "Model confidence"}
                    >
                      {low && <TriangleAlert size={14} aria-hidden />}
                      <span className="inline-block h-1.5 w-12 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
                        <span className={clsx("block h-full", low ? "bg-warning" : "bg-success")} style={{ width: `${Math.round(it.confidence * 100)}%` }} />
                      </span>
                      <span className="sr-only">Confidence</span>
                      {Math.round(it.confidence * 100)}%
                    </span>
                  )}
                  <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove ${it.title || "item"}`} title="Remove" onClick={() => remove(it.key)}>
                    <Trash2 size={16} aria-hidden />
                  </button>
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
