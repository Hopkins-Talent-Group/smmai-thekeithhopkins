# SMM AI — System Architecture Upgrade

## Target architecture

SMM AI is a multi-tenant CRM + social publishing platform with a human approval boundary. The Next.js application is the control plane; the Python package owns AI/content domain orchestration; Redis-backed workers execute asynchronous publishing and ingestion.

```
Web UI
  -> Route handlers / application services
  -> AuthN + tenant/RBAC + validation + rate limits + idempotency
  -> Domain services
  -> PostgreSQL (system of record)
  -> Outbox / job queue
  -> Platform adapters
       Meta | Instagram | LinkedIn | X | TikTok | YouTube
  -> Webhooks / analytics ingestion
  -> normalized events + audit log
  -> CRM + analytics + AI feedback loop
```

## CRM domain

The CRM boundary is workspace-scoped and should converge on:

- Workspace, member, role and settings
- Client/account and contacts
- Leads, lifecycle status, source, owner
- Pipelines, stages and opportunities
- Activities, tasks, notes, tags and custom fields
- Conversations/inbox threads and message events
- Campaigns and campaign membership
- Content drafts, revisions, approvals and publishing jobs
- Social accounts and provider capabilities
- Analytics snapshots and attribution events
- Audit events and integration/webhook delivery history

Every aggregate has a workspace/tenant boundary. No route may accept a tenant identifier and trust it over the authenticated session.

## Social integration contract

Every provider implements the same application-level port:

- OAuth authorization URL + callback exchange
- token refresh/revocation lifecycle
- account discovery
- capability discovery
- media upload
- publish
- publish status lookup
- analytics fetch
- webhook verification + normalization

Provider-specific SDKs never leak into CRM/UI code. The application stores normalized IDs and provider metadata; access/refresh credentials are encrypted at rest and never returned to the browser.

### Phase 2 readiness matrix

| Provider | OAuth | Account connect | Text | Media | Scheduling | Analytics | Webhooks |
|---|---|---|---|---|---|---|---|
| Meta/Instagram/Facebook | Adapter contract | Ready | Ready | Ready | Queue | Adapter | Ready |
| LinkedIn | Adapter contract | Planned | Planned | Planned | Queue | Planned | Planned |
| X | Adapter contract | Planned | Planned | Planned | Queue | Planned | Planned |
| TikTok | Adapter contract | Phase 3 | Planned | Planned | Queue | Planned | Planned |
| YouTube | Adapter contract | Phase 3 | Planned | Planned | Queue | Planned | Planned |

“Ready” means the internal contract exists; provider credentials and production app approval remain deployment concerns.

## API reliability

Sensitive mutation endpoints use:

1. AuthN and workspace authorization
2. Same-origin check for browser mutations
3. Schema validation and bounded body size
4. Distributed rate limiting by route + client, with tenant-aware limits where available
5. Client-supplied `Idempotency-Key` for non-idempotent mutations
6. Durable idempotency record/result replay
7. Transactional state transition
8. Queue/outbox handoff
9. Structured audit event

Recommended baseline limits:

- Login/reset: 5 requests/minute/IP
- Publish/connect/disconnect: 20 requests/minute/IP + tenant quota
- CRM writes: 60 requests/minute/IP
- Analytics sync: 10 requests/minute/IP
- Webhooks: signature verification + provider event dedupe; no user-auth session required

429 responses include `Retry-After`.

## OWASP/security baseline

- **A01 Broken access control:** all reads/writes filter by authenticated workspace; role checks live server-side.
- **A02 Cryptographic failures:** password hashes use bcrypt/Argon2; session identifiers are random and stored hashed; provider tokens are encrypted at rest.
- **A03 Injection:** Zod/typed parsing; Prisma parameterization; never concatenate SQL or shell commands.
- **A04 Insecure design:** approval is a domain transition, not a UI toggle; publish jobs require approved content.
- **A05 Security misconfiguration:** secure cookies, security headers, bounded request bodies, production secrets required.
- **A06 Vulnerable components:** lockfiles + CI audit/dependency scanning.
- **A07 Authentication failures:** no demo bypass in production; generic credential errors; rate limits.
- **A08 Software/data integrity:** signed/verified webhooks, idempotent jobs, immutable audit events.
- **A09 Logging failures:** structured request IDs and security events; never log tokens/passwords/raw webhook secrets.
- **A10 SSRF:** provider URLs are allowlisted by adapter; user-supplied URLs are validated and never fetched blindly.

## UI/UX system

The dashboard should expose task-oriented surfaces rather than database-shaped screens:

- Command center: approvals, failed jobs, account health, today's schedule
- CRM: accounts, contacts, leads, pipeline, activities, tasks, notes
- Content: composer, calendar, approval queue, revision history, bulk actions
- Unified inbox: normalized conversations with assignment/status
- Social accounts: connection status, scopes, token health, capabilities
- Analytics: cross-platform KPIs, content performance, account trends
- Automation: workflows, triggers, runs, retries, dead-letter queue
- Settings: workspace, members/RBAC, brand policy, integrations, audit log

Use reusable data tables, command palette, filter chips, saved views, drawers for entity detail, optimistic updates only for reversible local state, skeleton/loading/error/empty states, keyboard navigation, visible focus, semantic labels, and responsive layouts.

## Delivery sequence

1. Security/auth foundation and tenant enforcement.
2. CRM schema + service boundaries + audit/idempotency.
3. Provider adapter contract and OAuth/token lifecycle.
4. Publishing/outbox/worker reliability.
5. Phase 2 LinkedIn/X adapters.
6. Unified inbox + analytics normalization.
7. TikTok/YouTube adapters.
8. Contract/integration/load/security testing.

## Non-goals

- No provider-specific secrets in source.
- No direct browser-to-provider publishing.
- No autonomous publish path that bypasses moderation/approval.
- No cross-workspace queries for convenience.
