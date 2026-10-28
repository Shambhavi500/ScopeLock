"use client";

import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type IRowNode,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { CreditCard, Download, FileText, Search, Send, Sparkles, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { LedgerFilter } from "@/lib/ai/nlFilter";
import type { LedgerRow } from "@/lib/api-types";
import { formatUSD } from "@/lib/domain/money";
import { Button, CopyId, ProvenanceBadge, StatusBadge } from "../ui";
import { api, formatDateTime } from "../useProject";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeQuartz.withParams({
  fontFamily: "var(--font-inter), Helvetica, Arial, sans-serif",
  fontSize: 14,
  headerFontWeight: 700,
  headerBackgroundColor: "#F1EFEA",
  foregroundColor: "#000000",
  borderColor: "#CFD3D8",
  rowHoverColor: "rgba(5, 55, 130, 0.08)",
  selectedRowBackgroundColor: "#E7F0FE",
  accentColor: "#097FF5",
  rowHeight: 44,
  headerHeight: 40,
  wrapperBorderRadius: 16,
});

const KIND = {
  invoice: { label: "Invoice", Icon: FileText },
  payment: { label: "Payment", Icon: CreditCard },
  payout: { label: "Payout", Icon: Send },
} as const;

type Row = LedgerRow & { isTotal?: boolean; totalsText?: string };

/** Map the validated NL filter onto rows in code. Model output never reaches the grid as-is. */
function matchesFilter(r: LedgerRow, f: LedgerFilter | null): boolean {
  if (!f) return true;
  if (f.kind && r.kind !== f.kind) return false;
  if (f.status) {
    const map: Record<NonNullable<LedgerFilter["status"]>, LedgerRow["status"][]> = {
      paid: ["paid", "sent"],
      unpaid: ["awaiting", "draft"],
      declined: ["declined", "failed"],
      sent: ["sent", "awaiting"],
      processing: ["processing"],
    };
    if (!map[f.status].includes(r.status)) return false;
  }
  const dollars = Math.abs(r.amountCents) / 100;
  if (f.minAmount !== undefined && dollars < f.minAmount) return false;
  if (f.maxAmount !== undefined && dollars > f.maxAmount) return false;
  if (f.text) {
    const hay = `${r.description} ${r.counterparty} ${r.reference ?? ""}`.toLowerCase();
    if (!hay.includes(f.text.toLowerCase())) return false;
  }
  return true;
}

function describeFilter(f: LedgerFilter): string[] {
  const chips: string[] = [];
  if (f.status) chips.push(`status: ${f.status}`);
  if (f.kind) chips.push(`type: ${f.kind}`);
  if (f.minAmount !== undefined) chips.push(`≥ ${formatUSD(Math.round(f.minAmount * 100))}`);
  if (f.maxAmount !== undefined) chips.push(`≤ ${formatUSD(Math.round(f.maxAmount * 100))}`);
  if (f.text) chips.push(`“${f.text}”`);
  return chips;
}

export default function LedgerGrid({ rows }: { rows: LedgerRow[] }) {
  const gridApi = useRef<GridApi<Row> | null>(null);
  const [quick, setQuick] = useState("");
  const [nlMode, setNlMode] = useState(false);
  const [nlLoading, setNlLoading] = useState(false);
  const [nlFilter, setNlFilter] = useState<{ filter: LedgerFilter; source: "ai" | "fallback" } | null>(null);
  const [totals, setTotals] = useState<Row[]>([]);

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      {
        field: "date",
        headerName: "Date",
        width: 150,
        sort: "desc",
        valueFormatter: (p) => (p.data?.isTotal ? "Totals" : p.value ? formatDateTime(p.value) : ""),
        cellClass: "tabular",
      },
      {
        field: "kind",
        headerName: "Type",
        width: 130,
        cellRenderer: (p: ICellRendererParams<Row>) => {
          if (!p.data || p.data.isTotal) return null;
          const k = KIND[p.data.kind];
          return (
            <span className="inline-flex items-center gap-2">
              <k.Icon size={16} className="text-ink-muted" aria-hidden /> {k.label}
            </span>
          );
        },
      },
      {
        field: "reference",
        headerName: "Reference",
        width: 230,
        cellRenderer: (p: ICellRendererParams<Row>) =>
          p.data?.isTotal ? <span className="t-body-sm font-bold">{p.data.totalsText}</span> : p.value ? <CopyId value={p.value} max={20} /> : <span className="text-ink-subtle">—</span>,
        colSpan: (p) => (p.data?.isTotal ? 3 : 1),
      },
      { field: "description", headerName: "Description", flex: 1, minWidth: 200 },
      { field: "counterparty", headerName: "Counterparty", width: 150 },
      {
        field: "amountCents",
        headerName: "Amount",
        width: 140,
        type: "rightAligned",
        cellClass: "tabular font-bold",
        valueFormatter: (p) => (typeof p.value === "number" ? formatUSD(p.value) : ""),
        filter: "agNumberColumnFilter",
        filterValueGetter: (p) => (p.data ? Math.abs(p.data.amountCents) / 100 : 0),
      },
      {
        field: "status",
        headerName: "Status",
        width: 170,
        cellRenderer: (p: ICellRendererParams<Row>) =>
          p.data && !p.data.isTotal ? (
            <span className="inline-flex items-center gap-1">
              <StatusBadge value={p.value} />
              {p.data.seeded && <span className="t-label text-ink-muted">seeded</span>}
            </span>
          ) : null,
      },
    ],
    [],
  );

  const recomputeTotals = useCallback(() => {
    const api = gridApi.current;
    if (!api) return;
    let invoiced = 0;
    let received = 0;
    let paidOut = 0;
    api.forEachNodeAfterFilter((n: IRowNode<Row>) => {
      const r = n.data;
      if (!r) return;
      if (r.kind === "invoice") invoiced += r.amountCents;
      if (r.kind === "payment" && r.status === "paid") received += r.amountCents;
      if (r.kind === "payout" && r.status !== "failed") paidOut += -r.amountCents;
    });
    setTotals([
      {
        id: "totals",
        isTotal: true,
        totalsText: `Invoiced ${formatUSD(invoiced)} · received ${formatUSD(received)} · paid out ${formatUSD(paidOut)}`,
        date: "",
        kind: "invoice",
        reference: null,
        description: "",
        counterparty: "Net received",
        amountCents: received - paidOut,
        status: "paid",
        seeded: false,
      },
    ]);
  }, []);

  const filteredRows = useMemo(() => rows.filter((r) => matchesFilter(r, nlFilter?.filter ?? null)), [rows, nlFilter]);

  async function runNl() {
    if (quick.trim().length < 2) return;
    setNlLoading(true);
    try {
      const r = await api<{ filter: LedgerFilter; source: "ai" | "fallback" }>("/api/ledger/nl-filter", { body: { q: quick } });
      setNlFilter(r);
      setQuick("");
    } finally {
      setNlLoading(false);
    }
  }

  return (
    <div className="ledger-host flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          {nlMode ? (
            <Sparkles size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-brand" aria-hidden />
          ) : (
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" aria-hidden />
          )}
          <input
            className="field !pl-9"
            placeholder={nlMode ? "Ask: unpaid invoices over $500" : "Quick search"}
            aria-label={nlMode ? "Ask the ledger a question" : "Quick search the ledger"}
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nlMode) runNl();
            }}
          />
        </div>
        <Button
          size="sm"
          variant={nlMode ? "primary" : "secondary"}
          icon={<Sparkles size={16} aria-hidden />}
          aria-pressed={nlMode}
          loading={nlLoading}
          onClick={() => (nlMode && quick.trim() ? runNl() : setNlMode((m) => !m))}
        >
          {nlMode ? (quick.trim() ? "Apply" : "Ask mode") : "Ask"}
        </Button>
        {nlFilter && (
          <span className="flex flex-wrap items-center gap-1.5">
            <ProvenanceBadge source={nlFilter.source} />
            {describeFilter(nlFilter.filter).map((c) => (
              <span key={c} className="t-label rounded-full bg-surface-tint px-2.5 py-1">
                {c}
              </span>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" aria-label="Clear filter" onClick={() => setNlFilter(null)}>
              <X size={16} aria-hidden />
            </button>
          </span>
        )}
        <div className="ml-auto">
          <Button size="sm" variant="outline" icon={<Download size={16} aria-hidden />} onClick={() => gridApi.current?.exportDataAsCsv({ fileName: "scopelock-ledger.csv" })}>
            Export CSV
          </Button>
        </div>
      </div>
      <div style={{ height: 420 }}>
        <AgGridReact<Row>
          theme={theme}
          rowData={filteredRows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          quickFilterText={nlMode ? undefined : quick}
          pinnedBottomRowData={totals}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          animateRows
          onGridReady={(e) => {
            gridApi.current = e.api;
            recomputeTotals();
          }}
          onModelUpdated={recomputeTotals}
          overlayNoRowsTemplate="No transactions yet. Create a change-order invoice to get started."
        />
      </div>
    </div>
  );
}
