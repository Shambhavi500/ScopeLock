# ScopeLock — Product Requirements Document

**Hackathon:** Build What's Next with PayPal and AI (Devpost)
**Submission deadline:** Nov 12, 2026, 12:00 PM PT (20:00 UTC). Internal code freeze: Nov 11, 8:00 PM PT.
**Judging:** Dec 1–15, 2026. The hosted demo must stay live until winners are announced (~Dec 21).
**Status:** Draft v1, Oct 27, 2026
**Companion doc:** [implementation.md](implementation.md)

---

## 1. One-liner

ScopeLock turns a client's messy "can you also add…" message into a priced, schedule-aware PayPal invoice. It locks the next phase of work until the milestone is paid, then splits the payment out to the contractors who did the work.

## 2. Problem

Small agencies and freelance collectives hit the same three problems on every project:

1. **Scope creep goes unbilled.** Clients ask for extra work in chat or email ("quick tweak", "one more page"). Nobody turns it into a priced change order, so the agency does it for free or argues about it later.
2. **Work continues while invoices sit unpaid.** Teams keep working on phase 3 while the phase 2 invoice is overdue. The schedule and the money don't talk to each other.
3. **Paying contractors is manual.** Once the client pays, the lead works out each contractor's share in a spreadsheet and sends payments one by one.

Existing tools split this across a project tool (Jira, Asana), a time tracker, an invoicing tool and a payouts step. None of them connects "what was asked for" to "what was billed" to "what was paid out".

> Validation task: before the video, collect 2–3 real quotes from freelancers or agency owners (Reddit r/freelance, friends, LinkedIn) about unpaid scope creep. Use them in the video's opening. Don't use statistics we can't cite.

## 3. Target users

| Persona | Who | What they need |
|---|---|---|
| **Agency lead** (primary) | Runs a team of 2–10 contractors on fixed-price, milestone-based projects | Bill scope changes fast, stop work when payment is late, pay the team without spreadsheets |
| **Client** | The business buying the project | A clear itemised change order, and an easy way to pay |
| **Contractor** | Designer or developer on the agency's team | Get paid their share as soon as the client pays, with a record of what for |

The demo uses one seeded project: *"Acme Bakery — e-commerce site"*, with 3 milestones and 3 contractors.

## 4. Goals and non-goals

### Goals
- G1. Show a complete, working, end-to-end money flow in the PayPal **sandbox**: change request → invoice → client payment → contractor payouts.
- G2. Use AI where it does real work: turning unstructured client text into structured, reviewable scope items.
- G3. Make the schedule reflect the money: unpaid milestones visibly lock downstream work.
- G4. Never let AI move money on its own. Every payment action needs a human click and passes deterministic checks.
- G5. Spend $0. Use only open-source libraries and free tiers.
- G6. Give judges something they can open and click through in under 3 minutes with no setup.

### Non-goals
- Real money or live PayPal credentials. Sandbox only.
- Multi-tenant accounts, sign-up or login. It's a single demo workspace.
- Full project-management features (comments, file uploads, sprints).
- Time tracking. Hours are estimates from the change request, not tracked time.
- Mobile-first design. The dashboard is desktop-first but must not break on a laptop screen.
- Integrations with Slack, GitHub or email inboxes. Pasting text is the input.

## 5. Hackathon fit

### Judging criteria
| Criterion | How ScopeLock scores |
|---|---|
| **Technological implementation** | Four PayPal surfaces working together (Invoicing v2, Orders v2, JS SDK v6, Payouts v1), done properly: server-side secrets, token caching, `PayPal-Request-Id` idempotency, forced-failure testing with `PayPal-Mock-Response`. AI output is validated against a schema with a fallback. |
| **Design** | One coherent cockpit: timeline, change request panel, ledger, payouts. Not a chat box. |
| **Potential impact** | A specific, common pain for a specific audience (small agencies and freelancers), shown solving it end to end. |
| **Innovation** | Ties the billing state to the schedule. Payment status drives which work is unlocked. |
| **Presentation** | The demo follows one story start to finish, including a declined card and recovery on camera. |

### Prize targets
- Primary: 1st–3rd place overall. Fallbacks: Best Use of PayPal + AI, Most Impactful.
- Sponsor (one allowed per project): **Best Use of AG Grid**, using AG Grid Community (MIT). See open question Q1.
- Bonus: Best Use of Render (hosting credits), since the app is deployed on Render's free tier.

