"use client";

import { ArrowRight } from "lucide-react";
import type { ProjectState } from "@/lib/api-types";
import { CopyId, Modal } from "./ui";

const STEPS = [
  { title: "Paste a change request", body: "Open the Change request tab, click a sample client message, then Analyze." },
  { title: "Review and invoice", body: "Edit hours or remove items. Prices come from the rate card. Click Create invoice & send." },
  { title: "Pay as the client", body: "Open the client pay page. Turn on “Simulate declined card” first to see the recovery, then pay." },
  { title: "Watch the work unlock", body: "Back in the cockpit, the new tasks unlock on the timeline and the ledger shows the payment." },
  { title: "Pay the team", body: "Open Payouts. All six checks go green; click Pay contractors and watch the batch settle." },
];

export function JudgeGuide({ open, onClose, config }: { open: boolean; onClose: () => void; config: ProjectState["config"] }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="guide-title">
      <div className="bg-brand p-8 text-white">
        <h2 id="guide-title" className="t-display-lg">
          Try it in <span className="text-brand-accent">3 minutes</span>
        </h2>
        <p className="t-body-lg mt-3 text-white/90">
          ScopeLock turns a client&apos;s “can you also add…” into a PayPal invoice, locks the work until it&apos;s paid, then pays the team.
        </p>
      </div>
      <div className="flex flex-col gap-6 p-8">
        <ol className="flex flex-col gap-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="t-label flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-white">{i + 1}</span>
              <div>
                <div className="font-bold">{s.title}</div>
                <div className="t-body-sm text-ink-muted">{s.body}</div>
              </div>
            </li>
          ))}
        </ol>

        <div className="rounded-sm bg-surface-sunken p-4">
          <div className="t-label mb-2">
            {config.paypalMode === "sandbox" ? "PayPal sandbox buyer login (fake test account)" : "PayPal mode"}
          </div>
          {config.paypalMode === "sandbox" ? (
            config.buyerEmail ? (
              <div className="t-body-sm flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  Email: <CopyId value={config.buyerEmail} max={40} />
                </div>
                {config.buyerPassword && (
                  <div className="flex items-center gap-2">
                    Password: <CopyId value={config.buyerPassword} max={40} />
                  </div>
                )}
              </div>
            ) : (
              <p className="t-body-sm">Use any PayPal sandbox personal account.</p>
            )
          ) : (
            <p className="t-body-sm">
              Running on the built-in PayPal simulator (no sandbox keys configured). Every call follows the real REST shapes; add
              sandbox keys to hit PayPal for real.
            </p>
          )}
          <p className="t-body-sm mt-2 text-ink-muted">The server may take about a minute to wake on the free tier.</p>
        </div>

        <button type="button" className="btn btn-primary btn-lg self-start" onClick={onClose}>
          Start the demo <ArrowRight size={20} aria-hidden />
        </button>
      </div>
    </Modal>
  );
}
