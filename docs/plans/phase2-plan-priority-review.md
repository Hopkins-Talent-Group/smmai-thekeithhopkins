# Phase 2 Plan Priority Review

> **Scope:** all planning documents in `docs/` (`docs/plans/**` + `docs/architecture/**`)
> **Question:** which plans are most needed for Phase 2 development?
> **Reviewed:** 2026-10-02 against `dev` @ `394638d`
> **Method:** each plan was cross-checked against the actual code (routes, components, Prisma schema, Python package) — plan status labels are not trusted at face value.

---

## 0. What "Phase 2" means here (and the ambiguity)

There are three different "Phase 2" labels in this repo. This review uses **definition A**, because it is the one backed by the `docs/` tree the request targets.

| Definition | Source | Meaning |
|---|---|---|
| **A (used here)** | `README.md` roadmap, `docs/architecture/phase2-linkedin-x.md`, `docs/architecture/phase2-integration-contract.md`, `docs/architecture/system-architecture-upgrade.md` §Delivery sequence | **LinkedIn + X adapters**, OAuth/token lifecycle, outbox/worker reliability, per-platform moderation, cross-platform scheduling |
| B | `vercel-fix-v4.md` §Phase 2 | "Make data real" — dashboard persistence hardening |
| C | `PYTHON_TO_WASM_MIGRATION_PLAN.md` §Phase 2 | Rust/WASM JavaScript interop |

If you meant B or C, the ordering changes — see §7.

---

## 1. Plan inventory

### `docs/plans/` (17 files)

| Group | Files |
|---|---|
| Master | `master-dashboard-plan-v1.md` |
| Header / layout | `plan-site-nav.md`, `plan-dashboard-header.md`, `plan-dashboard-shell-sidebar.md` |
| Provisions (12) | `plan-provision-overview.md`, `-approval-gate.md`, `-draft-library.md`, `-content-calendar.md`, `-clients.md`, `-pipeline.md`, `-analytics.md`, `-guardrails.md`, `-automation.md`, `-accounts.md`, `-settings.md`, `-audit-log.md` |
| Provisions with **no** plan | `inbox` (nav-reserved), `graph` (dev-only) |
| Landing sections (no plans) | Hero, Workflow, Architecture, Highlights, Security, Roadmap, CTA, SiteFooter |
| Shared UI (no plans) | Button, StatusPill, PhaseBadge, ArchCard, DashboardCard, SkeletonCard, UserMenu, WorkspaceSwitcher, GraphExplorer |

### `docs/architecture/` (7 files)

`ai-automation-architecture.md`, `mvp-implementation.md`, `system-architecture-upgrade.md`, **`phase2-linkedin-x.md`**, **`phase2-integration-contract.md`**, `phase3-tiktok-youtube.md`, `phase4-analytics-loop.md`.

The two bolded files are the actual Phase 2 specifications; the `docs/plans/*` files are the UI/dashboard execution plans that Phase 2 work will be built against.

---

## 2. Reality check — plan labels vs. code

The master plan reports "36 items · 32 not started · 4 in progress". That understates what already exists and overstates what is ready. Verified deltas:

| Plan | Plan label | Actual state (verified) |
|---|---|---|
| `plan-provision-approval-gate` | 🔴 Not started | **~70% built.** `ApprovalQueue.tsx` (186 L) + `ContentDraftCard.tsx` (113 L) + `PATCH /api/crm/drafts`. Missing: revision notes, batch approve, approval history, inline moderation, DRY_RUN labelling |
| `plan-provision-pipeline` | 🔴 Not started | **Built.** `PipelineBoard.tsx` (335 L) + `/api/crm/pipeline` (297 L), rendered by `dashboard/page.tsx` |
| `plan-provision-analytics` | 🔴 Not started | **Partially built.** `AnalyticsCards.tsx` + `/api/analytics` (131 L) + `/api/engagement` (87 L) |
| `plan-provision-guardrails` | 🔴 Not started | **Partially built.** `BrandProfileCard.tsx` + `GET/PUT /api/crm/brand` |
| `plan-provision-automation` | 🔴 Not started | **Backend built.** `/api/automation` (135 L) + `/api/crm/status` + Redis queue/DLQ in `lib/queue.ts`; UI is a placeholder |
| `plan-provision-clients` | 🟡 In progress | **Largely built.** `ClientsTable` (578 L), `ClientForm` (502 L), full CRUD API |
| `plan-provision-overview` | 🟡 In progress | `CommandCenter.tsx` (73 L) + `/api/crm/overview` returns counts; no KPI trends, no activity feed |
| `plan-provision-accounts` | 🔴 Not started | **Correct.** No OAuth routes, no account UI, `secrets.ts` + `IntegrationConnection` exist unused |
| `plan-provision-audit-log` | 🔴 Not started | **Correct, and worse than it looks** — the `AuditLog` model has **zero writers** anywhere in `src/` |
| `plan-provision-settings` | 🔴 Not started | Backend `/api/settings` (144 L) exists; UI is a placeholder note |
| `plan-provision-draft-library` | 🔴 Not started | `ContentDraftCard` exists but `/api/crm/drafts` fetches all rows then filters in memory — no pagination, search, or sort |
| `plan-provision-content-calendar` | 🔴 Not started | Correct — renders "Coming soon" |