## 6. Core user flow (the demo story)

1. **Dashboard.** The agency lead opens the Acme Bakery project. The timeline shows Milestone 1 (Design) paid and done, Milestone 2 (Build) in progress, and Milestone 3 (Launch) locked.
2. **Paste a change request.** The lead pastes a client message, e.g. *"Love it! Can we also add a gift-card page and make the menu filterable by allergens? Need it before the holiday launch."*
3. **AI extraction.** The AI returns structured items: "Gift-card page — 10h — dev", "Allergen filter — 6h — dev", "QA for new features — 3h — qa". Each item comes with the quote it came from and a confidence score, plus a flag for whether it was in the original scope.
4. **Review and edit.** The lead adjusts hours, removes an item, and sees the price recalculated by code from the project's rate card. The timeline previews how far the new work pushes the dates.
5. **Create change-order invoice.** One click creates and sends a real PayPal sandbox invoice (`INV2-…`) to the client. The new tasks appear on the timeline, locked behind that invoice.
6. **Client pays.** The client opens the pay page and pays with the PayPal button (JS SDK v6, sandbox buyer account).
   - *Unhappy path, on camera:* with "Simulate declined card" on, capture fails with `INSTRUMENT_DECLINED`. The app explains what happened and lets the client retry with a different funding source. The retry succeeds.
7. **Unlock.** Payment is captured and recorded against the invoice. The locked tasks unlock on the timeline. The ledger row turns to "Paid".
8. **Pre-payout checks.** The lead opens Payouts. A checklist shows each rule passing (payment captured, amount matches, split adds up, not already paid out, under the payout cap).
9. **Pay the team.** One click sends a PayPal Payouts batch to the three contractor sandbox accounts. Status moves from Pending to Success. Each payout is shown in the ledger.
10. **Ledger.** The AG Grid ledger shows every invoice, payment and payout, filterable and sortable, with totals.

## 7. Functional requirements

Priority: **P0** = must work in the demo; **P1** = should have; **P2** = only if time allows.

### 7.1 Project and timeline
| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Seed a demo project with 3 milestones, ~12 tasks, 3 contractors, a rate card (USD per hour by role) and a payout split | P0 |
| FR-2 | Show tasks on an interactive Gantt timeline (SVAR React Gantt), grouped by milestone, with dependencies | P0 |
| FR-3 | Tasks in a phase behind an unpaid milestone invoice are **locked**: greyed out, lock icon, read-only, with a tooltip naming the blocking invoice | P0 |
| FR-4 | When a milestone invoice is paid, its locked tasks unlock with a visible state change | P0 |
| FR-5 | Adding approved scope items inserts new tasks and shifts dependent tasks by the added duration, computed in code | P0 |
| FR-6 | Drag to reschedule tasks. Locked tasks can't be moved | P1 |

### 7.2 Scope change intake (AI)
| ID | Requirement | Priority |
|---|---|---|
| FR-7 | A text box to paste a client message (max 4,000 characters) | P0 |
| FR-8 | AI turns the text into structured items: title, description, estimated hours, role, in-original-scope flag, confidence, and the source quote | P0 |
| FR-9 | AI output is validated against a strict schema. If it's invalid, retry once, then fall back to the rule-based extractor, and label the result "fallback" | P0 |
| FR-10 | The lead can edit, add or remove items before approving. Prices are recalculated live from the rate card | P0 |
| FR-11 | AI lists clarifying questions for the client when the request is ambiguous | P1 |
| FR-12 | Three one-click sample client messages for judges (simple, ambiguous, out-of-scope plus deadline) | P0 |

### 7.3 Invoicing (PayPal Invoicing v2)
| ID | Requirement | Priority |
|---|---|---|
| FR-13 | Approving a change order creates a PayPal sandbox invoice with one line item per scope item (hours × rate), a due date and a note, then sends it to the client's sandbox email | P0 |
| FR-14 | Show the invoice number, status and PayPal invoice link in the UI | P0 |
| FR-15 | Milestone invoices for the seeded milestones (Milestone 2 starts unpaid) | P0 |
| FR-16 | "Send reminder": AI drafts a polite reminder, the lead edits it, and it's sent with PayPal's invoice remind API | P1 |
| FR-17 | Sync status: if the client pays through PayPal's own invoice page, polling picks it up | P2 |

