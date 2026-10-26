# Vercel Fix v4 — Full System Architecture Audit & Remediation Plan

**Repository:** `vitrixLab/social-media-smm-automation`  
**Branch audited:** `dev`  
**Audit date:** 2026-09-27  
**Scope:** Vercel deployment, Next.js application architecture, API boundaries, database layer, authentication, background jobs, Python service, social integrations, CI/CD, configuration, observability, security, and production-readiness.

> This document is an architecture audit and implementation instruction set. It supersedes the older Vercel fix notes when they conflict with the current `dev` branch.

---

# 1. Executive diagnosis

The current repository is **not a single deployable application**. It contains:

1. a Next.js dashboard under `nextjs-setup/nextjs-dashboard/`;
2. a Python/FastAPI application under `src/smm/`;
3. a PostgreSQL/Prisma schema intended for the Next.js dashboard;
4. stubbed TypeScript Prisma clients that do not actually persist data;
5. GitHub Actions used for a dry-run planning workflow;
6. social publishing code in Python, but no production live Meta implementation;
7. a dashboard API layer that partly returns hard-coded/in-memory data and partly calls a fake Prisma API;
8. documentation that describes a richer architecture than the code currently implements.

The central problem is therefore not simply "make Vercel build."

The real problem is:

> **There is no single authoritative runtime/data architecture connecting UI → API → domain → database → jobs → social adapters → analytics.**

Vercel should be treated as the **web/application edge for the Next.js product**, not as the place where the entire long-running SMM automation system is forced into request handlers.

## Target architecture

Use this boundary:

```
Browser
  |
  v
Vercel / Next.js
  |
  +--> Auth / RBAC
  +--> Server API / BFF
  +--> Prisma -> PostgreSQL / Neon
  +--> object/media storage
  +--> queue/job service
  |
  +--> external worker/service
          |
          +--> AI providers
          +--> moderation
          +--> social adapters
          +--> scheduled publishing
          +--> analytics ingestion
          +--> webhooks
```

The Next.js application owns the product UI, request validation, authorization, database transactions, and short-lived API operations.

The worker/service owns long-running or retryable automation.

The database owns durable state.

The social platforms own external delivery.

The browser owns **none** of the security, publishing, or authorization decisions.

---

# 2. Severity model

| Priority | Meaning |
|---|---|
| **P0** | Blocks trustworthy production deployment or creates a correctness/security risk |
| **P1** | Major architecture or reliability defect that should be fixed before broad rollout |
| **P2** | Important maintainability/operational improvement |
| **P3** | Cleanup, optimization, or future hardening |

Current overall state:

- **Vercel deployment topology:** P0
- **Authentication:** P0
- **Database persistence:** P0
- **Publishing/job execution:** P0
- **API authorization:** P0
- **Next.js dependency/lock architecture:** P0
- **Python/Next boundary:** P0
- **CI/CD coverage:** P1
- **Domain model:** P1
- **Observability:** P1
- **Dashboard UX architecture:** P1
- **WASM:** P2
- **Repository cleanup:** P2

---

# 3. P0 — Establish one production deployment topology

## Current state

The repository root contains:

- `package.json`
- `pnpm-lock.yaml`
- `pyproject.toml`
- `src/smm/`
- `nextjs-setup/nextjs-dashboard/`

The actual Next.js application has its own:

`nextjs-setup/nextjs-dashboard/package.json`

and currently declares:

- Next.js 16.3.6
- React 19.2.8
- Prisma packages
- Tailwind 4
- TypeScript

The root `package.json` declares a different Next.js version:

`next: 14.2.6`

and is not the real dashboard application.

There is also **no root `vercel.json`**, and the existing deployment notes correctly identify the Next.js app as the real Vercel application.

## Required architecture

Configure the Vercel project with:

```
Root Directory:
nextjs-setup/nextjs-dashboard
```

Vercel should deploy the Next.js application from that directory.

Do not make the root project pretend to be the Next.js application.

## Do not do this

Do not:

- add another copy of Next.js to the root merely for detection;
- create a root build command that `cd`s into the app while Vercel Root Directory already points there;
- deploy the Python FastAPI server as a hidden side effect of the Next.js build;
- use Vercel request handlers as a substitute for a durable worker.

## Preferred repository structure

```
/
├── nextjs-setup/
│   └── nextjs-dashboard/        # Vercel application
├── src/smm/                     # worker/domain service
├── tests/
├── docs/
└── .github/
```

Longer term, make the boundary explicit:

```
apps/
  web/                           # Next.js/Vercel
services/
  automation-worker/             # Python worker/service
packages/
  domain-contracts/
```

Do not perform this directory migration until the current application is stable. First fix runtime boundaries without creating a second migration problem.

---

# 4. P0 — Fix the package/lockfile architecture

## Finding

The root `pnpm-lock.yaml` has an importer for the repository root and resolves `serve`, but it does not represent the Next.js application's dependency graph.

The Next.js app has its own `package.json`, but the repository does not have a normal workspace definition connecting the root and app package.

This creates a fragile install/build contract.

## Required fix

Choose one package-management strategy and use it consistently.