**Phase 2 contract coverage (this is the real scoreboard):**

| Contract requirement | Status |
|---|---|
| AuthN + workspace scoping | ✅ implemented |
| Same-origin + body limit + rate limit | ✅ `lib/security.ts` |
| `Idempotency-Key` + durable replay | ✅ `/api/crm/publish` + `IdempotencyRecord` |
| Approved-draft-only publish, 202 + queue | ✅ |
| Redis outbox + dead-letter | ✅ `lib/queue.ts` |
| Token encryption primitives | ⚠️ `lib/secrets.ts` (AES-256-GCM) exists, **no caller** |
| OAuth connect / callback / disconnect | ❌ **absent** |
| `GET /api/accounts`, refresh, capabilities | ❌ **absent** |
| LinkedIn / X webhook endpoints | ❌ only `/api/webhooks/meta` |
| Provider error classification to queue policy | ⚠️ per-adapter only, not wired to queue |
| DRY_RUN enforced in the Next.js publish path | ❌ **bug** — `after()` marks drafts `published` regardless |
| Phase 2 test matrix (13 cases) | ❌ `tests/test_platform_contract.py` only asserts capability presence |
| LinkedIn/X adapters | ⚠️ Python stubs, dry-run only; `AdapterFactory` keys on `"twitter"`, contracts normalize to `"x"` |
| Worker is Meta-only | ❌ `src/smm/publishing/worker.ts` hardcodes `MetaAdapter`, hardcodes brand, hardcoded statuses `"REJECTED"`/`"PUBLISHED"` (schema enums are lowercase) |

Evidence note: the dashboard already renders some sections whose plans claim "Not Started" (PipelineBoard, AnalyticsCards, BrandProfileCard), while `verbatim` Phase 2 plumbing — OAuth, `/api/accounts`, `encryptSecret` callers, LinkedIn/X webhooks — does not exist anywhere in `src/`.

---

## 3. Tier 0 — build first (Phase 2 cannot start without these)

Ordered by dependency, not by plan file size.

### 3.1 `plan-provision-accounts.md` — the critical path (rank #1)

**Why first:** Phase 2 *is* "connect LinkedIn + X". Everything in `phase2-integration-contract.md` (provider lifecycle §1–9, OAuth/account endpoints, capability discovery, encrypted credential storage, disconnect semantics) lands here. Today there is no connect button, no callback, no account list — only unused primitives (`IntegrationConnection` model, `lib/secrets.ts` AES-256-GCM with zero callers, `PLATFORM_CAPABILITIES` with `phase: 2` flags in both TS and Python).

**What to build (additive to the existing plan):**
1. `GET /api/integrations/{platform}/connect` → state-bound authorization URL (contract: single-use, short-lived, workspace-bound, random state).
2. `GET /api/integrations/{platform}/callback` → server-side code exchange, encrypt tokens with `encryptSecret`, persist to `IntegrationConnection` (status/scopes/`tokenExpiresAt`/`externalAccountId`/metadata). Never return ciphertext to the browser.
3. `POST /api/integrations/{platform}/disconnect` → purge credentials + invalidate queued jobs for that account (contract step 9).
4. `GET /api/accounts`, `POST /api/accounts/{id}/refresh`, `GET /api/accounts/{id}/capabilities` — health + capability exposure, **never tokens**.
5. `SocialAccountsManager` UI + per-platform connect cards + token-expiry warnings + webhook event log (plan items; wire to the routes above).
6. **Fix the naming split now:** `AdapterFactory.get_adapter("twitter")` vs `contracts.normalize_platform("twitter") → "x"` vs `platforms.ts` carrying both `"x"` and `"twitter"`-alias. One canonical key per provider before a second adapter is wired in — otherwise Phase 2 multiplies the ambiguity.

**Acceptance tie-in:** the contract's "production gates" (§Production gates) become the plan's Definition of Done: OAuth OK → scopes OK → account discovery OK → capability discovery OK → expiry metadata persisted → dry-run contract test passes → webhook verification configured.

### 3.2 `plan-provision-approval-gate.md` — harden, don't rebuild (rank #2)

