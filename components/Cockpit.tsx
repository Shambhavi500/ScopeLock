"use client";

import clsx from "clsx";
import { Activity, CircleHelp, FlaskConical, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ProjectState } from "@/lib/api-types";
import { formatUSD } from "@/lib/domain/money";
import { ActivityDrawer } from "./activity/ActivityDrawer";
import { InvoiceList } from "./invoices/InvoiceList";
import { JudgeGuide } from "./JudgeGuide";
import { PayoutPanel } from "./payouts/PayoutPanel";
import { ScopeChangePanel } from "./scope/ScopeChangePanel";
import { Alert, Button, Modal, SegmentedTabs, statusBadge, ToastProvider, useToast, Wordmark, Badge } from "./ui";
import { api, useProject } from "./useProject";

const ProjectGantt = dynamic(() => import("./gantt/ProjectGantt"), {
  ssr: false,
  loading: () => <SkeletonRows />,
});
const LedgerGrid = dynamic(() => import("./ledger/LedgerGrid"), {
  ssr: false,
  loading: () => <SkeletonRows />,
});

type Tab = "change" | "invoices" | "payouts";

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-2 p-1" aria-busy>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="skeleton h-8" style={{ width: `${90 - (i % 3) * 15}%` }} />
      ))}
    </div>
  );
}

export function Cockpit({ projectId }: { projectId: string }) {
  return (
    <ToastProvider>
      <CockpitInner projectId={projectId} />
    </ToastProvider>
  );
}

