# PR1 durable publish queue operations

## CI lint interpretation

The dashboard ESLint gate is deliberately split into two signals:

- **Blocking PR/push gate:** ESLint runs on changed dashboard JavaScript/TypeScript files only. A lint error in a changed file fails CI.
- **Repository-wide baseline:** `npm run lint` still runs and reports findings, but is marked advisory while legacy lint debt is triaged. Its advisory success/failure must not be described as a clean repository-wide lint result.
- **No blanket suppression:** do not add global ESLint disables, turn off rules across the app, or treat a green changed-file gate as proof that untouched files are clean. Fix legacy files in a separate scoped cleanup and restore a fully blocking repository-wide lint gate when the baseline is clean.

The 2026-10-26 CI run `40274742134` passed Python tests and the dashboard production build, then failed repository-wide ESLint with 27 errors and 10 warnings. The errors were spread across untouched analytics, logout, auth, CRM, engagement, webhook, and login UI files. The two `no-explicit-any` violations in the changed login route were removed without changing the session data or behavior. Re-run CI on the updated PR head; do not treat the historical run as validation of the fix.

## Redis requirements

- Redis 7.0 or newer is a hard requirement. Queue startup rejects older versions.
- Set `maxmemory-policy noeviction`. Evicting queue hashes, generation high-water marks, or dispatch evidence breaks recovery safety.
- Every publish-queue key uses the `{q:publish}` hash tag. Pending, processing, DLQ, quarantine, and every job hash therefore share one Redis Cluster slot. Queue sharding is a future scale-out option only; measure slot load before designing it.
- Lua uses Redis server `TIME` for lease comparisons and queue scheduling. It is not strictly monotonic under a backward NTP/system-clock adjustment.
- Before release, verify Redis persistence mode (RDB, AOF, or hybrid) and record the configured maximum data-loss window. That deployment setting is not established by this repository. The database result persisted before queue acknowledgement is the authoritative recovery source.

## Dispatch safety

A dispatch marker is written before the provider call and is retained when the provider outcome is ambiguous. A timeout after write, connection reset, provider 5xx, rate limit without documented no-effect semantics, or success without an external ID is not proof that publishing did not happen. These cases must be quarantined and reconciled; never blindly retry them. Meta Graph API feed publishing has no client-supplied idempotency key.

The worker persists a successful publication result in the database before the fenced queue acknowledgement. If acknowledgement fails after database success, recovery must use matching database evidence and must not republish. Queue recovery is not exactly-once publishing; provider-outcome reconciliation is a separate gate.

## Legacy migration

**A sweep that requeues legacy orphans is the single most dangerous artifact in this PR.**

Run `pnpm --dir nextjs-setup/nextjs-dashboard exec tsx scripts/reconcile-legacy-publish-queue.ts` first. It is report-only by default. Normal migration requires `--apply`; legacy orphan payloads that have no old pending-set membership require the additional explicit `--requeue-orphans` flag. Review the dry-run report and duplicate risk before applying. Corrupt or mismatched payloads and conflicting new queue state are retained for manual review.

Example with an explicitly isolated test Redis:

```sh
REDIS_URL=redis://127.0.0.1:6379 pnpm --dir nextjs-setup/nextjs-dashboard exec tsx scripts/reconcile-legacy-publish-queue.ts
```

Do not run migration against production until Redis persistence, noeviction, database reconciliation, and operator approval have been verified. Never set `DRY_RUN=false` as part of queue validation.

## Recovery policy

- Expired lease with no dispatch marker: requeue without incrementing attempts; a new successful claim increments generation and attempt.
- Expired lease with a dispatch marker: quarantine unless authoritative database evidence proves success or an operator records a verified no-effect outcome.
- Missing payload or corrupt generation state: fail closed to DLQ/manual review; do not synthesize generation zero.
- Quarantine has no timer-based exit. Resolution is explicit and audited.