### Recommended

Create a root workspace:

```yaml
packages:
  - "nextjs-setup/nextjs-dashboard"
```

Then regenerate the lockfile from the repository root.

The lockfile must contain an importer for:

```
nextjs-setup/nextjs-dashboard
```

The dashboard package must be the only source of truth for:

- Next.js
- React
- Prisma
- Tailwind
- TypeScript
- dashboard runtime dependencies.

Do not keep a second Next.js dependency at the root.

## Verification

From the repository root:

```bash
pnpm install
pnpm --dir nextjs-setup/nextjs-dashboard build
```

The CI build must use the same dependency graph as Vercel.

---

# 5. P0 — Resolve the Prisma architecture immediately

This is the largest current data-layer problem.

## Current state

The repository contains:

`nextjs-setup/nextjs-dashboard/prisma/schema.prisma`

which defines PostgreSQL models.

However:

`src/lib/prisma.ts`

is a **stub implementation**.

The generated Prisma directory is also a stub rather than a real generated Prisma client.

For example, the current implementation returns empty arrays/objects from methods that are expected to read and write production data.

Therefore:

> The presence of a Prisma schema does not mean the dashboard is using PostgreSQL.

## Consequence

The application can return apparent success without durable persistence.

Examples:

- creating a draft can return a fake object;
- updating a draft can return success without writing;
- client queries can return empty data;
- publishing can create a fake job;
- brand updates can call a fake client.

This must not reach production.

---

# 6. P0 — Replace the Prisma stub with the real Prisma client

## Required implementation

Use one real Prisma client module.

Conceptually:

```ts
// src/lib/prisma.ts

import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

Adapt the exact generated-client import to the chosen Prisma version.

If using Neon/serverless adapters, configure the adapter intentionally and document why. Do not leave the adapter packages installed while the application uses a fake client.

## Version rule

The following must be aligned to a compatible version family:

- `prisma`
- `@prisma/client`
- `@prisma/adapter-neon` if used

The current package declares Prisma 8 RC tooling while the client/adapter are on 7.10.x. Do not ship this mixed version state.

Pick one compatible release line, regenerate the client, regenerate the lockfile, and verify the build.

## Runtime dependency rule

Packages required by production server code belong in `dependencies`, not merely `devDependencies`.

Review:

- `@prisma/client`
- `@prisma/adapter-neon`
- database runtime dependencies.

---

# 7. P0 — Add real database migrations

The repository has:

```
prisma/schema.prisma
prisma/seed.ts
```

but no migration history is visible in the audited dashboard tree.

Do not use `prisma db push` as the production deployment mechanism.

Create a real migration workflow:

```
prisma/
  schema.prisma
  migrations/
    <timestamp>_<name>/
      migration.sql
  seed.ts
```

Recommended commands:

```bash
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma migrate deploy
```

Vercel deployment should run migrations through a controlled deployment process, not through an arbitrary request.

---

# 8. P0 — Redesign the database model around the real product

The current schema is still CRM-centric.

Current primary models include:

- `BrandProfile`
- `Client`
- `ContentDraft`
- `PublishJob`

A real SMM platform needs stronger boundaries.

## Required domain entities

### Identity

- User
- Workspace
- Membership
- Role
- Permission

### Brand

- BrandProfile
- BrandPolicyVersion
- ContentPillar
- GuardrailRule

### Social

- SocialAccount
- SocialCredential / encrypted token reference
- SocialAccountCapability
- AccountSyncState

### Content

- ContentDraft
- ContentRevision
- MediaAsset
- Campaign
- ContentVariant

### Moderation

- ModerationRun
- ModerationFinding
- Approval
- ApprovalEvent

### Publishing

- ScheduledPost
- PublishJob
- PublishAttempt
- PublishResult

### Engagement

- EngagementItem
- Conversation
- Assignment
- Reply

### Analytics

- AnalyticsSnapshot
- PostMetric
- AccountMetric
- MetricSyncRun

### Operations

- Notification
- AuditEvent
- WebhookEvent
- IntegrationError

---

# 9. P0 — Separate editorial state from publishing state

Current `ContentDraft` has:

```
DRAFT
PENDING
APPROVED
REJECTED
SCHEDULED
PUBLISHED
```

This is insufficient for production publishing.

A content item can be approved while its publish job is:

- queued;
- running;
- rate limited;
- failed;
- retrying;
- cancelled.

Therefore:

## Editorial state

```
DRAFT
PENDING_APPROVAL
APPROVED
REJECTED
ARCHIVED
```

## Delivery state

```
NOT_SCHEDULED
SCHEDULED
QUEUED
PUBLISHING
PUBLISHED
FAILED
RETRYING
CANCELLED
```

Never use a single `status` field to represent both.

---

# 10. P0 — Publishing must be a durable job

Current:

`src/app/api/crm/publish/route.ts`

creates a database job and then uses:

```
setTimeout(...)
```

to simulate asynchronous publishing.

This is not a production job system.

## Why this is unsafe

The process handling a request is not the correct place to depend on a five-second delayed callback for critical publishing.

If the execution ends, is restarted, times out, or is otherwise interrupted, the callback is not a durable job.

## Required flow

```
POST /api/publish
       |
       v
