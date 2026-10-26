# Phase 2 Test Matrix

> **Contract source:** [`phase2-integration-contract.md`](../architecture/phase2-integration-contract.md) §Phase 2 test matrix
> **Implementation:** `nextjs-setup/nextjs-dashboard/src/app/api/integrations/**`, `src/app/api/accounts/**`, `src/app/api/webhooks/[platform]/route.ts`, `src/lib/integrations.ts`, `src/lib/audit.ts`
> **Status legend:** ✅ covered by an automated test · 🟡 covered by route logic + manual check · ⬜ planned

This checklist is the Phase 2 exit gate. A provider is not "connected for
publishing" until every row below is satisfied.

## Automated (runnable in CI today)

| # | Case | Where | Status |
|---|---|---|---|
| 1 | Legacy `twitter` normalizes to canonical `x` | `tests/test_platform_contract.py::test_platform_aliases_are_normalized` | ✅ |
| 2 | Adapter factory resolves `x`, `twitter`, and ` Twitter ` to the same adapter | `tests/test_platform_contract.py::test_adapter_factory_uses_canonical_x_key` | ✅ |
| 3 | X adapter emits the canonical platform and honours dry-run | `tests/test_platform_contract.py::test_x_adapter_emits_canonical_platform` | ✅ |
| 4 | Phase 2 capability entries exist (linkedin, x) | `tests/test_platform_contract.py::test_phase_two_platforms_are_present` | ✅ |
| 5 | Live publish still requires approval after adapter dispatch change | `tests/test_publishing.py::test_live_publish_requires_human_approval` | ✅ |
| 6 | Moderation runs before any adapter call | `tests/test_publishing.py::test_moderation_runs_before_publish` | ✅ |

Run with:

```bash
python -m pytest tests/ -q
```

## Route-level (implemented; assert with an authenticated request harness)

| # | Case | Route / mechanism | Status |
|---|---|---|---|
| 7 | OAuth state mismatch rejected | `consumeOAuthState` → 400 `OAuth state mismatch` | 🟡 |
| 8 | OAuth state workspace mismatch rejected | `consumeOAuthState` compares `payload.workspaceId` → 400 | 🟡 |
| 9 | OAuth state replay / expiry rejected | single-use + 10-minute `issuedAt` window → 400 `OAuth state expired` | 🟡 |
| 10 | OAuth state platform mismatch rejected | callback compares `payload.platform !== provider` | 🟡 |
| 11 | Missing scope → 403 | `providerErrorResponse` maps `scope`/`forbidden` → 403 | 🟡 |
| 12 | Expired/rotated token surfaced | `POST /api/accounts/{id}/refresh` → `REAUTH_REQUIRED` + `account.refresh_failed` audit | 🟡 |
| 13 | Provider 401 / 403 / 429 / 5xx mapping | `providerErrorResponse` → 401 / 403 / 429 / 502 | 🟡 |
| 14 | Duplicate publish request replays | `Idempotency-Key` + `IdempotencyRecord` → `Idempotent-Replay: true` | 🟡 |
| 15 | Duplicate webhook delivery deduped | `WebhookEvent.platform_eventId` unique → `{status:"duplicate"}` | 🟡 |
| 16 | Webhook signature tampering rejected | HMAC `timingSafeEqual` → 401 + `webhook.rejected` audit | 🟡 |
| 17 | Cross-workspace resource ID rejected | every route filters by `session.payload.workspaceId` → 403/404 | 🟡 |
| 18 | Oversized request body rejected | `readJsonWithLimit` / 1 MiB webhook cap → 413 | 🟡 |
| 19 | Rate-limit exhaustion returns `Retry-After` | `checkRateLimit` → 429 (`503` when Redis down in prod) | 🟡 |
| 20 | Queue retry + dead-letter behavior | `lib/queue.ts` failure counter ≥5 → DLQ | 🟡 |
| 21 | Approved-content revision mismatch rejected | `POST /api/crm/publish` requires `status === "approved"` → 409 | 🟡 |
| 22 | Disconnect invalidates queued work | `POST /api/integrations/{platform}/disconnect` cancels PENDING/RUNNING jobs | 🟡 |
| 23 | DRY_RUN never marks a draft published | `publish/route.ts` records `draft.simulated` and restores `approved` | 🟡 |
| 24 | Tokens never returned to the browser | `publicConnectionShape` whitelists fields; ciphertext excluded | 🟡 |

## Promotion path

Rows 7–24 currently rely on route logic rather than an executed suite. To
promote them to ✅, add a Next.js test runner (Vitest or the Node test runner)
wired to `next build` output, seed a workspace + session cookie, and assert the
status codes above. That is the remaining Phase 2 testing work; the route
behavior it must lock in already exists.

## Production gates (from the contract)

A provider is not marked connected for publishing until all of these hold:

- OAuth exchange succeeds
- required scopes are present
- account discovery succeeds
- capability discovery succeeds (`GET /api/accounts/{id}/capabilities`)
- token expiry/refresh metadata is persisted (`tokenExpiresAt`, encrypted refresh token)
- a dry-run publish contract test passes
- webhook verification is configured where supported