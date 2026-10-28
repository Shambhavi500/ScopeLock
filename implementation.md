# ScopeLock — Implementation Plan

**Companion doc:** [prd.md](prd.md), which covers what to build and why. This doc covers how, in what order, and what "done" means.
**Timeline:** Oct 28 – Nov 11, 2026 build (15 days). Final submit Nov 12 before 12:00 PM PT.
**Rule:** anything marked *verify* must be checked against official docs or a live sandbox call before code depends on it.

---

## 1. Tech stack (approved, all free)

| Layer | Package | License |
|---|---|---|
| Runtime | Node.js 22 LTS (Render default). Local dev on Node 22 or 24 | MIT |
| Language | TypeScript 5.x (pin to 5.x; don't use 7.x until Next.js supports it) | Apache-2.0 |
| Framework | `next` (App Router), `react`, `react-dom` | MIT |
| Styling | `tailwindcss`, shadcn/ui components (copied into the repo), `lucide-react` icons | MIT / ISC |
| Timeline | `@svar-ui/react-gantt` (open-source edition) | MIT |
| Grid | `ag-grid-community`, `ag-grid-react` | MIT |
| Database | `better-sqlite3`, `drizzle-orm`, `drizzle-kit` | MIT / Apache-2.0 |
| Validation | `zod` | MIT |
| AI | `ai` (Vercel AI SDK), `@ai-sdk/openai-compatible` | Apache-2.0 |
| AI model | Google Gemini `gemini-2.5-flash` via its OpenAI-compatible endpoint | Free tier (Google AI Studio key) |
| PayPal (server) | Plain `fetch` against the REST APIs, no SDK dependency | n/a |
| PayPal (browser) | JS SDK v6 script from `https://www.sandbox.paypal.com/web-sdk/v6/core` | Free (PayPal) |
| Tests | `vitest`, `@playwright/test` | MIT / Apache-2.0 |
| Lint/format | `eslint`, `prettier` | MIT |
| Hosting | Render free web service | Free tier |

On Day 1, run `npm view <pkg> version` for each package and **pin exact versions** in `package.json`. Then check the setup snippets below against the installed versions. AI SDK and SVAR APIs change between major versions.

## 2. Architecture

```
Browser (Next.js pages, React)
 ├─ Cockpit: SVAR Gantt + change request panel + AG Grid ledger + payouts panel
 ├─ Pay page: PayPal JS SDK v6 button (sandbox)
 │
 ▼  fetch /api/*   (no secrets in the browser)
Next.js route handlers (Node runtime)
 ├─ domain/      pricing, gating, schedule shift, pre-payout checks, event log
 ├─ ai/          extract (LLM + Zod) → fallback (rules)
 ├─ paypal/      auth (token cache) · request (idempotency, mock header, errors)
 │               invoices · orders · payouts
 └─ db/          Drizzle + better-sqlite3 (file on local disk, re-seeded on boot)
        │                          │
        ▼                          ▼
 PayPal sandbox REST          Google Gemini API
 api-m.sandbox.paypal.com     (OpenAI-compatible endpoint)
```

Principles:
- **Money is computed by code, never by the model.** AI returns hours and roles. `domain/pricing.ts` turns them into amounts using integer cents.
- **Every PayPal write is idempotent.** Send a `PayPal-Request-Id` derived from our own record ID (e.g. `capture-<invoiceId>-<attempt>`).
- **One source of truth for state:** our SQLite DB. PayPal responses are stored on our records, with IDs, statuses and the raw JSON for debugging.

## 3. Repository layout

```
/ (repo root = C:\Projects\Paypal)
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx                      # redirects to /projects/demo
│  ├─ projects/[projectId]/page.tsx # cockpit
│  ├─ pay/[invoiceId]/page.tsx      # client pay page
│  ├─ health/page.tsx               # P1
│  └─ api/
│     ├─ project/[projectId]/route.ts           GET  full project state
│     ├─ scope/extract/route.ts                 POST text → scope items
│     ├─ change-orders/route.ts                 POST approve items → tasks + invoice
│     ├─ invoices/[invoiceId]/route.ts          GET  (refresh status from PayPal)
│     ├─ invoices/[invoiceId]/remind/route.ts   POST (P1)
│     ├─ paypal/client-token/route.ts           POST browser-safe token for SDK v6
│     ├─ orders/route.ts                        POST create order for invoice
│     ├─ orders/[orderId]/capture/route.ts      POST capture (+ optional mock)
│     ├─ payouts/preview/route.ts               POST split + checks
│     ├─ payouts/route.ts                       POST send batch
│     ├─ payouts/[batchId]/route.ts             GET  poll status
│     ├─ ledger/nl-filter/route.ts              POST (P1)
│     └─ demo/reset/route.ts                    POST re-seed
├─ components/
│  ├─ gantt/ProjectGantt.tsx
│  ├─ scope/ScopeChangePanel.tsx, ScopeItemsTable.tsx, SampleMessages.tsx
│  ├─ invoices/InvoiceList.tsx
│  ├─ checkout/PayPalCheckout.tsx
│  ├─ payouts/PayoutPanel.tsx, PrePayoutChecklist.tsx
│  ├─ ledger/LedgerGrid.tsx
│  ├─ activity/ActivityDrawer.tsx
│  └─ JudgeGuide.tsx
├─ lib/
│  ├─ env.ts                 # zod-validated env, server-only
│  ├─ db/schema.ts, client.ts, seed.ts
│  ├─ paypal/auth.ts, request.ts, errors.ts, invoices.ts, orders.ts, payouts.ts
│  ├─ ai/provider.ts, schema.ts, prompts.ts, extract.ts, fallback.ts, nlFilter.ts
│  └─ domain/money.ts, pricing.ts, gating.ts, schedule.ts, checks.ts, events.ts
├─ tests/unit/*.test.ts, tests/e2e/demo.spec.ts
├─ scripts/paypal-smoke.ts   # Day-1 sandbox check
├─ data/                     # SQLite file (gitignored)
├─ render.yaml
├─ .env.example
├─ LICENSE                   # MIT
├─ README.md
├─ prd.md
└─ implementation.md
```

## 4. Environment variables (`.env.example`)

```bash
# PayPal sandbox (developer.paypal.com → Apps & Credentials → Sandbox)
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
NEXT_PUBLIC_PAYPAL_SDK_URL=https://www.sandbox.paypal.com/web-sdk/v6/core

# Sandbox accounts (fake, created in the PayPal developer dashboard)
DEMO_CLIENT_EMAIL=          # personal sandbox account that pays invoices
DEMO_CONTRACTOR_EMAILS=     # comma-separated, 3 personal sandbox accounts

# AI: Google Gemini (key from aistudio.google.com)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

# App
DATABASE_PATH=./data/scopelock.db
PAYOUT_CAP_CENTS=500000
APP_BASE_URL=http://localhost:3000
```

`lib/env.ts` parses these with Zod on startup and fails fast with a readable error. It imports `server-only` so it can never end up in a client bundle.

## 5. Data model (Drizzle, SQLite)

Store all money as **integer cents** with a `currency` column (USD).

| Table | Key columns |
|---|---|
| `projects` | id, name, client_name, client_email, currency, agency_margin_bps (e.g. 2000 = 20%) |
| `rate_card` | project_id, role (`design`\|`dev`\|`qa`\|`pm`), rate_cents_per_hour |
| `contractors` | id, project_id, name, role, payout_email, split_bps |
| `milestones` | id, project_id, seq, title, amount_cents, status, invoice_id (nullable) |
| `tasks` | id, project_id, milestone_id, title, role, start_date, duration_days, depends_on (task id), source (`seed`\|`change_order`), change_order_id |
| `change_requests` | id, project_id, raw_text, extraction_json, extraction_source (`ai`\|`fallback`\|`cache`), created_at |
| `change_orders` | id, change_request_id, milestone_id, items_json, total_cents, status (`draft`\|`invoiced`\|`paid`) |
| `invoices` | id, project_id, kind (`milestone`\|`change_order`), ref_id, paypal_invoice_id, invoice_number, status, total_cents, payer_view_url, raw_json |
| `payments` | id, invoice_id, paypal_order_id, paypal_capture_id, status, amount_cents, failure_code, attempt, raw_json |
| `payout_batches` | id, invoice_id (unique), sender_batch_id, paypal_batch_id, status, raw_json |
| `payout_items` | id, batch_id, contractor_id, amount_cents, paypal_item_id, status |
| `events` | id, project_id, type, message, paypal_ref, created_at |

**Milestone/invoice state machine**

```
milestone: planned → invoiced → paid → paid_out
                       │
                       └─ (payment failed) stays invoiced, failure logged
invoice:   DRAFT → SENT → PAID     (mirrors PayPal statuses we care about)
```

**Gating rule** (`domain/gating.ts`): a task is locked if its milestone, or any earlier milestone, has an invoice that isn't `PAID`. Change-order tasks are locked until their own change-order invoice is `PAID`. This is a pure function from (milestones, invoices, tasks) to a set of locked task IDs, with unit tests.

## 6. Seed data (`lib/db/seed.ts`)

- Project: "Acme Bakery — e-commerce site", client "Acme Bakery", client email = `DEMO_CLIENT_EMAIL`.
- Rate card: design $80/h, dev $95/h, qa $60/h, pm $70/h.
- Contractors: Designer (30%), Frontend dev (35%), Backend dev (35%) of the contractor pool. The agency margin is 20% off the top.
- Milestones: M1 Design $2,400 (`paid_out`, with a seeded fake history in the ledger), M2 Build $6,800 (`invoiced`, unpaid, **real sandbox invoice created on first boot**), M3 Launch $1,600 (`planned`).
- About 12 tasks across the milestones with dependencies. M3 tasks start locked.
- Sample client messages (FR-12), each with a cached "known good" extraction for the fallback path.

`instrumentation.ts` (Next.js startup hook) runs: migrate → wipe → seed → create the M2 sandbox invoice if missing. `POST /api/demo/reset` runs the same thing. On Render free, the disk is wiped when the service sleeps, so every cold start is a fresh demo. That's intended.

## 7. PayPal integration

### 7.1 Auth and request wrapper
- `auth.ts`: `POST /v1/oauth2/token` with Basic auth (`client_id:secret`) and `grant_type=client_credentials`. Cache the token in memory until `expires_in - 60s`.
- `request.ts`: `paypalFetch(path, { method, body, requestId?, mock?, prefer? })` that:
  - sets `Authorization: Bearer`, `Content-Type: application/json`
  - sets `PayPal-Request-Id` on every POST (required, not optional)
  - sets `Prefer: return=representation` when asked
  - sets `PayPal-Mock-Response: {"mock_application_codes":"<CODE>"}` when `mock` is passed (sandbox only; assert that `PAYPAL_API_BASE` contains `sandbox`)
  - logs `paypal-debug-id` from the response headers into `events` on errors
  - converts non-2xx responses into a typed `PayPalError { status, name, issue, debugId, details }` (`errors.ts`)

### 7.2 Invoicing v2 (`invoices.ts`)
| Step | Call |
|---|---|
| Next number | `POST /v2/invoicing/generate-next-invoice-number` |
| Create draft | `POST /v2/invoicing/invoices` with `detail { invoice_number, currency_code, note, payment_term { due_date } }`, `primary_recipients[0].billing_info.email_address`, `items[] { name, description, quantity (hours), unit_amount { currency_code, value }, unit_of_measure: "HOURS" }` |
| Send | `POST /v2/invoicing/invoices/{id}/send` with `{ send_to_recipient: true }` |
| Get | `GET /v2/invoicing/invoices/{id}`, which gives status and `detail.metadata.recipient_view_url` (*verify* the field name) |
| Record payment | `POST /v2/invoicing/invoices/{id}/payments` with `{ method: "PAYPAL", payment_date, amount }` after our capture succeeds |
| Remind (P1) | `POST /v2/invoicing/invoices/{id}/remind` with the subject and note |

Line-item amounts come from `pricing.ts`. They're formatted as decimal strings (`"950.00"`) only at the PayPal boundary.

### 7.3 Orders v2 (`orders.ts`)
- Create: `POST /v2/checkout/orders` with `intent: "CAPTURE"` and `purchase_units[0] { reference_id: invoiceId, invoice_id: invoice_number, description, amount { currency_code, value, breakdown.item_total }, items[] }`.
  - Reusing `invoice_id` on a second order for an already-captured invoice makes PayPal reject it as a duplicate. We also block it ourselves first (FR-22).
- Capture: `POST /v2/checkout/orders/{id}/capture`. Read `purchase_units[0].payments.captures[0].{id,status,amount}`.
- Mock decline: when the pay page's "Simulate declined card" is on, the capture route passes `mock: "INSTRUMENT_DECLINED"`. That returns 422 with `issue: INSTRUMENT_DECLINED`. Return `{ recoverable: true }` to the browser so it restarts the payment session.

### 7.4 JS SDK v6 in the browser (`PayPalCheckout.tsx`). *Verify against the official v6 sample on Day 1.*

```ts
// 1. Load <script src={NEXT_PUBLIC_PAYPAL_SDK_URL}> (next/script, strategy="afterInteractive")
// 2. Get a browser-safe token from our server:
//    POST /api/paypal/client-token
//      → server: POST /v1/oauth2/token
//        body: grant_type=client_credentials&response_type=client_token&intent=sdk_init
//      → returns { clientToken }
//    (Docs also show passing clientId directly to createInstance. Use whichever
//     the current official sample uses; open question Q2 in prd.md.)
const sdk = await window.paypal.createInstance({
  clientToken,
  components: ["paypal-payments"],
  pageType: "checkout",
});
const methods = await sdk.findEligibleMethods({ currencyCode: "USD" });
if (methods.isEligible("paypal")) {
  const session = sdk.createPayPalOneTimePaymentSession({
    onApprove: async ({ orderId }) => {
      const r = await fetch(`/api/orders/${orderId}/capture`, {
        method: "POST",
        body: JSON.stringify({ simulateDecline }),
      });
      // r.ok → success state; 422 + recoverable → show message, allow retry
    },
    onCancel: () => setState("cancelled"),
    onError: (e) => setState({ error: e }),
  });
  // <paypal-button type="pay"> click handler:
  await session.start(
    { presentationMode: "auto" },
    fetch("/api/orders", { method: "POST", body: JSON.stringify({ invoiceId }) })
      .then((r) => r.json()), // must resolve to { orderId }
  );
}
```

Add a `paypal-button` custom-element type declaration in `types/paypal.d.ts`.

### 7.5 Payouts v1 (`payouts.ts`)
- Send: `POST /v1/payments/payouts` with `sender_batch_header { sender_batch_id: "co-<invoiceId>", email_subject, email_message }` and `items[] { recipient_type: "EMAIL", receiver, amount { value, currency }, note, sender_item_id: "<invoiceId>-<contractorId>" }`.
  - PayPal rejects a reused `sender_batch_id`, which gives us idempotency on PayPal's side as well as ours (the unique `invoice_id` on `payout_batches`).
- Poll: `GET /v1/payments/payouts/{payout_batch_id}`. The batch goes `PENDING` → `PROCESSING` → `SUCCESS`. Items have `transaction_status`. The UI polls every 3 s for up to 60 s.

### 7.6 Day-1 smoke script (`scripts/paypal-smoke.ts`)
Run with `npx tsx scripts/paypal-smoke.ts`. It must succeed before any UI work starts:
1. Get an OAuth token.
2. Create and send a $1 invoice to `DEMO_CLIENT_EMAIL`.
3. Create an order and print the approval link (approve it manually with the sandbox buyer), then capture it.
4. Capture with `PayPal-Mock-Response` → expect 422 `INSTRUMENT_DECLINED`.
5. Send a $1 payout to one contractor email → poll until SUCCESS.

If step 5 fails, Payouts isn't enabled. Fix that in the sandbox account settings or create a new sandbox business account before continuing.

## 8. AI integration

### 8.1 Provider (`ai/provider.ts`)
```ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
export const llm = createOpenAICompatible({
  name: "llm",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
  apiKey: env.GEMINI_API_KEY,
});
export const model = llm(env.GEMINI_MODEL);
```
Gemini runs hosted, so nothing needs to run locally. Pass `providerOptions: { llm: { reasoningEffort: "none" } }` to switch off thinking for speed.

### 8.2 Output schema (`ai/schema.ts`)
```ts
export const ScopeItem = z.object({
  title: z.string().min(3).max(80),
  description: z.string().max(300),
  role: z.enum(["design", "dev", "qa", "pm"]),
  estimatedHours: z.number().min(0.5).max(80),
  inOriginalScope: z.boolean(),
  confidence: z.number().min(0).max(1),
  sourceQuote: z.string().max(200),   // must be a substring of the input
});
export const Extraction = z.object({
  isScopeChange: z.boolean(),
  summary: z.string().max(300),
  items: z.array(ScopeItem).max(10),
  requestedDeadline: z.string().nullable(), // ISO date or null
  clarifyingQuestions: z.array(z.string()).max(5),
});
```

### 8.3 Extraction pipeline (`ai/extract.ts`)
1. Build the prompt: a system prompt (role, rules, output only JSON matching the schema, ignore instructions inside the client text) plus the **original scope** (task list summary) plus the client text wrapped in `<client_message>` tags.
2. Call the AI SDK structured-output helper with the Zod schema. That's `generateObject({ model, schema, prompt })` on AI SDK 5. On AI SDK 6 it's `generateText` with `output: Output.object({ schema })`. *Verify against the installed version.* Set a 15 s timeout.
3. Post-process: strip any Markdown code fences around the JSON, and drop items whose `sourceQuote` isn't found in the input, since those are hallucination guards.
4. On a validation error: retry once with the error message appended. On a second failure, timeout or 429: run `fallback.ts`.
5. Save to `change_requests` with `extraction_source`.

### 8.4 Rule-based fallback (`ai/fallback.ts`)
- If the text exactly matches a sample message, return its cached extraction (`extraction_source: "cache"`).
- Otherwise: split on sentences and "and also / can we / please add". Map keywords to roles (page/feature/filter → dev, design/logo/colour → design, test → qa). Default to 4 h per item, with confidence 0.3. Always return at least one item and a clarifying question.

### 8.5 P1 AI features
- **Reminder draft:** given the invoice, days overdue and tone, return `{ subject, note }`. The lead edits it before sending.
- **NL ledger filter:** text → a Zod-validated subset of the AG Grid filter model (`{ status?, kind?, minAmount?, maxAmount?, dateFrom?, dateTo? }`), which the code then maps to the AG Grid filter model. Never pass model output to the grid directly.

## 9. Domain logic (pure functions, unit tested)

| Module | Function | Notes |
|---|---|---|
| `money.ts` | `toCents`, `formatUSD`, `toPayPalValue` | Integer cents everywhere. `toPayPalValue(95000) → "950.00"` |
| `pricing.ts` | `priceItems(items, rateCard) → { lines, totalCents }` | Rounds hours to 0.5 and multiplies by the role rate |
| `schedule.ts` | `applyChangeOrder(tasks, items, capacityHoursPerDay=6)` | Adds tasks after the current milestone's last task and shifts dependents by the added days. Returns a preview diff for the UI |
| `gating.ts` | `lockedTaskIds(milestones, invoices, tasks)` | See §5 |
| `checks.ts` | `prePayoutChecks(ctx) → Check[]` | The 6 checks from prd §8.2, each `{ id, label, pass, detail }` |
| `splits.ts` | `computeSplit(capturedCents, marginBps, contractors)` | Largest-remainder rounding so the shares add up exactly |
| `events.ts` | `logEvent(type, message, paypalRef?)` | Feeds the activity drawer |

## 10. Frontend

- **Cockpit layout:** CSS grid. Header across the top. Gantt (about 60% width) plus a tabbed side panel (40%). Ledger full-width underneath. Below 1100 px the panels stack.
- **Data fetching:** one `GET /api/project/[id]` returns everything the cockpit needs. After each mutation, re-fetch with a simple `useProject()` hook. No extra state library needed.
- **SVAR Gantt** (`ProjectGantt.tsx`): import CSS and `Gantt`, `Willow` theme from `@svar-ui/react-gantt`. Map tasks to `{ id, text, start, duration, parent: milestoneId, type }`, milestones to `type: "summary"`, and dependencies to links `{ id, source, target, type: "e2s" }`. Locked tasks get a CSS class, a 🔒 prefix in the text and a tooltip. Cancel drag or edit actions on locked IDs through the Gantt API's intercept hook. The component must be client-only (`"use client"`, dynamic import with `ssr: false`). *Verify prop names against the installed version's docs.*
- **AG Grid Community** (`LedgerGrid.tsx`): `ModuleRegistry.registerModules([AllCommunityModule])`. Columns: date, type, reference (PayPal ID, copyable), counterparty, amount (right-aligned, formatted), status (badge cell renderer). Quick filter input, a pinned bottom totals row, and CSV export (P2). No Enterprise modules.
- **Change request panel:** textarea plus 3 sample buttons, then "Analyze" (spinner and an "AI" or "Fallback" badge on the result), then the editable table (hours and role editable, live price), then a schedule preview ("+3 days, launch moves to Dec 4"), then "Create invoice & send".
- **Pay page:** a standalone, minimal page that looks like what a client would see. A demo toggle "Simulate declined card" sits in a dashed "Demo controls" box.
- **Payouts panel:** split table, then the checklist (✓/✗ with detail), then the "Pay contractors" button (disabled unless every check passes), then per-item status pills that update while polling.

## 11. API contract (summary)

| Route | Request | Response |
|---|---|---|
| `POST /api/scope/extract` | `{ projectId, text }` | `{ changeRequestId, extraction, source }` |
| `POST /api/change-orders` | `{ changeRequestId, items[] }` (edited) | `{ changeOrderId, invoice, tasksAdded }` |
| `POST /api/orders` | `{ invoiceId }` | `{ orderId }` · 409 if already paid |
| `POST /api/orders/:id/capture` | `{ simulateDecline?: boolean }` | `{ status, captureId }` · 422 `{ code, recoverable }` |
| `POST /api/payouts/preview` | `{ invoiceId }` | `{ split[], checks[], canPay }` |
| `POST /api/payouts` | `{ invoiceId }` | `{ batchId }` · 409 if checks fail or a batch already exists |
| `GET /api/payouts/:batchId` | – | `{ status, items[] }` |
| `POST /api/demo/reset` | – | `{ ok }` |

Validate every request body with Zod, and return `{ error, code }` JSON on failure. Add a simple in-memory per-IP rate limit on `/api/scope/extract` (10 per minute) to protect the Gemini quota.

## 12. Testing

- **Unit (Vitest):** `money`, `pricing`, `splits` (rounding edge cases), `schedule`, `gating`, `checks`, `fallback`, and schema parsing of sample AI outputs, including bad ones. Target: every domain function tested.
- **PayPal integration:** `scripts/paypal-smoke.ts` against the sandbox, run manually and before every deploy.
- **E2E (Playwright), one happy path:** reset → sample message → analyze → create invoice → open the pay page → (with a mocked PayPal popup, or skip payment and call the capture route in test mode) → payouts preview shows all checks green. Plus a manual full run with a real sandbox buyer before recording.
- **Negative paths to show and test:** `INSTRUMENT_DECLINED` on capture, paying an already-paid invoice (409), payout attempted twice (409), AI provider offline (falls back).

## 13. Deployment (Render free)

`render.yaml`:
```yaml
services:
  - type: web
    name: scopelock
    runtime: node
    plan: free
    buildCommand: npm ci && npm run build
    startCommand: npm run start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_VERSION
        value: "22"
      - key: PAYPAL_CLIENT_ID
        sync: false
      - key: PAYPAL_CLIENT_SECRET
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      # ...the rest of .env.example; sync:false for every secret
```
Notes:
- `next.config.ts`: `serverExternalPackages: ["better-sqlite3"]`, so the native module isn't bundled.
- Free tier: about 1 min cold start, disk wiped on sleep. Seeding on boot handles it (§6). It gets 750 free instance hours a month, which is enough for one always-available service.
- Gemini key and PayPal sandbox secrets are set in the Render dashboard, never committed.
- After deploy, run the full demo on the hosted URL. Repeat once a week through Dec 21, because judges may test any time.

## 14. Day-by-day schedule

| Day | Date | Work | Exit check |
|---|---|---|---|
| 1 | Tue Oct 28 | Accounts (PayPal developer, 1 business + 4 personal sandbox accounts, Gemini API key, Render, GitHub). Init repo with MIT LICENSE, Next.js, Tailwind, lint. Write and run `paypal-smoke.ts`. Run the official v6 sample locally | All 5 smoke steps pass |
| 2 | Wed Oct 29 | `env.ts`, Drizzle schema, migrations, seed. `money`, `pricing`, `splits`, `gating`, `schedule` with unit tests | `npm test` green |
| 3 | Thu Oct 30 | `paypal/auth`, `request`, `errors`, `invoices`. Seed creates the real M2 invoice on boot | Invoice appears in sandbox |
| 4 | Fri Oct 31 | `orders` routes, client-token route, pay page with the v6 button, record payment on the invoice | Paid end to end with sandbox buyer |
| 5 | Sat Nov 1 | Decline simulation and retry, duplicate-payment block. `payouts`, `checks`, preview and send routes, polling | Payout batch SUCCESS from the API |
| 6 | Sun Nov 2 | AI provider, schema, prompt, extract, fallback and cache. `/api/scope/extract`. Test on Gemini | All 3 samples parse |
| 7 | Mon Nov 3 | Cockpit layout, SVAR Gantt with lock styling and the schedule preview | Locked tasks are visible |
| 8 | Tue Nov 4 | Change request panel (edit items, live price) and the change-order route wired up | Paste → invoice → new locked tasks |
| 9 | Wed Nov 5 | Payouts panel and checklist, AG Grid ledger, activity drawer | Full flow works locally |
| 10 | Thu Nov 6 | Deploy to Render, fix production issues, health route, judge guide, reset button | Full flow works on the hosted URL |
| 11 | Fri Nov 7 | P1: AI reminder, NL ledger filter. Accessibility pass | — |
| 12 | Sat Nov 8 | Playwright happy path, README (architecture diagram, setup, test accounts), screenshots | A fresh clone runs from the README |
| 13 | Sun Nov 9 | Polish UI copy and empty states, rehearse the demo, write the video script | Under-3-min dry run |
| 14 | Mon Nov 10 | Record and edit the video, upload to YouTube (public). Draft the Devpost text | Video live |
| 15 | Tue Nov 11 | Freeze code by 8 PM PT. Final hosted run. Submit the Devpost form (it can be edited until the deadline) | Submitted |
| — | Wed Nov 12 | Buffer only. Deadline 12:00 PM PT | — |

Days 11–13 are slack: if anything P0 slips, it eats these days first.

## 15. Cut list (in order, if behind)

1. NL ledger filter (FR-29)
2. AI reminder drafting (FR-16)
3. Drag to reschedule (FR-6)
4. Health page (FR-33)
5. Playwright E2E (keep unit tests and the smoke script)
6. Clarifying questions UI (FR-11). Keep the field in the schema and just don't render it.

**Never cut:** the decline-and-retry demo, the pre-payout checks, the real sandbox invoice, the payout batch, the reset button, the LICENSE and the README.

## 16. Demo video script (target 2:40)

| Time | Shot | Voice-over gist |
|---|---|---|
| 0:00–0:20 | Real freelancer quote on screen, then the cockpit | "Scope creep is unpaid work. Here's an agency's project where the money and the schedule actually talk." |
| 0:20–0:50 | Paste the client message, then AI items with source quotes | "Gemini turns a casual message into priced scope items. Code does the pricing, not the model." |
| 0:50–1:10 | Edit hours, see the schedule preview, create the invoice, show the `INV2-` ID, tasks lock | "A real PayPal invoice goes out, and the new work stays locked until it's paid." |
| 1:10–1:45 | Pay page: declined card (mock), then retry succeeds | "We test the unhappy path: a declined card, recovered without losing the order." |
| 1:45–2:15 | Tasks unlock, payout checks go green, batch SUCCESS | "Payment unlocks the work. Six deterministic checks, then PayPal Payouts splits the money across the team." |
| 2:15–2:35 | Ledger, architecture slide (PayPal APIs, AI, open-source stack) | "Invoicing, Orders, JS SDK v6 and Payouts, on a $0 open-source stack." |
| 2:35–2:40 | URL and repo | — |

Record at 1080p with OBS Studio, edit in Shotcut (both free and open source). Use no copyrighted music.

## 17. Definition of done

- [ ] Every P0 requirement in prd.md works on the hosted URL from a cold start
- [ ] `npm test` passes, and the smoke script passes against the sandbox
- [ ] No secrets in git history (`git log -p | grep -i secret` is clean, and `.env` is gitignored)
- [ ] README lets a stranger run the app locally with their own sandbox keys and Gemini key
- [ ] LICENSE (MIT) at the root and detected by GitHub
- [ ] Video under 3:00, public on YouTube, linked on Devpost
- [ ] Devpost form complete, including the Tools section, before Nov 12, 12:00 PM PT