authorize
       |
       v
validate draft + approval + account
       |
       v
transaction:
  create PublishJob
  create AuditEvent
       |
       v
enqueue job
       |
       v
worker claims job
       |
       v
platform adapter
       |
       +--> success -> PublishResult
       |
       +--> transient failure -> retry
       |
       +--> permanent failure -> FAILED
```

Use a real durable queue/job service.

Examples of acceptable architecture:

- managed queue;
- Redis-backed job system;
- dedicated worker service;
- cloud task queue.

The specific vendor can be chosen later. The architectural requirement cannot.

---

# 11. P0 — Make publishing idempotent

Publishing is a side-effecting operation.

Every publish request must have an idempotency key.

Example:

```
idempotencyKey = hash(
  workspaceId +
  socialAccountId +
  contentRevisionId +
  scheduledExecutionId
)
```

Before publishing:

1. check whether the idempotency key already succeeded;
2. if yes, return the existing result;
3. if a job is already running, return that job;
4. only create a new attempt when safe.

Never retry blindly after an uncertain external response.

---

# 12. P0 — Implement real social adapters behind a port

The Python service currently has a `MetaAdapter`, but live publishing is explicitly not implemented.

The correct boundary is:

```
Publisher
  |
  +-- MetaPublisher
  +-- LinkedInPublisher
  +-- XPublisher
  +-- TikTokPublisher
  +-- YouTubePublisher