**Why second:** the delivery sequence says security/auth foundation *before* adapters, but the approval gate is the product's safety invariant ("no autonomous publish path") and Phase 2 adds two new publishers behind it. The queue mechanics exist (`ApprovalQueue` + `PATCH /api/crm/drafts` + `/api/crm/publish` 202+queue); what is missing is exactly what the plan lists and Phase 2 needs for *approved-content revision mismatch* (test-matrix item):
- revision-requested flow + rejection notes (today PATCH takes only `{id, status}`),
- per-draft approval history (the `ContentRevision` model exists — unused),
- moderation violations surfaced inline from `ModerationService`,
- batch approve,
- the **DRY_RUN bug fix**: `publish/route.ts` `after()` marks drafts `published`/`SUCCEEDED` unconditionally. In dry-run it must record a simulated result, not a live one. Related: `ContentDraftCard` "Queue for publishing" label is shown regardless of `DRY_RUN` — needs a `dryRun` flag on `/api/crm/status` and a "Simulate" affordance per the master plan's Critical Rules box.

### 3.3 `plan-provision-automation.md` — promote P1 → P0 (rank #3)

**Why third:** the contract requires queue handoff, retry, and dead-letter behavior per provider, and *production* publishing "should use a durable job runner" (`mvp-implementation.md`). The backend exists (`lib/queue.ts` ZSET+DLQ, `/api/automation`, `publish?action=stats`) but: `automation/route.ts` returns hardcoded `queueLength: 0` and stub POST/PATCH actions that return success without touching state; `worker.ts` is a Meta-only hardcoded loop with a demo `BrandProfile` and wrong-status writes. Phase 2 work here:
- real queue-depth/failure DLQ surfacing,
- provider-aware worker dispatch (LinkedIn/X alongside Meta) with `classify_error()` → retryable vs terminal mapping,
- disconnect invalidating queued work (contract step 9),
- publish status lookup per job (the contract's publish-status capability).

### 3.4 `plan-provision-audit-log.md` — promote P1 → P0 (rank #4)

**Why fourth:** it is cross-cutting Phase 2 evidence, not a nice-to-have. The contract demands audit on lifecycle transitions, disconnects, and webhook deliveries; the approval-gate plan's own acceptance criteria require an audit entry per approve/reject. Current state: `AuditLog` model exists and **nothing writes to it**. Build the writer helper + immutable event emission on: approvals, rejections, publishes, connects/disconnects, settings changes, logins, API-key ops. Minimum viable viewer can follow the writers — events without a reader are still auditable; a reader without events is decoration.

---
## 4. Tier 1 — needed to make Phase 2 shippable

### 4.1 `plan-provision-settings.md` (rank #5)

The plan's AI Provider + `DRY_RUN` + workspace tabs are the control surface the Phase 2 gates assume: which provider credentials exist, whether the workspace is in simulate mode, notification rules for approval/publish-failure events. The `/api/settings` route exists (144 L) with GET/POST/PATCH; the UI is a placeholder. Trim out-of-scope items from the plan (Billing, 2FA are not in the schema) and ship: profile/workspace, AI provider switch, **server-authoritative `DRY_RUN` toggle with typed confirmation**, notification rules, settings-change audit (feeds §3.4).

### 4.2 `plan-provision-guardrails.md` (rank #6)

`phase2-linkedin-x.md` keeps "shared moderation rules … across all platforms" but each platform needs its own constraints (X length limits, LinkedIn article vs post shape, URL/media rules). The plan already proposes per-platform rules + the `PolicyTestPanel` — that is exactly the Phase 2 moderation ask. Backend (`ModerationService`, `BrandProfile` model, brand route) is ~60% there; `BrandProfileCard` is 79 L — the test panel and platform-rule scoping are the delta.

### 4.3 `plan-provision-draft-library.md` + `plan-provision-content-calendar.md` (rank #7, tied)

Both are day-two Phase 2 surfaces: once LinkedIn/X drafts exist, editors need filtering by the new platforms plus the plan's "Duplicate for another platform" action, and the calendar's per-platform scheduling density. Two API prerequisites first: server-side filtering/pagination/search on `/api/crm/drafts` (today: fetch-all-then-filter in memory) and `?from=&to=` date-range filtering. Build the draft-library upgrade before the calendar — the calendar reads the same query surface.

### 4.4 `plan-dashboard-shell-sidebar.md` + `plan-dashboard-header.md` (rank #8)

Keep at plan P0 but scope to Phase 2 needs: live Approval Gate pending-count badge (drives the gate's urgency), account-health degradation signal in the shell (drives re-auth), breadcrumb + user/work menu, tokens from `tokens.css`. Defer the polish half (collapsed mode, keyboard arrow nav, mobile drawer variants, Lucide swap, global search) until the Tier 0 surfaces exist — a prettier shell around "Coming soon" placeholders is negative progress.

### 4.5 `plan-provision-overview.md` (rank #9)

The Command Center is the default view and already wired (`/api/crm/overview` counts). For Phase 2 it needs exactly two additions: account-health + failed-job surfacing (the contract's operability story) and the 30s/60s refresh cadence. Full KPI trends and activity feed can wait — they consume analytics ingestion that belongs to Phase 4.

---



## 5. Tier 2 — explicitly defer past Phase 2

| Plan | Verdict |
|---|---|
| `plan-provision-analytics.md` | **Charts defer; adapter plumbing doesn't.** Trend charts, per-client tables, CSV/PDF export are Phase 4 loop work. Phase 2 only needs LinkedIn/X normalized analytics *fetch* on the adapter side feeding `AnalyticsSnapshot`. |
| `plan-provision-clients.md` | **Finish opportunistically, don't prioritize.** Table + form + full CRUD already built; add health score + detail panel as filler work between Tier 0 items. |
| `plan-provision-pipeline.md` | **Defer.** Sales Kanban is not on the Phase 2 publish path. Also: fix the plan's stale "Not Started" — the board + 297 L route already exist. |
| `plan-site-nav.md` + 7 landing sections + `SiteFooter` | **Defer.** Marketing surface; zero Phase 2 dependency. |
| Shared UI (`Button`, `StatusPill`, `DashboardCard`, `SkeletonCard`, `UserMenu`, …) | **Build only on demand** from Tier 0/1 plans (loading skeletons for the accounts/automation lists, status pills for new connection states). |

## 6. Missing plans — write these before building Phase 2

1. **Provider OAuth & token lifecycle plan** — the contract's OAuth/Accounts sections have no corresponding `docs/plans` file; the accounts plan references endpoints never specified for this codebase (state format, encryption envelope, refresh scheduling, scope registry). A 1-page plan prevents three different implementations.
2. **LinkedIn/X webhook ingestion plan** — signature verification + dedupe pattern exists for Meta only; LinkedIn and X each need their own verifier specified (formats differ).
3. **Phase 2 test-matrix plan** — the 13 contract cases (state replay, token rotation, scope gaps, 401/403/429/5xx mapping, duplicate publish/webhook, signature tampering, cross-workspace IDs, oversized bodies, rate-limit exhaustion, retry/DLQ, revision mismatch, disconnect-with-queued-jobs) should become a tracked checklist wired into `pytest` + route tests, starting from the near-empty `test_platform_contract.py`.
4. **`inbox` provision plan** — nav-reserved with no plan *and* no Prisma model (`Conversation`/`Message` don't exist). Correctly out of Phase 2, but record the gap so nobody treats the nav item as "planned".
5. **Plan hygiene fixes:** audit-log plan references non-existent `pages/api/audit.ts` (App Router project — should be `src/app/api/audit/route.ts`); pipeline/analytics/guardrails/automation statuses are stale (components exist); master-plan progress table (32/36 not started) needs recounting after this review.

## 7. If you meant a different "Phase 2"

- **vercel-fix-v4.md §Phase 2 ("Make data real"):** order becomes audit-log writers → drafts server-side querying → automation stubs (`queueLength: 0`, fake success POSTs) → settings persistence → publish DRY_RUN bug. Accounts/OAuth drops to Tier 1.
- **WASM migration §Phase 2 (JS interop):** order becomes analytics provision (client-side metric rendering is its consumer) → engagement route → draft-library edit panel. Unrelated to adapters.

## 8. Recommended Phase 2 build sequence

```
1. accounts (OAuth + /api/accounts + naming fix) ─┐
2. audit-log writers (emit on every Tier-0 action) │ Tier 0
3. automation (real queue/DLQ + provider dispatch) ┘
4. approval-gate hardening (notes, history, batch, DRY_RUN)
5. LinkedIn/X adapter + webhook plan items (contract gates as DoD)
6. settings (DRY_RUN control) + guardrails (per-platform rules)
7. draft-library querying → calendar range filters
8. shell/header Phase-2-scoped items (badges, health signal)
9. test-matrix checklist → green
── Phase 2 exit = contract production gates pass for linkedin + x ──
10. analytics charts, pipeline polish, landing sections (Phase 3/4 territory)
```

**One-line summary:** build `accounts` first (it *is* Phase 2), promote `automation` and `audit-log` to P0 (the contract requires them, both are backend-nearly-there), harden `approval-gate` for multi-provider publishing, and defer analytics/pipeline/landing work. Fix the `twitter`/`x` naming split and the publish-path `DRY_RUN` bug before either new adapter goes live.
