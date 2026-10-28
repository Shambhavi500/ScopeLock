import { NextResponse } from "next/server";
import { aiEnabled, GEMINI_BASE_URL, providerLabel } from "@/lib/ai/provider";
import { env } from "@/lib/env";
import { getAccessToken } from "@/lib/paypal/auth";

export const dynamic = "force-dynamic";

async function timed<T>(fn: () => Promise<T>): Promise<{ ok: boolean; ms: number; error?: string }> {
  const t = Date.now();
  try {
    await fn();
    return { ok: true, ms: Date.now() - t };
  } catch (e) {
    return { ok: false, ms: Date.now() - t, error: e instanceof Error ? e.message.slice(0, 200) : String(e) };
  }
}

/** Fast by default (Render's health check). `?deep=1` also probes PayPal auth and the AI provider. */
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get("deep") === "1";
  if (!deep) return NextResponse.json({ ok: true });

  const paypal =
    env.paypalMode === "simulated"
      ? { ok: true, ms: 0, error: "Simulator (no sandbox keys configured)" }
      : await timed(() => getAccessToken());
  const ai = aiEnabled
    ? await timed(async () => {
        const res = await fetch(`${GEMINI_BASE_URL}/models`, {
          headers: { Authorization: `Bearer ${env.GEMINI_API_KEY}` },
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      })
    : { ok: false, ms: 0, error: "Not configured; rule-based fallback in use" };

  return NextResponse.json({
    ok: true,
    paypal: { mode: env.paypalMode, ...paypal },
    ai: { provider: providerLabel, ...ai },
  });
}