function CockpitInner({ projectId }: { projectId: string }) {
  const { state, error, slow, refresh } = useProject(projectId);
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("change");
  const [activityOpen, setActivityOpen] = useState(false);
  const [seenEvents, setSeenEvents] = useState(0);
  // The guide only renders once project data has loaded (after hydration), so reading
  // localStorage in the initializer can't cause a hydration mismatch.
  const [guideOpen, setGuideOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return !localStorage.getItem("scopelock.guideSeen");
    } catch {
      return true;
    }
  });
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Keep the cockpit in sync when the client pays in another tab.
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 10_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(t);
    };
  }, [refresh]);

  function closeGuide() {
    setGuideOpen(false);
    try {
      localStorage.setItem("scopelock.guideSeen", "1");
    } catch {
      /* private mode: fine */
    }
  }

  async function reset() {
    setResetting(true);
    try {
      await api("/api/demo/reset", { method: "POST" });
      await refresh();
      setTab("change");
      setSeenEvents(0);
      toast({ tone: "success", message: "Demo reset to its starting state" });
      setResetOpen(false);
    } catch (e) {
      toast({ tone: "error", message: e instanceof Error ? e.message : String(e) });
    } finally {
      setResetting(false);
    }
  }

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        {error ? (
          <Alert tone="danger" title="Couldn't load the project" action={<Button onClick={refresh}>Retry</Button>}>
            {error}
          </Alert>
        ) : slow ? (
          <div className="w-full max-w-md rounded-lg bg-brand p-8 text-white">
            <Wordmark inverse />
            <p className="t-body-lg mt-4">Waking up the demo server (about a minute on the free tier)…</p>
            <div className="indeterminate mt-4 !bg-white/20" />
          </div>
        ) : (
          <div className="w-full max-w-5xl">
            <SkeletonRows />
          </div>
        )}
      </div>
    );
  }

  const unread = Math.max(0, state.events.length - seenEvents);
  const paidInvoices = state.invoices.filter((i) => !i.seeded && i.status === "PAID" && !i.payoutBatchId).length;
  const openInvoices = state.invoices.filter((i) => i.status === "SENT").length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-hairline bg-canvas px-6">
        <Wordmark />
        <span className="hidden h-8 w-px bg-hairline md:block" aria-hidden />
        <div className="hidden min-w-0 md:block">
          <h1 className="t-title-md truncate">{state.project.name}</h1>
        </div>
        <span className="t-body-sm hidden whitespace-nowrap text-ink-muted 2xl:inline">{state.project.clientName}</span>
        <nav aria-label="Milestones" className="mx-auto hidden items-center gap-2 lg:flex">
          {state.milestones.map((m) => {
            const b = statusBadge(m.status);
            return (
              <span
                key={m.id}
                className="t-label inline-flex h-8 items-center gap-1.5 rounded-full border border-hairline bg-canvas px-3"
                title={`M${m.seq} ${m.title} · ${formatUSD(m.amountCents)} · ${b.label}`}
              >
                <Badge tone={b.tone} className="!h-5 !px-1.5">
                  <span className="sr-only">{b.label}</span>
                </Badge>
                M{m.seq} {m.title}
                <span className="hidden font-normal text-ink-muted 2xl:inline">
                  · {formatUSD(m.amountCents)} · {b.label}
                </span>
              </span>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <button
            type="button"
            className="btn btn-ghost relative"
            aria-label={`Activity${unread ? `, ${unread} new` : ""}`}
            title="Activity"
            onClick={() => {
              setActivityOpen(true);
              setSeenEvents(state.events.length);
            }}
          >
            <Activity size={20} aria-hidden />
            {unread > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-accent ring-2 ring-canvas" aria-hidden />}
          </button>
          <button type="button" className="btn btn-ghost" aria-label="Judge guide" title="Judge guide" onClick={() => setGuideOpen(true)}>
            <CircleHelp size={20} aria-hidden />
          </button>
          <Button variant="outline" size="sm" icon={<RotateCcw size={16} aria-hidden />} onClick={() => setResetOpen(true)}>
            Reset demo
          </Button>
        </div>
      </header>

      {state.config.paypalMode === "simulated" && (
        <div className="t-body-sm flex items-center gap-2 border-b border-hairline bg-info-soft px-6 py-2 text-info">
          <FlaskConical size={16} aria-hidden />
          PayPal simulator: no sandbox keys configured, so PayPal calls are answered locally with the same REST shapes. Add
          PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to use the real sandbox.
        </div>
      )}
      <p className="t-body-sm px-6 pt-3 text-ink-muted min-[1100px]:hidden">Best viewed on a laptop or wider screen.</p>

      <main className="grid grid-cols-1 gap-4 p-4 sm:p-6 min-[1100px]:grid-cols-[minmax(560px,3fr)_minmax(400px,2fr)]">
        {/* Timeline */}
        <section className="panel flex min-w-0 flex-col min-[1100px]:h-[min(720px,calc(100vh-160px))]" aria-labelledby="timeline-title">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="timeline-title" className="t-title-md">
              Timeline
            </h2>
            <span className="t-body-sm flex items-center gap-3 text-ink-muted">
              <Legend />
            </span>
          </div>
          <div className="min-h-[420px] flex-1 overflow-hidden rounded-sm border border-hairline">
            <ProjectGantt tasks={state.tasks} milestones={state.milestones} />
          </div>
        </section>

        {/* Side panel */}
        <section className="panel flex min-w-0 flex-col min-[1100px]:h-[min(720px,calc(100vh-160px))]" aria-label="Actions">
          <div className="mb-4">
            <SegmentedTabs<Tab>
              label="Side panel"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "change", label: "Change request" },
                { id: "invoices", label: "Invoices", count: openInvoices },
                { id: "payouts", label: "Payouts", count: paidInvoices },
              ]}
            />
          </div>
          <div role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`} className="-mx-2 flex-1 overflow-auto px-2 pb-2">
            {tab === "change" && <ScopeChangePanel state={state} onChanged={refresh} />}
            {tab === "invoices" && <InvoiceList state={state} onChanged={refresh} />}
            {tab === "payouts" && <PayoutPanel state={state} onChanged={refresh} />}
          </div>
        </section>

        {/* Ledger */}
        <section className="panel min-w-0 min-[1100px]:col-span-2" aria-labelledby="ledger-title">
          <h2 id="ledger-title" className="t-title-md mb-4">
            Ledger
          </h2>
          <LedgerGrid rows={state.ledger} />
        </section>
      </main>

      <ActivityDrawer open={activityOpen} onClose={() => setActivityOpen(false)} events={state.events} />
      <JudgeGuide open={guideOpen} onClose={closeGuide} config={state.config} />
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} labelledBy="reset-title" width={480}>
        <div className="flex flex-col gap-4 p-8">
          <h2 id="reset-title" className="t-title-lg">
            Reset the demo?
          </h2>
          <p className="t-body-sm text-ink-muted">
            This wipes every change request, invoice, payment and payout, re-seeds the Acme Bakery project and issues a fresh
            Milestone 2 invoice.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="lg" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="lg" loading={resetting} onClick={reset}>
              Reset demo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Legend() {
  const items = [
    ["Design", "bg-role-design"],
    ["Dev", "bg-role-dev"],
    ["QA", "bg-role-qa"],
    ["PM", "bg-role-pm"],
  ];
  return (
    <>
      {items.map(([label, cls]) => (
        <span key={label} className="hidden items-center gap-1 sm:inline-flex">
          <span className={clsx("h-2.5 w-2.5 rounded-[2px]", cls)} aria-hidden />
          {label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-[2px] border border-dashed border-locked bg-locked-soft" aria-hidden />
        Locked
      </span>
    </>
  );
}
