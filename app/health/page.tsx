"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Badge, Wordmark } from "@/components/ui";

interface Health {
  paypal: { mode: string; ok: boolean; ms: number; error?: string };
  ai: { provider: string; ok: boolean; ms: number; error?: string };
}

export default function HealthPage() {
  const [h, setH] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/health?deep=1", { cache: "no-store" })
      .then((r) => r.json())
      .then(setH)
      .catch((e) => setErr(String(e)));
  }, []);

  const row = (label: string, detail: string, ok: boolean, ms: number, error?: string) => (
    <div className="flex items-start justify-between gap-4 border-t border-hairline py-4">
      <div>
        <div className="font-bold">{label}</div>
        <div className="t-body-sm text-ink-muted">{detail}</div>
        {error && <div className="t-body-sm mt-1">{error}</div>}
      </div>
      <div className="flex items-center gap-2">
        <span className="t-body-sm tabular text-ink-muted">{ms} ms</span>
        <Badge tone={ok ? "success" : "warning"}>{ok ? "Reachable" : "Unavailable"}</Badge>
      </div>
    </div>
  );

  return (
    <main className="mx-auto max-w-xl p-6 pt-12">
      <Wordmark />
      <h1 className="t-headline mt-6 mb-6">System health</h1>
      <div className="panel">
        {err && <Alert tone="danger" title="Health check failed">{err}</Alert>}
        {!h && !err && <div className="skeleton h-32" />}
        {h && (
          <>
            {row("PayPal", `Mode: ${h.paypal.mode}`, h.paypal.ok, h.paypal.ms, h.paypal.error)}
            {row("AI provider", h.ai.provider, h.ai.ok, h.ai.ms, h.ai.error)}
          </>
        )}
      </div>
      <Link className="t-body-sm mt-4 inline-block text-link underline" href="/projects/demo">
        Back to the cockpit
      </Link>
    </main>
  );
}
