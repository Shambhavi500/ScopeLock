# ScopeLock

**Turn a client's "can you also add…" into a priced PayPal invoice, lock the next phase of work until it's paid, then split the payment out to the team.**

Built for *Build What's Next with PayPal and AI*. Sandbox only, no real money.

> **Hosted demo:** _add the Render URL here_. The free tier sleeps after 15 minutes idle, so the first load can take about a minute.

## What it does

1. **Paste a change request.** Gemini 2.5 Flash turns a messy client message into structured scope items: title, role, hours, confidence, whether it was already in scope, and the exact quote it came from.
2. **Review and price.** The agency lead edits items. Prices are computed **by code** from the project's rate card, never by the model. The schedule preview shows how far the new work pushes launch.
3. **Invoice.** One click creates and sends a PayPal invoice (Invoicing v2). The new tasks appear on the Gantt timeline, **locked** until it's paid.
4. **Client pays.** The pay page uses the PayPal JS SDK v6 button; orders are created and captured on the server (Orders v2). A "Simulate declined card" demo control forces `INSTRUMENT_DECLINED` via `PayPal-Mock-Response`, and the retry succeeds.
5. **Unlock.** The capture is recorded on the PayPal invoice, and the locked tasks unlock.
6. **Pay the team.** Six deterministic pre-payout checks, then a Payouts v1 batch splits the money across three contractors, with the agency margin retained.
7. **Ledger.** An AG Grid ledger of every invoice, payment and payout, with quick search, an "Ask" natural-language filter, totals and CSV export.

## Architecture

```
Browser (Next.js App Router, React 19)
 ├─ Cockpit: SVAR Gantt · change request panel · invoices · payouts · AG Grid ledger · activity drawer
 ├─ Pay page: PayPal JS SDK v6 button (sandbox)
 │
 ▼  fetch /api/*   (no secrets in the browser)
Next.js route handlers (Node runtime)
 ├─ lib/domain/   pricing, splits, gating, schedule shift, pre-payout checks (pure, unit tested)
 ├─ lib/ai/       Gemini → strip code fences → Zod → drop invented quotes → retry once → rule-based fallback
 ├─ lib/paypal/   OAuth token cache · request wrapper (PayPal-Request-Id, mock header, typed errors)
 │                invoices · orders · payouts · sim (offline simulator)
 └─ lib/db/       Drizzle + better-sqlite3, wiped and re-seeded on every boot
        │                              │
        ▼                              ▼
 PayPal sandbox REST              Google Gemini API
 api-m.sandbox.paypal.com         (OpenAI-compatible endpoint)
```

**Guard rails**

- Money is integer cents everywhere and is formatted as a decimal string only at the PayPal boundary.
- Every PayPal POST carries a `PayPal-Request-Id` derived from our own record IDs.
- The AI never sets prices, picks payout amounts, calls PayPal or approves anything. The client message is treated as untrusted data, and items whose `sourceQuote` isn't in the message are dropped.
- Duplicate payments (409, and PayPal's `invoice_id` guard) and duplicate payouts (409, a unique DB constraint and PayPal's `sender_batch_id`) are blocked.

## Run it locally

Requirements: Node.js 22+.

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000. The database re-seeds every time the server starts, and **Reset demo** in the header restores the starting state.

### PayPal

- **With sandbox keys** (developer.paypal.com → Apps & Credentials → Sandbox): set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `DEMO_CLIENT_EMAIL` (a personal sandbox account) and `DEMO_CONTRACTOR_EMAILS` (three personal sandbox accounts). Payouts must be enabled on the sandbox business account. Then run the Day-1 smoke test:

  ```bash
  npm run smoke
  ```

- **Without keys**, ScopeLock runs on a built-in **PayPal simulator** (`lib/paypal/sim.ts`) that answers the same REST paths with the same response shapes, idempotency replay, mock-response failures and duplicate guards. The UI labels this mode clearly. It exists for offline development and CI; the submission demo uses the real sandbox.

### AI

ScopeLock uses **Google Gemini** (`gemini-2.5-flash`) through Google's OpenAI-compatible endpoint. Get a free key at [aistudio.google.com](https://aistudio.google.com/apikey) and set it in `.env`:

```
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
```

Thinking is switched off (`reasoning_effort: none`) so extraction stays fast. Check the connection at `/health`.

If the key is unset, or Gemini is down or rate-limited, the rule-based extractor takes over and the UI says so. The three sample messages also have cached known-good extractions.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build && npm start` | Production build and server |
| `npm test` | Vitest unit tests (money, pricing, splits, gating, schedule, checks, AI parsing, fallback) |
| `npm run test:e2e` | Playwright happy path (simulator mode; `npx playwright install chromium` first) |
| `npm run smoke` | PayPal sandbox smoke test (needs real sandbox keys) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

## Deploy (Render free tier)

`render.yaml` defines a free Node web service. Set the secrets (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `GEMINI_API_KEY`, sandbox emails) in the Render dashboard; never commit them. The free disk is wiped when the service sleeps, which is fine: every cold start is a fresh demo.

## Stack

Next.js · React · TypeScript · Tailwind CSS · lucide-react · SVAR React Gantt (MIT) · AG Grid Community (MIT) · better-sqlite3 + Drizzle ORM · Zod · Vercel AI SDK + `@ai-sdk/openai-compatible` · Google Gemini 2.5 Flash · PayPal Invoicing v2, Orders v2, JS SDK v6, Payouts v1 · Vitest · Playwright · Render.

All data in this project is fake. MIT licensed, see [LICENSE](LICENSE).