```

The web application must not embed platform SDK behavior directly into UI components.

Every adapter should expose:

- account validation;
- capability discovery;
- media upload;
- post creation;
- scheduling if supported;
- publish status;
- error normalization;
- rate-limit metadata;
- external ID;
- retry classification.

---

# 13. P0 — Authentication is currently demo-only

Current endpoint:

`src/app/api/auth/login/route.ts`

hardcodes:

```
admin@smmai.com
admin
```

and returns a fake token.

This must never be deployed as production authentication.

## Required replacement

Use a real authentication system with:

- password hashing if password auth is retained;
- secure session cookies;
- CSRF protection where applicable;
- session expiration;
- logout;
- password reset;
- email verification if required;
- OAuth/social login if required;
- server-side identity resolution.

Do not store the authentication token in `localStorage` for the production session.

Current login page does:

```
localStorage.setItem("authToken", token)
```

Replace this with a secure server-managed session.

---

# 14. P0 — Add middleware/route protection

The dashboard currently has no production-grade authorization boundary.

Every protected route must verify the session.

At minimum:

```
/dashboard/*
/api/crm/*
/api/publish/*
/api/accounts/*
/api/analytics/*
/api/settings/*
```

must require authenticated access.

Public routes:

```
/
/login
/api/auth/*
```

must be explicitly defined.

Do not rely on the dashboard UI hiding links.

---

# 15. P0 — Add RBAC and workspace isolation

The system is intended to support agency/client workflows, but authorization is not represented in the current API architecture.

Every query must be scoped by authenticated workspace.

Bad:

```ts
prisma.contentDraft.findMany()
```

Good:

```ts
prisma.contentDraft.findMany({
  where: {
    workspaceId: session.workspaceId
  }
})
```

The same rule applies to:

- clients;
- brands;
- social accounts;
- drafts;
- media;
- analytics;
- jobs;
- audit events.

Never accept `workspaceId` from an untrusted browser request as the authority.

Derive it from the session.

---

# 16. P0 — Fix the draft API

Current:

`src/app/api/crm/drafts/route.ts`

has two incompatible data sources.

GET uses:

```
initialDrafts
```

while PATCH/POST return simulated success instead of real persistence.

This means GET can disagree with POST/PATCH.

## Required architecture

One source of truth:

```
GET    -> Prisma
POST   -> Prisma transaction
PATCH  -> Prisma transaction
DELETE -> Prisma transaction
```

Then publish jobs read the same database state.

Remove `initialDrafts` from production code.

Fixtures belong in:

- seed;
- test factories;
- story/demo data.

They must not be the live API data source.

---

# 17. P0 — Fix system state storage

Current:

`src/app/api/crm/status/route.ts`

uses module-level state:

```
let systemState = {...}
```

This is not durable and should not represent system configuration.

## Required split

### Persisted configuration

Database:

- automation mode;
- approval policy;
- moderation policy;
- enabled integrations;
- account settings.

### Runtime health

Generated from real services:

- database health;
- queue health;
- account sync health;
- last worker heartbeat;
- last successful publish;
- last analytics sync.

### Never

Do not allow a browser request to arbitrarily set:

```
health = "healthy"
```

Health is observed, not user-controlled.

---

# 18. P1 — Simplify the Next.js application boundary

Use Next.js as:

- UI;
- server components where useful;
- route handlers/BFF;
- authentication boundary;
- validation;
- Prisma transactions;
- short-lived API calls.

Do not turn `page.tsx` components into business logic containers.

Recommended structure:

```
src/
  app/
    (public)/
    (auth)/
    (dashboard)/
    api/
  components/
  domain/
    content/
    publishing/
    moderation/
    analytics/
    accounts/
  server/
    auth/
    db/
    jobs/
    integrations/
  lib/
    validation/
    logging/
    errors/
```

Route handlers should be thin.

Example:

```
POST /api/content/:id/approve
  -> authenticate()
  -> authorize()
  -> approvalService.approve()
  -> auditService.record()
  -> return result
```

The business rule belongs in a service, not inside JSX.

---

# 19. P1 — Decide the Python service boundary

The Python service currently contains the conceptual domain implementation:

- planning;
- moderation;
- publishing;
- analytics;
- research;
- AI;
- integrations.

The Next.js application independently contains CRM/dashboard API code.

This duplicates domain ownership.

## Recommended decision

Make Python the **automation/worker domain service**.

Next.js is the product/API layer.

Communication:

```
Next.js
  |
  | authenticated internal API / queue
  v
Python worker/service
  |
  +--> AI
  +--> moderation
  +--> research
  +--> social adapters
  +--> analytics
```

The worker must not depend on browser state.

The Next.js API must not import arbitrary Python source files.

---

# 20. P1 — Define the service contract

Create explicit contracts for messages.

Example:

```json
{
  "type": "publish.requested",
  "version": 1,
  "jobId": "job_123",
  "workspaceId": "ws_123",
  "socialAccountId": "acct_123",
  "contentRevisionId": "rev_123",
  "idempotencyKey": "..."
}
```

Worker result:

```json
{
  "type": "publish.completed",
  "version": 1,
  "jobId": "job_123",
  "externalPostId": "..."
}
```

Failure:

```json
{
  "type": "publish.failed",
  "version": 1,
  "jobId": "job_123",
  "retryable": true,
  "code": "RATE_LIMITED",
  "message": "..."
}
```

Version all cross-service messages.

Do not rely on undocumented JSON shapes.

---

# 21. P1 — Keep AI behind a provider interface

The Python architecture already describes an AI provider abstraction.

Preserve:

```
AIProvider
  |
  +-- Stub
  +-- OpenAI-compatible
  +-- Anthropic
  +-- Azure
  +-- internal
```

Required metadata for every generated draft:

- provider;
- model;
- prompt/version;
- generation timestamp;
- input reference;
- safety/moderation result;
- generation ID where available.

Do not persist raw secrets or unnecessarily store sensitive provider payloads.

---

# 22. P1 — Moderation must be a durable decision

Current Python moderation is a useful domain boundary.

Production architecture should persist:

```
ModerationRun
  id
  draftId
  policyVersion
  result
  findings
  createdAt
```

A draft cannot be published simply because the UI says it is approved.

Publishing must verify:

1. current draft revision;
2. moderation result;
3. approval record;
4. account capability;
5. current policy;
6. scheduled execution;
7. authorization.

---

# 23. P1 — Approval must bind to a content revision

Approval should not mean:

```
draft.status = APPROVED
```

only.

Instead:

```
Approval
  draftId
  revisionId
  actorId
  approvedAt
  policyVersion
```

If the content changes after approval:

```
approved revision != current revision
```

the approval becomes invalid and the post must return to review.

This prevents a subtle but serious safety bug where content is edited after approval but published under the old approval.

---

# 24. P1 — Build a real scheduler

GitHub Actions currently runs:

`daily-dry-run.yml`

This is acceptable for development/dry-run planning.

It is not the production publishing scheduler.

Production scheduling needs:

- durable jobs;
- timezone-aware execution;
- retries;
- dead-letter handling;
- rate limiting;
- account availability checks;
- idempotency;
- observability.

The scheduler should enqueue work, not directly perform all social API operations.

---

# 25. P1 — Analytics architecture

Current Python analytics contains a small `engagement_rate()` computation.

The dashboard needs a normalized analytics ingestion layer.

Use:

```
Platform API
   |
   v
Analytics adapter
   |
   v
Normalization
   |
   v
PostMetric / AccountMetric
   |
   v
Analytics API
   |
   v
Dashboard
   |
   v
Recommendation engine
```

Store:

- source platform;
- source account;
- external post ID;
- metric;
- value;
- measuredAt;
- fetchedAt;
- aggregation period.

Do not overwrite historical analytics with the latest number.

---

# 26. P1 — Webhooks are required for integration correctness

Where supported, social platforms should send events to webhook endpoints.

Use:

```
POST /api/webhooks/<platform>
```

Webhook processing must:

1. verify signature;
2. persist raw event metadata;
3. deduplicate;
4. enqueue processing;
5. acknowledge quickly;
6. process asynchronously.

Never perform expensive processing before acknowledging a webhook.

---

# 27. P1 — Add observability

Every production request/job should have:

- request ID;
- workspace ID;
- user ID where available;
- job ID;
- social account ID;
- external platform;
- duration;
- outcome.

Structured logging example:

```json
{
  "event": "publish.completed",
  "requestId": "...",
  "jobId": "...",
  "workspaceId": "...",
  "platform": "meta",
  "durationMs": 1420
}
```

Add error tracking for:

- route errors;
- database failures;
- queue failures;
- adapter failures;
- webhook failures.

---

# 28. P1 — Add health endpoints with real checks

Current Python:

`GET /api/health`

returns:

```
{"status":"ok"}
```

This is only a process-level check.

Create separate checks:

### Liveness

Is the process running?

### Readiness

Can the service reach required dependencies?

### Worker heartbeat

Has the worker processed work recently?

### Integration health

Are social credentials/accounts valid?

Do not report "healthy" just because the HTTP process responded.

---

# 29. P1 — CI must build the actual Vercel app

Current CI runs Python:

```
ruff check .
pytest -q
```

It does not validate the Next.js production build.

Add a frontend job:

```
pnpm install --frozen-lockfile
pnpm --dir nextjs-setup/nextjs-dashboard lint
pnpm --dir nextjs-setup/nextjs-dashboard build
```

Also run:

- TypeScript;
- Prisma generate;
- migration validation;
- tests for API routes;
- Python tests.

The goal is:

> **The same build that passes CI should be deployable by Vercel.**

---

# 30. P1 — Add database integration tests

Unit tests are not enough.

Required integration coverage:

- create draft;
- update draft;
- approve revision;
- reject revision;
- create publish job;
- duplicate publish request;
- job failure;
- retry;
- workspace isolation;
- brand policy update;
- analytics ingestion.

Use a dedicated test database.

Never run destructive tests against production.

---

# 31. P1 — Add API authorization tests

Test every protected mutation.

Examples:

```
anonymous -> 401
wrong workspace -> 403 or filtered
viewer -> cannot publish
editor -> cannot change automation policy
approver -> can approve
publisher -> can execute publish if authorized
admin -> can change settings
```

Authorization must be tested at the API/service layer.

---

# 32. P1 — Fix dashboard route architecture

Current `dashboard/page.tsx` has too many responsibilities:

- section state;
- layout state;
- platform filter;
- sidebar state;
- component composition;
- dashboard information architecture.

It also contains a `clients` branch even though the current `DashboardViewSection` union does not define `clients`.

## Required fix

Create route-level pages:

```
/dashboard
/dashboard/content
/dashboard/content/calendar
/dashboard/content/approvals
/dashboard/engagement
/dashboard/analytics
/dashboard/accounts
/dashboard/brand
/dashboard/automation
/dashboard/settings
```

Use URL routing for primary navigation instead of one giant local-state switch.

Benefits:

- refreshable URLs;
- browser history;
- deep links;
- permission boundaries;
- analytics;
- smaller page components;
- easier testing.

---

# 33. P1 — Remove duplicate navigation ownership

Current dashboard has:

- `DashboardHeader`;
- `DashboardShell`;
- `LayoutControlBar`.

These overlap.

Required:

### Header

Global context:

- workspace/client;
- search;
- notifications;
- user menu;
- mobile navigation trigger.

### Sidebar

Primary product navigation.

### Page toolbar

Local filters/actions only.

Remove navigation switching from the page toolbar.

---

# 34. P1 — Fix client architecture

The current schema includes a CRM Client model, while the SMM product architecture needs workspace/client/brand/account relationships.

Recommended:

```
Workspace
  |
  +-- Memberships
  |
  +-- Clients
        |
        +-- BrandProfiles
        |
        +-- SocialAccounts
        |
        +-- Campaigns
        |
        +-- Content
        |
        +-- Analytics
```

If SMMAI is single-brand initially, do not pretend the application is an enterprise multi-client CRM.

Either:

1. implement the hierarchy properly; or
2. remove the CRM presentation until it is real.

---

# 35. P1 — Media architecture

Social publishing will eventually require images/video.

Do not store large media binaries in PostgreSQL.

Use:

```
Browser
  |
  v
signed upload URL
  |
  v
object storage
  |
  v
MediaAsset row
```

Database stores:

- object key;
- MIME type;
- size;
- dimensions;
- duration;
- checksum;
- owner/workspace;
- createdAt.

Workers read media from storage.

---

# 36. P1 — Secrets architecture

Environment variables should be divided into:

## Public/browser-safe

```
NEXT_PUBLIC_*
```

Only values safe for public exposure.

## Server-only

- database credentials;
- OAuth secrets;
- social access tokens;
- AI API keys;
- webhook signing secrets;
- queue credentials.

Never expose these to client components.

Never return them from API responses.

Never put them into `NEXT_PUBLIC_*`.

---

# 37. P1 — Social token storage

Do not store raw long-lived social access tokens in ordinary application rows.

Preferred:

```
SocialAccount
  encryptedCredentialRef
```

Use a secrets manager or encrypted storage.

Required:

- encryption at rest;
- rotation;
- expiry tracking;
- reconnect workflow;
- minimal scopes;
- audit events.

---

# 38. P2 — Remove fake/demo production data

The following patterns should be restricted to tests or seed data:

- `initialDrafts`
- `initialClients`
- `initialAnalytics`
- hard-coded demo credentials
- fake engagement score generated with `Math.random()`
- module-level `systemState`

A production API must never generate a random analytics metric.

---

# 39. P2 — Fix seed data

Current seed data contains realistic-looking demo clients and a published post.

Use clearly marked development fixtures.

Do not let seed commands run automatically against production.

Recommended:

```
seed:dev
seed:test
```

Production should normally start from migrations and controlled configuration.

---

# 40. P2 — Clean generated/build artifacts from source control

The repository currently contains `__pycache__` directories in the source tree.

These should not be committed.

Also review:

- graph caches;
- generated graph output;
- temporary archives;
- empty placeholder files.

Generated artifacts should either:

1. be reproducible and generated in CI; or
2. be explicitly documented as source artifacts.

Do not mix generated build state with application source.

---

# 41. P2 — WASM should not block the Vercel architecture

The current WASM migration plan targets:

- engagement rate;
- signal ranking.

These are small computations.

Do not make WASM a prerequisite for production deployment.

The correct priority is:

1. durable database;
2. auth;
3. authorization;
4. jobs;
5. integrations;
6. analytics;
7. observability;
8. then performance optimization.

If WASM is retained:

```
domain function
   |
   +--> reference implementation
   |
   +--> WASM optimized implementation
```

Both must have equivalence tests.

---

# 42. P2 — Do not put the entire Python runtime inside the dashboard deployment

The Python service is not a UI dependency.

Do not make a Next.js build:

```
Next build
  -> install Python
  -> start FastAPI
  -> run scheduler
```

This creates fragile deployments and unclear ownership.

Use separate deployment units.

## Recommended production deployment

### Vercel

Hosts:

- Next.js;
- dashboard;
- auth;
- BFF/API;
- short database operations;
- webhook ingestion;
- read APIs.

### Worker/service platform

Hosts:

- Python automation;
- AI workflows;
- moderation;
- social publishing;
- analytics sync;
- scheduler;
- retry loops.

### Database

PostgreSQL/Neon or equivalent.

### Object storage

Media.

### Queue

Durable asynchronous jobs.

---

# 43. Target architecture — complete

```
                         ┌─────────────────────┐
                         │       Browser       │
                         └──────────┬──────────┘
                                    │ HTTPS
                                    v
                  ┌────────────────────────────────┐
                  │         Vercel / Next.js       │
                  │                                │
                  │  UI / App Router               │
                  │  Auth / RBAC                   │
                  │  API / BFF                     │
                  │  Validation                    │
                  │  Prisma                        │
                  └───────┬─────────────┬──────────┘
                          │             │
                          v             v
                 ┌──────────────┐   ┌──────────────┐
                 │ PostgreSQL   │   │ Object Store │
                 │ / Neon       │   │ Media        │
                 └──────┬───────┘   └──────────────┘
                        │
                        │ durable state
                        v
                 ┌──────────────┐
                 │ Queue / Jobs  │
                 └──────┬───────┘
                        │
                        v
             ┌────────────────────────┐
             │ Automation Worker      │
             │                        │
             │ Research               │
             │ Planning               │
             │ AI generation          │
             │ Moderation             │
             │ Scheduling             │
             │ Publishing             │
             │ Analytics ingestion    │
             └──────┬─────┬─────┬─────┘
                    │     │     │
                    v     v     v
                 AI APIs Social  Analytics
                         APIs    APIs
```

---

# 44. API architecture

Use domain-oriented routes.

## Content

```
GET    /api/content
POST   /api/content
GET    /api/content/:id
PATCH  /api/content/:id
POST   /api/content/:id/submit
POST   /api/content/:id/approve
POST   /api/content/:id/reject
```

## Publishing

```
POST   /api/content/:id/schedule
POST   /api/content/:id/publish
GET    /api/publish-jobs/:id
POST   /api/publish-jobs/:id/retry
POST   /api/publish-jobs/:id/cancel
```

## Accounts

```
GET    /api/social-accounts
POST   /api/social-accounts/connect
POST   /api/social-accounts/:id/reconnect
DELETE /api/social-accounts/:id
GET    /api/social-accounts/:id/health
```

## Analytics

```
GET /api/analytics/overview
GET /api/analytics/content/:id
GET /api/analytics/accounts/:id
```

## Engagement

```
GET   /api/inbox
POST  /api/inbox/:id/reply
POST  /api/inbox/:id/resolve
POST  /api/inbox/:id/assign
```

## Automation

```
GET   /api/automation/status
GET   /api/automation/policies
PATCH /api/automation/policies/:id
```

---

# 45. Request lifecycle standard

Every mutation should follow:

```
HTTP request
   |
   v
parse input
   |
   v
authenticate
   |
   v
authorize
   |
   v
validate domain state
   |
   v
transaction
   |
   +--> durable state
   +--> audit event
   +--> outbox/job event
   |
   v
response
```

Do not:

- mutate local React state as the source of truth;
- claim success before durable persistence;
- publish before server-side authorization;
- start non-durable background work and immediately return success.

---

# 46. Transaction + outbox pattern

For important operations, use an outbox.

Example approval:

```
transaction:
  update Approval
  update editorial state
  create AuditEvent
  create OutboxEvent
```

A worker then publishes the outbox event to the queue.

This prevents:

```
DB updated
but
queue publish failed
```

from silently losing work.

---

# 47. Error model

Standardize API errors.

Example:

```json
{
  "error": {
    "code": "PUBLISH_NOT_APPROVED",
    "message": "This content revision has not been approved.",
    "requestId": "req_123"
  }
}
```

Recommended error codes:

- UNAUTHENTICATED
- FORBIDDEN
- NOT_FOUND
- VALIDATION_FAILED
- CONFLICT
- NOT_APPROVED
- MODERATION_FAILED
- ACCOUNT_DISCONNECTED
- RATE_LIMITED
- PLATFORM_UNAVAILABLE
- PUBLISH_FAILED
- INTERNAL_ERROR

Do not leak provider secrets or raw upstream error payloads.

---

# 48. Dashboard state model

Every async UI component should support:

```
idle
loading
success
empty
stale
error
retrying
permission_denied
```

For jobs:

```
queued
running
succeeded
failed
retrying
cancelled
```

The UI should render the actual server state.

---

# 49. Security checklist

Before production:

- [ ] Real authentication
- [ ] Secure session cookies
- [ ] Dashboard route protection
- [ ] API route protection
- [ ] RBAC
- [ ] Workspace isolation
- [ ] Server-side publishing authorization
- [ ] Encrypted social credentials
- [ ] OAuth state validation
- [ ] Webhook signature validation
- [ ] Rate limiting
- [ ] Request size limits
- [ ] Input validation
- [ ] Output sanitization where applicable
- [ ] No secrets in browser bundles
- [ ] No secrets in logs
- [ ] Audit trail
- [ ] Dependency audit
- [ ] Secure headers
- [ ] Error redaction

---

# 50. Vercel-specific deployment contract

The Vercel project should have:

## Root directory

```
nextjs-setup/nextjs-dashboard
```

## Build

```
pnpm build
```

## Install

Use the repository's supported pnpm workspace/install strategy.

Do not duplicate dependency definitions to make Vercel detect Next.js.

## Runtime

Keep request handlers short and deterministic.

Do not rely on:

- `setTimeout` for critical jobs;
- in-memory state;
- local filesystem persistence;
- process-local caches as authoritative state.

## Environment variables

Configure separately for:

- Development
- Preview
- Production

At minimum, production requires the database/session/integration/queue secrets actually used by the chosen architecture.

---

# 51. CI/CD target

CI should execute:

```
1. install
2. lint
3. typecheck
4. prisma generate
5. migration validation
6. unit tests
7. integration tests
8. Next production build
9. Python lint
10. Python tests
```

Deployment should then:

```
CI green
  |
  v
Vercel preview
  |
  v
smoke tests
  |
  v
production
  |
  v
migration + health verification
```

Do not deploy production from a branch that has not passed the actual Next.js build.

---

# 52. Smoke-test checklist after Vercel deployment

## Public

- [ ] `/`
- [ ] `/login`

## Auth

- [ ] valid login
- [ ] invalid login
- [ ] logout
- [ ] expired session

## Dashboard

- [ ] `/dashboard`
- [ ] content
- [ ] approvals
- [ ] analytics
- [ ] accounts
- [ ] settings

## API

- [ ] unauthenticated API returns 401
- [ ] unauthorized workspace returns correct response
- [ ] draft create persists
- [ ] draft update persists
- [ ] approval persists
- [ ] publish job persists
- [ ] duplicate publish request is idempotent

## Database

- [ ] migrations applied
- [ ] Prisma query succeeds
- [ ] connection pooling behaves correctly

## Worker

- [ ] queue receives job
- [ ] worker claims job
- [ ] success state recorded
- [ ] failure state recorded
- [ ] retry works
- [ ] audit event exists

---

# 53. Implementation order

Do not implement all dashboard features before fixing the architecture.

## Phase 0 — Freeze risky live actions

Immediately:

1. keep `DRY_RUN=true`;
2. disable fake live publishing;
3. remove demo production credentials;
4. prevent unauthenticated dashboard/API access.

## Phase 1 — Make Vercel deterministic

1. establish workspace/package strategy;
2. align dependency versions;
3. regenerate lockfile;
4. configure Vercel Root Directory;
5. build Next.js in CI;
6. verify production build.

## Phase 2 — Make data real

1. replace Prisma stub;
2. align Prisma versions;
3. generate real client;
4. add migrations;
5. add workspace/user models;
6. replace hard-coded API data;
7. add integration tests.

## Phase 3 — Make security real

1. real auth;
2. sessions;
3. RBAC;
4. workspace isolation;
5. secure credential storage;
6. webhook verification.

## Phase 4 — Make publishing real

1. revision model;
2. moderation records;
3. approval records;
4. publish job;
5. idempotency;
6. queue;
7. worker;
8. adapter;
9. retry;
10. audit.

## Phase 5 — Make analytics real

1. normalized metrics;
2. sync jobs;
3. account health;
4. post-level metrics;
5. analytics API;
6. recommendation feedback loop.

## Phase 6 — Rebuild dashboard information architecture

Use real routes:

```
Overview
Content
Engagement
Analytics
Accounts
Brand & Guardrails
Automation
Clients
Settings
```

Only expose Clients when the client/workspace model is actually implemented.

## Phase 7 — Optimization

Only after correctness:

- WASM;
- caching;
- query optimization;
- batch analytics;
- precomputation;
- UI performance.

---

# 54. Files that require direct attention

## Vercel/build

- `package.json`
- `pnpm-lock.yaml`
- `nextjs-setup/nextjs-dashboard/package.json`
- `nextjs-setup/nextjs-dashboard/next.config.ts`
- `.github/workflows/ci.yml`

## Database

- `nextjs-setup/nextjs-dashboard/prisma/schema.prisma`
- `nextjs-setup/nextjs-dashboard/prisma/seed.ts`
- `nextjs-setup/nextjs-dashboard/src/lib/prisma.ts`
- `nextjs-setup/nextjs-dashboard/src/generated/prisma/`

## Authentication

- `nextjs-setup/nextjs-dashboard/src/app/login/page.tsx`
- `nextjs-setup/nextjs-dashboard/src/app/api/auth/login/route.ts`

## API

- `nextjs-setup/nextjs-dashboard/src/app/api/crm/drafts/route.ts`
- `nextjs-setup/nextjs-dashboard/src/app/api/crm/publish/route.ts`
- `nextjs-setup/nextjs-dashboard/src/app/api/crm/status/route.ts`
- `nextjs-setup/nextjs-dashboard/src/app/api/crm/brand/route.ts`
- `nextjs-setup/nextjs-dashboard/src/app/api/crm/clients/route.ts`

## Dashboard

- `nextjs-setup/nextjs-dashboard/src/app/dashboard/page.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/layout/DashboardShell.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/layout/DashboardHeader.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/layout/LayoutControlBar.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/crm/ApprovalQueue.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/crm/ContentDraftCard.tsx`

## Automation service

- `src/smm/main.py`
- `src/smm/config.py`
- `src/smm/domain/models.py`
- `src/smm/publishing/service.py`
- `src/smm/publishing/ports.py`
- `src/smm/integrations/adapters.py`
- `src/smm/moderation/policy.py`
- `src/smm/content/planner.py`
- `src/smm/workflows/daily.py`

---

# 55. What not to fix first

Do **not** spend the next implementation cycle on:

- adding more KPI cards;
- adding more chart variants;
- polishing architecture graph visuals;
- adding WASM before measuring a bottleneck;
- adding more social platforms before Meta publishing is reliable;
- expanding CRM screens before workspace isolation exists;
- adding fake automation toggles;
- creating more demo data.

The current blocker is infrastructure correctness.

---

# 56. Production definition of done

The architecture is ready for real SMM traffic only when all of these are true:

### Deployment

- [ ] Vercel builds the intended Next.js app
- [ ] CI and Vercel use the same dependency graph
- [ ] preview deployments work
- [ ] production deployment is repeatable

### Data

- [ ] real PostgreSQL persistence
- [ ] real Prisma client
- [ ] migrations
- [ ] workspace isolation
- [ ] no fake API persistence

### Security

- [ ] real authentication
- [ ] secure sessions
- [ ] RBAC
- [ ] API authorization
- [ ] encrypted social credentials
- [ ] verified webhooks

### Content

- [ ] revisions
- [ ] moderation records
- [ ] approval records
- [ ] approval invalidated by content changes

### Publishing

- [ ] durable queue
- [ ] durable job state
- [ ] idempotency
- [ ] retry classification
- [ ] real social adapter
- [ ] external post ID
- [ ] failure reason
- [ ] audit event

### Analytics

- [ ] normalized ingestion
- [ ] historical metrics
- [ ] sync status
- [ ] post/account metrics
- [ ] feedback into planning

### Operations

- [ ] structured logs
- [ ] request/job IDs
- [ ] health/readiness
- [ ] error tracking
- [ ] alerts
- [ ] worker heartbeat

### Dashboard

- [ ] route-based information architecture
- [ ] no duplicate navigation
- [ ] no fake states
- [ ] no demo auth
- [ ] no local-only security controls
- [ ] actionable failure states

---

# 57. Final architecture decision

The repository should converge on this rule:

> **Vercel is the product/application edge. PostgreSQL is the durable source of truth. A queue is the durable execution boundary. A worker is the automation engine. Social platforms are external systems. The browser is never an authority.**

The most important current fixes are therefore:

1. **Make the Next.js app a deterministic Vercel deployment.**
2. **Replace the fake Prisma layer with real PostgreSQL persistence.**
3. **Replace demo authentication with real sessions/RBAC.**
4. **Remove in-memory system state.**
5. **Replace `setTimeout` publishing with durable jobs.**
6. **Make approval, moderation, and publishing server-authoritative.**
7. **Separate Next.js application responsibilities from the Python worker.**
8. **Introduce durable queue/outbox/idempotency patterns.**
9. **Build CI around the actual Vercel application.**
10. **Only then expand the SMM dashboard and platform integrations.**

This is the architecture required to turn the current prototype into a reliable Vercel-hosted SMM product rather than a dashboard that only appears to have a backend.