### 7.4 Client payment (Orders v2 + JS SDK v6)
| ID | Requirement | Priority |
|---|---|---|
| FR-18 | Pay page for an invoice: line items, total, and the PayPal button (JS SDK v6, sandbox) | P0 |
| FR-19 | Orders are created and captured **on the server only**. The order carries the invoice number in `invoice_id` | P0 |
| FR-20 | After capture, record the payment on the PayPal invoice so it shows as paid in PayPal too | P0 |
| FR-21 | "Simulate declined card" toggle on the pay page, using `PayPal-Mock-Response` to force `INSTRUMENT_DECLINED` on capture. The UI shows a clear message and a retry that works | P0 |
| FR-22 | A duplicate payment attempt for an already-paid invoice is blocked, with a clear message | P0 |

### 7.5 Contractor payouts (Payouts v1)
| ID | Requirement | Priority |
|---|---|---|
| FR-23 | Payout preview: each contractor's share from the project split, the agency's retained margin, and the total | P0 |
| FR-24 | Deterministic pre-payout checks shown as a checklist. Any failure disables the payout button (see 8.2) | P0 |
| FR-25 | Send a Payouts batch to contractor sandbox emails, using an idempotent batch ID tied to the invoice | P0 |
| FR-26 | Poll batch status until it settles, and show per-item status | P0 |

### 7.6 Ledger and activity
| ID | Requirement | Priority |
|---|---|---|
| FR-27 | AG Grid Community ledger of all invoices, payments and payouts: sort, filter, quick search, totals row, status badges | P0 |
| FR-28 | Activity timeline of every event (AI extraction, invoice sent, payment failed or captured, payout sent), each with its PayPal reference ID | P0 |
| FR-29 | Natural-language ledger filter, e.g. "unpaid invoices over $500". AI converts the text to an AG Grid filter model, which is validated before use | P1 |
| FR-30 | Export the ledger to CSV (Community feature) | P2 |

### 7.7 Demo operations
| ID | Requirement | Priority |
|---|---|---|
| FR-31 | The database re-seeds on every server boot, and a "Reset demo" button restores the seeded state | P0 |
| FR-32 | A "Judge guide" panel on first load: 5 numbered steps plus the sandbox buyer login | P0 |
| FR-33 | A health page showing whether PayPal auth and the AI provider are reachable | P1 |

## 8. AI and safety requirements

### 8.1 What the AI does and doesn't do
- **Does:** extract scope items from text, estimate hours, flag scope status, suggest client questions, draft reminders, and translate ledger questions into filters.
- **Doesn't:** set prices, choose payout amounts, call PayPal, or approve anything. Code computes money from the rate card and the split. A human clicks every payment action.
- Treat the pasted client message as **untrusted data**. The system prompt tells the model to ignore any instructions inside it. Output is limited to the schema, so injected text can't change anything.

### 8.2 Pre-payout checks (deterministic, code only)
1. The invoice is marked paid in our database **and** the PayPal capture status is `COMPLETED`.
2. The captured amount and currency equal the invoice total.
3. Contractor shares plus agency margin equal the captured amount, to the cent.
4. Every contractor has a valid sandbox payout email.
5. No previous payout batch exists for this invoice (idempotency).
6. Each item is under the per-payout cap (configurable, default $5,000).

### 8.3 Model and providers
- Model: **Google Gemini 2.5 Flash** (free tier via Google AI Studio), hosted, so nothing runs locally.
- Reached through Gemini's OpenAI-compatible endpoint with one client, configured by `GEMINI_API_KEY` and `GEMINI_MODEL`. Thinking is switched off for speed.
- If the provider is down or rate-limited, the rule-based fallback keeps the demo working, and the UI says so.

## 9. Non-functional requirements

| Area | Requirement |
|---|---|
| Cost | $0. Only open-source libraries and free tiers (see the stack in implementation.md) |
| Security | PayPal and AI secrets live only on the server. Nothing secret is in client code or the repo. `.env.example` has no real values. Sandbox only |
| Reliability | Every PayPal write uses `PayPal-Request-Id`. The demo still runs with the AI provider offline (fallback) |
| Performance | AI extraction takes under 10 s at p95 on Gemini. Pages are interactive in under 3 s once the server is awake |
| Cold start | Render free tier sleeps after 15 min idle and takes about 1 min to wake. The README and the Devpost text tell judges to expect it |
| Accessibility | Keyboard-reachable controls, visible focus, colour is never the only status signal (icons and text too), WCAG AA contrast |
| Licensing | MIT `LICENSE` at the repo root, visible in GitHub's About section. Every dependency has an OSI-approved license |
| Data | Only fake data. No real personal or financial information anywhere |

## 10. Screens

1. **Project cockpit (main):** header with project name, milestone status chips and a reset button. Left: Gantt timeline. Right: tabbed panel (Change request, Invoices, Payouts). Bottom: ledger grid.
2. **Change request panel:** paste box, sample-message buttons, "Analyze" button, editable items table with live price, timeline preview, "Create invoice" button.
3. **Client pay page** (`/pay/[invoiceId]`): line items, total, PayPal button, "Simulate declined card" toggle (clearly labelled as a demo control), result state.
4. **Payouts panel:** split preview, pre-payout checklist, "Pay contractors" button, per-item status.
5. **Activity drawer:** event list with timestamps and PayPal reference IDs.
6. **Judge guide modal:** first-visit walkthrough.

## 11. Success criteria (demo acceptance)

The submission is ready when all of these work on the **hosted** Render URL, from a fresh boot:
- [ ] Pasting a sample message gives valid structured items (AI or fallback) in under 10 s
- [ ] Approving creates a real sandbox invoice whose `INV2-` ID and status appear in the UI
- [ ] The new tasks show up locked on the timeline
- [ ] The declined-card simulation fails cleanly, and the retry succeeds
- [ ] After capture, the tasks unlock and the invoice shows paid in PayPal sandbox
- [ ] All pre-payout checks pass, and the payouts batch reaches SUCCESS for all 3 contractors
- [ ] The ledger shows the invoice, the payment and 3 payouts with matching totals
- [ ] "Reset demo" restores the starting state
- [ ] The whole flow takes under 3 minutes for a first-time user following the judge guide

## 12. Out of scope (explicitly)

Authentication, multiple projects or users, real email sending (PayPal sandbox handles invoice emails), Slack or GitHub ingestion, subscriptions, disputes, Bryntum or any paid component, AG Grid Enterprise features (row grouping, pivoting).

## 13. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Payouts not enabled on the sandbox business account | Breaks step 9 | Test a $1 payout on Day 1. If it fails, enable Payouts in the developer dashboard or create a new sandbox business account |
| JS SDK v6 API differs from our notes | Delays checkout | Build from PayPal's official v6 sample on Day 1, before writing app code |
| Gemini rate limits or outage during judging | AI step fails | Rule-based fallback, plus a cached extraction for each sample message |
| Gemini returns fenced or invalid JSON | Parse errors | Strip code fences, validate with Zod, retry once, then fall back |
| Render cold start (~1 min) annoys judges | Bad first impression | Warn in README, the Devpost text and the video description. Keep the first page light |
| Render free disk is wiped on sleep | Lost state | By design: re-seed on boot and treat every visit as a fresh demo |
| SVAR Gantt free edition lacks a feature we want | UI gap | Lock styling and the date shift are our own code. Critical path and auto-scheduling aren't needed |
| AG Grid prize may require Enterprise | Lose the sponsor shot | Ask organisers (Q1). The ledger is still worth building for the Design score |
| Scope creep in our own build | Miss the deadline | Strict P0 list and the cut list in implementation.md |

## 14. Open questions

- **Q1.** Does "Best Use of AG Grid" accept AG Grid Community? Ask on the Devpost discussion board or by emailing the hackathon manager.
- **Q2.** Does JS SDK v6 sandbox checkout expect a client token or a client ID in `createInstance` for our case? The docs show both. Decide on Day 1 from the official sample.
- **Q3.** Are we a solo entry or a team? This changes how much P1 work fits.
- **Q4.** Confirm eligibility (age, country) for every team member on the Official Rules page.

## 15. Submission checklist (Devpost)

- [ ] Public GitHub repo, MIT `LICENSE` at root and shown in About
- [ ] README: what it is, architecture diagram, setup, sandbox test accounts (fake), how to run locally, hosted URL, cold-start note
- [ ] Hosted demo URL working (Render)
- [ ] Text description: problem, who it's for, features, how PayPal is used, how AI is used
- [ ] Tools section: Google Gemini 2.5 Flash, Vercel AI SDK, PayPal Invoicing v2, Orders v2, JS SDK v6, Payouts v1, AG Grid Community, SVAR Gantt, Render
- [ ] YouTube video under 3:00, public, no copyrighted music, showing the app working end to end
- [ ] Submitted before Nov 12, 12:00 PM PT
