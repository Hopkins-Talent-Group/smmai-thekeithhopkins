# CRM Plan v2 — Architecture & Implementation Plan

**Scope:** the CRM module inside `nextjs-setup/nextjs-dashboard` — data model, types, navigation, and the path from what exists today to Inbox / Contacts / Pipeline / Leads / Marketing.
**Out of scope:** hosting/deployment mechanics. Netlify is working; the build-and-deploy findings from the earlier Vercel-specific audit (`v4.1.md`) still apply wherever this repo eventually deploys, but nothing below assumes a specific host.
**Builds on:** `smmai-plan-v3.md` §8–11 (the existing missing-components catalog and proposed IA) and the CRM-specific findings from the last two audit rounds. Where this plan disagrees with `smmai-plan-v3.md`, it's because that document predates the current `crm.ts` and describes an earlier snapshot of the tree — this plan reflects what's actually in `dev` today.

---

## 1. What "CRM" currently means here vs. what's being asked for

You asked for Inbox, Contacts, Pipeline, Leads, and Marketing. Here's what exists against each, verified directly against the code (not the commit messages):

| Requested module | Current reality |
|---|---|
| **Contacts** | Not implemented under this name. **Clients** is the real implementation — full CRUD UI (`ClientsTable.tsx`, `ClientForm.tsx`, `ClientStatsCards.tsx`) and API routes — but it's wired to a fake persistence layer and, separately, never rendered by the page that's supposed to show it. Closest thing to done; needs reconnecting, not rebuilding. |
| **Pipeline** | Does not exist. No stage/deal model, no Kanban, nothing — not in code, not in any planning doc. The only "pipeline" in the repo is content moderation (draft → pending → approved → published), which is a different concept wearing the same word. |
| **Leads** | Does not exist. Zero references anywhere. |
| **Marketing** | Does not exist as a named section. The functional equivalent — draft creation, scheduling, approval, publishing — already exists under "Content"/"Drafts"/"Approval." Whether "Marketing" should be a rename of that or a new campaigns concept is an open decision (§7). |
| **Inbox** | Does not exist in code. Specified in detail as a future requirement in `smmai-plan-v3.md` §10.4 (comments, mentions, messages, sentiment, assignment, SLA) — genuinely new work, not a wiring fix. |

**One module (Contacts/Clients) is a reconnection job. Two (Pipeline, Leads) need a new data model and are small builds once modeled. One (Marketing) is a naming/scope decision more than a build. One (Inbox) is real, multi-week product work.** The rest of this plan sequences those differently on purpose (§8) rather than treating them as five equal-sized tasks.

---

## 2. Current state inventory

| File | What it actually does | Verdict |
|---|---|---|
| `src/lib/crm.ts` | Defines the old v1 `Client` shape only — missing every field the components below need, and defines `DashboardViewSection` as a 5-value set none of the three nav components fully agree with | Rewrite — §4 |
| `src/components/crm/ClientsTable.tsx`, `ClientForm.tsx`, `ClientStatsCards.tsx` | Complete, working UI for a Contacts-equivalent list/detail/create/edit flow | Keep. Currently orphaned (not rendered anywhere) and blocked by the type gap above |
| `src/components/crm/ClientManagement.tsx` | 15-line placeholder ("Client management functionality coming soon"), not imported anywhere | Dead code — delete |
| `src/components/crm/CRMDashboard.tsx` | Re-bundles `AutomationStatusCard` + `ApprovalQueue` + `AnalyticsCards` + `BrandProfileCard` — all four independently reachable elsewhere | Duplicate composition — delete, don't fix |
| `src/app/api/crm/clients/route.ts`, `clients/[id]/route.ts` | Written against real Prisma Client call shapes; correctly structured | Keep. Currently pointed at a fake stub instead of a real client |
| `src/app/api/crm/drafts/route.ts` | Imports `prisma`, never calls it — `GET` reads a hardcoded array, `POST`/`PATCH` fake success | Rewrite for real persistence — §6 |
| `src/app/api/crm/publish/route.ts` | Real Prisma calls, but schedules follow-up work via `setTimeout` after the response returns — unreliable on any stateless function runtime, Netlify included | Fix the async pattern — §6 |
| `src/app/api/crm/status/route.ts` | Dry-run/safety state lives in a module-level variable — not guaranteed to persist across invocations on any serverless-style host | Back with the database — §6 |
| `src/lib/prisma.ts`, `src/generated/prisma/index.ts` | Hand-written stubs, not a real generated Prisma client — always return null/empty regardless of input | Replace with a real client — §5 |
| `prisma/schema.prisma` | A real, reasonable schema (Client, ContentDraft, PublishJob, BrandProfile) — but uses a schema-file connection config pattern that current Prisma rejects, and has enum casing that disagrees with the UI | Fix two specific issues, keep the shape — §5 |
| `DashboardHeader.tsx` / `DashboardShell.tsx` (sidebar) / `LayoutControlBar.tsx` | Three independent navigation components, three different section lists, one shared piece of state | Consolidate to one — §7 |

---

## 3. Design principle for everything below

**The database enum/shape is the source of truth; the UI conforms to it, except where the UI already has more working call sites than the schema does.** This isn't a platitude — it's the concrete rule that resolves every casing/shape disagreement found in this codebase, applied case-by-case in §5. Pick it once, write it down, and the next contributor doesn't have to rediscover which side "wins" by trial and error.

---

## 4. Type layer — unified `src/lib/crm.ts`

```ts
// src/lib/crm.ts
//
// Single source of truth for CRM types shared between API routes and UI
// components. If a component needs a new field, add it here first —
// do not redeclare these types locally in a component.

export type Platform =
  | "meta" | "linkedin" | "twitter" | "x" | "facebook"
  | "instagram" | "tiktok" | "youtube" | (string & {});

export type DraftStatus =
  | "draft" | "pending" | "approved" | "rejected" | "scheduled" | "published";

// Must match the Prisma `ClientStatus` enum in prisma/schema.prisma exactly.
export type ClientStatus = "PROSPECT" | "ACTIVE" | "PAUSED" | "CHURNED";
export const CLIENT_STATUSES: ClientStatus[] = ["PROSPECT", "ACTIVE", "PAUSED", "CHURNED"];

// Every section id referenced by any nav component today. See §7 for the
// consolidation that will shrink this list once the nav is unified.
export type DashboardViewSection =
  | "overview" | "approval" | "drafts" | "clients"
  | "analytics" | "guardrails" | "settings" | "graph" | "crm";

export interface BrandProfile {
  name: string;
  audience: string;
  voice: string;
  prohibitedTopics: string[];
  requiredDisclosures: string[];
}

export interface ContentDraft {
  id: string;
  topic: string;
  platform: Platform;
  text: string;
  hashtags: string[];
  status: DraftStatus;
  metadata?: Record<string, unknown>;
  createdAt: string | Date;
  engagementScore?: number;
  author?: string;
  scheduledAt?: string | Date;
  publishedAt?: string | Date;
  clientId?: string | null;
}

export interface AnalyticsMetric {
  platform: string;
  impressions: number;
  engagements: number;
  clicks: number;
  followersGained: number;
  change?: number;
  rate?: number;
}

// Nested `posts` kept intentionally — ClientsTable renders c.posts.count and
// has since v1. The API layer maps Prisma's flat postCount/lastPostAt into
// this shape via toClientDTO() rather than changing every consumer.
export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  status: ClientStatus;
  approved: boolean;
  posts: { count: number; lastPost: Date | string };
  revenue: number;
  accountManager?: string | null;
  tags: string[];
  notes?: string | null;
  lastActivity: string;
}

export interface ClientStats {
  total: number;
  active: number;
  prospects: number;
  churned: number;
  totalRevenue: number;
  totalPosts: number;
}

export function toClientDTO(row: {
  id: string; name: string; company: string; email: string;
  phone: string | null; website: string | null; industry: string | null;
  status: ClientStatus; approved: boolean; revenue: number;
  accountManager: string | null; tags: string[]; notes: string | null;
  postCount: number; lastPostAt: Date | null; lastActivity: Date; createdAt: Date;
}): Client {
  return {
    id: row.id, name: row.name, company: row.company, email: row.email,
    phone: row.phone, website: row.website, industry: row.industry,
    status: row.status, approved: row.approved,
    posts: { count: row.postCount, lastPost: row.lastPostAt ?? row.createdAt },
    revenue: row.revenue, accountManager: row.accountManager,
    tags: row.tags, notes: row.notes,
    lastActivity: row.lastActivity.toISOString(),
  };
}

export const initialBrandProfile: BrandProfile = {
  name: "", audience: "", voice: "", prohibitedTopics: [], requiredDisclosures: [],
};

export const initialClients: Client[] = [
  {
    id: "1", name: "Ada Reyes", company: "Acme Corp", email: "contact@acme.com",
    status: "ACTIVE", approved: true,
    posts: { count: 42, lastPost: new Date() },
    revenue: 12500, tags: [], lastActivity: "2024-01-15",
  },
];

export const initialAnalytics: AnalyticsMetric[] = [
  { platform: "meta", impressions: 100, engagements: 12, clicks: 5, followersGained: 3, change: 0, rate: 0 },
];

export const initialDrafts: ContentDraft[] = [
  {
    id: "1", topic: "Welcome to SMMAI", platform: "meta",
    text: "Get started with social media management automation.",
    hashtags: ["#content", "#automation"], status: "published",
    metadata: {}, createdAt: new Date().toISOString(),
  },
];
```

---

## 5. Data layer — make persistence real

This is prerequisite work for every module below — none of Contacts, Pipeline, or Leads means anything if it doesn't survive a page refresh.

### 5.1 The client is currently fake

`src/lib/prisma.ts` and `src/generated/prisma/index.ts` are hand-written stand-ins, not `prisma generate` output — every call returns `null`/`[]`/a hardcoded object regardless of input. Delete both, gitignore the generated output going forward, and regenerate for real:

```bash
git rm -r nextjs-setup/nextjs-dashboard/src/generated/prisma
```

```diff
+# Prisma generated client — regenerated on install, never commit or hand-edit
+/nextjs-setup/nextjs-dashboard/src/generated/prisma/
```

```ts
// src/lib/prisma.ts
import { PrismaClient } from "@/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const adapter = new PrismaNeon({ connectionString });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

The Neon driver adapter (already an installed dependency, just never wired up) matters regardless of host: any function-per-request runtime — Vercel, Netlify Functions, anything stateless — will exhaust a database's TCP connection limit under concurrent load if each invocation opens a plain connection. This is a correctness fix, not a platform-specific one.

`package.json`:
```diff
   "scripts": {
     "dev": "next dev",
-    "build": "next build",
+    "build": "prisma generate && next build",
     "start": "next start",
     "seed": "tsx prisma/seed.ts",
+    "postinstall": "prisma generate",
     "lint": "eslint"
   },
```

Also pin `prisma` (the CLI) to match the already-correct `@prisma/client`/`@prisma/adapter-neon` version — it's currently on an unrelated pre-release line (`8.0.0-rc.17`) of a completely different, still-changing CLI product that doesn't even have a `generate` command:

```diff
-    "prisma": "8.0.0-rc.17",
+    "prisma": "7.10.0",
```

### 5.2 Schema fixes

Two changes to `prisma/schema.prisma`, neither host-specific:

**Connection config moved out of the schema file** (current Prisma requires this — `url`/`directUrl` in the `datasource` block now fails validation):

```diff
 datasource db {
   provider  = "postgresql"
-  url       = env("DATABASE_URL")
-  directUrl = env("DIRECT_URL")
 }
```

New `prisma.config.ts`:
```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: env("DIRECT_URL") },
});
```

**Enum casing** — the schema's `ClientStatus` enum (`PROSPECT`/`ACTIVE`/`PAUSED`/`CHURNED`) disagrees with the two UI files that reference client status (`ClientForm.tsx` default, `ClientsTable.tsx`'s status-color map both use lowercase). Per §3's rule: fewer, never-shipped call sites on the frontend side, so the frontend conforms to the schema — one line each:

```diff
 // ClientForm.tsx
-  status: "prospect",
+  status: "PROSPECT",
```
```diff
 // ClientsTable.tsx
 const statusColor: Record<ClientStatus, { bg: string; color: string }> = {
-  prospect: {...}, active: {...}, paused: {...}, churned: {...},
+  PROSPECT: {...}, ACTIVE: {...}, PAUSED: {...}, CHURNED: {...},
 };
```

`DraftStatus` runs the other direction — four already-working files (`ContentDraftCard.tsx`, `StatusPill.tsx`, `ApprovalQueue.tsx`, `CRMDashboard.tsx`) use lowercase, so the schema conforms to them instead:

```diff
 enum DraftStatus {
-  DRAFT
-  PENDING
-  APPROVED
-  REJECTED
-  SCHEDULED
-  PUBLISHED
+  draft
+  pending
+  approved
+  rejected
+  scheduled
+  published
 }
```

No migrations exist yet in `prisma/migrations/` — this schema has never touched a real database, so both changes are free right now and get expensive (a migration) the moment that's no longer true.

### 5.3 Response shaping

`clients/route.ts` and `clients/[id]/route.ts` should map every Prisma row through `toClientDTO()` (§4) before returning it, so the flat `postCount`/`lastPostAt` columns become the nested `posts: { count, lastPost }` shape `ClientsTable.tsx` already expects:

```diff
-    const clients = await prisma.client.findMany({ where, orderBy: {...} });
+    const clients = (await prisma.client.findMany({ where, orderBy: {...} })).map(toClientDTO);
```

---

## 6. API layer fixes

**`drafts/route.ts`** — currently reads a hardcoded array and fakes success on write. Real implementation:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (platform && platform !== "all") where.platform = platform;

  const drafts = await prisma.contentDraft.findMany({ where, orderBy: { createdAt: "desc" } });
  const counts = {
    all: drafts.length,
    pending: drafts.filter((d) => d.status === "pending").length,
    approved: drafts.filter((d) => d.status === "approved").length,
    draft: drafts.filter((d) => d.status === "draft").length,
    rejected: drafts.filter((d) => d.status === "rejected").length,
    published: drafts.filter((d) => d.status === "published").length,
  };
  return NextResponse.json({ drafts, total: drafts.length, counts });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const draft = await prisma.contentDraft.create({
      data: {
        topic: body.topic || "Untitled Campaign Draft",
        platform: body.platform || "instagram",
        text: body.text || "",
        hashtags: body.hashtags || [],
        status: "pending",
        author: body.author || "Marketing Team",
        engagementScore: Math.floor(Math.random() * 20) + 75,
        clientId: body.clientId ?? null,
      },
    });
    return NextResponse.json({ success: true, draft }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create draft" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, status } = (await request.json()) as { id: string; status: string };
    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }
    const draft = await prisma.contentDraft.update({ where: { id }, data: { status } });
    return NextResponse.json({ success: true, draft });
  } catch {
    return NextResponse.json({ error: "Failed to update draft" }, { status: 500 });
  }
}
```

**`publish/route.ts`** — drop the `setTimeout(..., 5000)` after the response. Any function-per-request host can tear down the process once a response is sent; there's no guarantee a 5-second-later callback runs, on Netlify Functions or anywhere else. Do the state transition through Next.js's `after()` (a Next.js API, not a hosting-platform one — it runs registered work after the response is flushed, wherever the app is deployed with a Next.js runtime that supports it):

```ts
import { after, NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  // ...existing validation...
  const job = await prisma.publishJob.create({
    data: { draftId: String(draftId), platform: String(platform), status: "PENDING" },
  });

  after(async () => {
    try {
      await prisma.publishJob.update({ where: { id: job.id }, data: { status: "SUCCEEDED", completedAt: new Date() } });
      await prisma.contentDraft.update({ where: { id: String(draftId) }, data: { status: "published", publishedAt: new Date() } });
    } catch (err) {
      await prisma.publishJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: err instanceof Error ? err.message : "Unknown error", completedAt: new Date() },
      });
    }
  });

  return NextResponse.json({ job }, { status: 201 });
}
```

If you haven't verified `after()` is supported on your actual deployment target, the fallback is to do the state transition synchronously before responding — slightly slower, but doesn't depend on any post-response guarantee at all. Given `DRY_RUN=true` by default and no real publish integration wired up yet, synchronous is genuinely fine for now.

**`status/route.ts`** — dry-run/safety state currently lives in a module-level `let`, which isn't guaranteed to survive between invocations on any stateless runtime. This is the one fix in this section with real safety stakes (it's the toggle between simulated and live posting). Back it with a one-row table:

```prisma
model SystemState {
  id          String   @id @default("singleton")
  dryRun      Boolean  @default(true)
  wasmRanking Boolean  @default(false)
  updatedAt   DateTime @updatedAt
}
```

```ts
const state = await prisma.systemState.upsert({
  where: { id: "singleton" }, update: {}, create: { id: "singleton" },
});
```

---

## 7. Navigation & the Inbox/Contacts/Pipeline/Leads/Marketing decision

### 7.1 Consolidate three navs into one

`DashboardHeader.tsx`, `DashboardShell.tsx`'s sidebar, and `LayoutControlBar.tsx` each define their own section list, all bound to the same `currentSection` state:

```
DashboardHeader  (top tabs): Overview, Approval, Drafts, Clients, Analytics, Settings
DashboardShell   (sidebar):  Approval Gate, Architecture Graph, Analytics Loop, Brand Guardrails, CRM
LayoutControlBar (toolbar):  Approval Gate, Architecture Graph, Analytics Loop, Brand Guardrails
```

Neither of the last two matches the content switch in `dashboard/page.tsx` exactly either — Overview, Drafts, and Settings are currently dead tabs (no matching render case). Keep `DashboardHeader`'s set as the single source of truth, delete the other two nav lists (their non-nav responsibilities — sidebar branding, view/density/platform controls — can stay), and make the content switch match it exactly.

### 7.2 Where each requested module actually goes

| Nav item | Decision | Why |
|---|---|---|
| **Contacts** | Rename the existing "Clients" tab to "Contacts" (or keep "Clients" — see note), and wire `ClientsTable` into it (`page.tsx`'s `clients` case currently renders a static placeholder instead) | The component is done. This is a one-line render swap once §5–§6 land. |
| **Pipeline** | New. Model as a `stage` field on a deal/opportunity entity, separate from `Client`. Minimum schema: `Deal { id, clientId, title, value, stage, expectedCloseDate, ownerId }` with `stage` as an enum (`NEW → QUALIFIED → PROPOSAL → WON/LOST`, adjust to your actual sales process). UI: a Kanban board grouped by stage, or a simple filtered table if a board is more than you need at first. This does not need to touch the content/publishing side of the app at all — it's a parallel, independent module. |
| **Leads** | Recommend **not** a separate entity. Model as `ClientStatus = PROSPECT` (already exists in the schema) representing the lead stage of a Contact's lifecycle, rather than duplicating contact fields in a second table. If leads need materially different fields than clients (source, campaign attribution, qualification score), that's a signal to add optional fields to `Client` rather than fork the model — a lead that converts should become the same record, not a new one. |
| **Marketing** | Ambiguous as stated — resolve before building. Two real interpretations: (a) it's another name for what "Content"/"Drafts"/"Approval" already do, in which case rename rather than build; (b) it means campaigns — grouping multiple drafts under a shared objective/budget/date range, which is genuinely new (a `Campaign` model that `ContentDraft` optionally belongs to). Pick one on purpose; don't build a second content-scheduling surface that competes with the one that already works. |
| **Inbox** | New, and the largest of the five. Per `smmai-plan-v3.md` §10.4: comments, mentions, messages, sentiment, assignment, reply, resolved/unresolved, unread counts, SLA age. This depends on platform integrations that don't exist yet (the app currently has no live connection to Meta/LinkedIn/etc. — `DRY_RUN=true`, no adapters wired to real APIs). Sequence this after Pipeline/Leads, not before — it has real external dependencies the others don't. |

### 7.3 Delete, don't carry forward

- `ClientManagement.tsx` — dead placeholder, not imported anywhere.
- `CRMDashboard.tsx` and the sidebar's "CRM" nav item — duplicates four sections already reachable individually. A single "CRM" catch-all composition stops making sense once Contacts/Pipeline/Leads are real, separate sections in their own right.
- `graph` (Architecture Graph) as a top-level tab — it's a developer diagnostic, not a CRM feature. Move it behind a dev-only route rather than the main nav.

---

## 8. Sequencing

Not five equal tasks — ordered by dependency and actual size:

**Now (prerequisite, blocks everything else)**
1. §5 — real Prisma client, schema fixes, response shaping
2. §4 — unified `crm.ts`
3. §6 — real `drafts`/`publish`/`status` routes

**Next (small, mostly wiring)**
4. §7.1 — consolidate to one nav
5. §7.2 Contacts — rename Clients tab, render the real `ClientsTable`
6. §7.3 — delete dead/duplicate code

**Then (new, but small and self-contained)**
7. Pipeline — `Deal` model + stage board, independent of the content/publishing system
8. Leads — add lifecycle fields to `Client` if needed; likely no new model at all

**Later (genuinely bigger, has external dependencies)**
9. Marketing — resolve the naming/scope question first (§7.2), then build only what that decision requires
10. Inbox — needs real platform API connections before the UI is more than a mockup; sequence after those adapters exist

Doing Pipeline or Leads before Now/Next is done just means building a second feature on top of the same fake persistence layer that broke Contacts — same mistake, one module later.

---

## 9. Definition of done, per module

- **Contacts:** create/edit/delete a contact, see it survive a refresh, filter by status, status dropdown values match what's actually stored.
- **Pipeline:** create a deal against a contact, move it between stages, see the board reflect the change after a refresh.
- **Leads:** a contact created with status `PROSPECT` is distinguishable in the UI from an `ACTIVE` client without a separate table to query.
- **Marketing:** scope decision documented in this file or its successor before any code is written under this name.
- **Inbox:** not started until at least one real platform adapter exists to source real comments/mentions from — a mocked inbox with no data source behind it is worse than not building it, since it looks done and isn't.

---

## 10. Open decisions for you to make

These aren't technical — they're product calls this plan deliberately didn't make on your behalf:

1. **Contacts vs. Clients naming** — does "Contacts" replace "Clients" everywhere (nav label, API routes, DB table), or is "Clients" the correct term for your actual users and "Contacts" was just the generic CRM word you reached for? Renaming touches the nav label only if you keep the underlying `Client` model name; touches routes and schema if you want the word "Contact" throughout.
2. **Marketing scope** (§7.2) — rename existing content workflow, or build a real campaigns concept above it?
3. **Pipeline stages** — what are your actual deal stages? The four-stage example in §7.2 is a placeholder, not a recommendation specific to your sales process.
4. **Leads qualification** — does a lead need fields a client doesn't (source, score, campaign)? If yes, add them as optional fields on `Client` now, before Pipeline/Leads work starts, so there's one migration instead of two.

---

## 11. Execution status (updated 2026-09-30)

Everything below was implemented against the live `dev` tree and validated by running the app. Where the plan's §1/§2 inventory had gone stale (the `20260929120000_architecture_upgrade` migration had landed `Contact`, `Lead`, `Pipeline`, `PipelineStage`, `Opportunity`, `Activity`, `AuditLog`, `IdempotencyRecord`, `IntegrationConnection`, `AnalyticsSnapshot`), the schema won, per §3: the DB shape is the source of truth.

### Done

| Plan item | What shipped |
|---|---|
| §5.1 Real client | Already landed earlier (`@/generated/prisma/client` + Neon adapter); added `postinstall: prisma generate`, fixed the corrupted `.gitignore` (it contained PowerShell here-string source as content), untracked `src/generated/prisma/` via `git rm -r --cached` |
| §5.2 Connection config | `prisma.config.ts` holds `datasource.url`; no `url`/`directUrl` in the schema (verified `migrate status`: up to date) |
| §5.2 Enum casing | **Resolved the other way round from the original plan.** The plan predates the applied migrations; the DB held uppercase `DraftStatus`, and the cost had shifted to the UI side (46 lowercase call sites against 9 uppercase). Migration `20260930090000_draft_status_lowercase` renames all six enum labels in place, and the nine uppercase writers (`drafts` POST/PATCH, `publish` ×3, `engagement` ×2, `seed`) now write lowercase. Side effect: `analytics`, `automation`, `drafts` counts, `overview` counts and every status pill went from silently broken to correct |
| §5.3 Response shaping | `toClientDTO()` already applied in both client routes |
| §6 API layer | `drafts` is real CRUD; `publish` uses `after()` instead of `setTimeout`; `status` is DB-backed via `SystemState`. `overview` was returning a duplicate of `drafts` while `CommandCenter` expected `metrics` + `recentActivities`, so every card rendered as a dash; it now returns real workspace counts and the five most recent activities |
| §7.1 One nav | Single source of truth in `DashboardShell`; render switch matches it |
| §7.2 Contacts | `ClientsTable` (with `ClientForm`, `ClientStatsCards`) renders in the `clients` section; the old static placeholder is gone |
| §7.2 Pipeline | New `GET/POST/PATCH /api/crm/pipeline` over the existing `Pipeline`/`PipelineStage`/`Opportunity` models. `GET` auto-provisions a default pipeline and its stages. Moving an opportunity to a stage named won/lost also sets its terminal status. New `PipelineBoard` renders the stage board, the create-opportunity form, and the leads panel |
| §7.2 Leads | Schema already had a real `Lead` model, so leads are a first-class record here rather than a `ClientStatus` fork. Create + status transitions work end to end; the Contacts status filter still satisfies the original §9 lead/contact distinction |
| §7.3 Deletes | `ClientManagement.tsx` and `CRMDashboard.tsx` gone; `graph` is now dev-only in the nav |
| §9 DoD, Contacts | Create, edit, delete, filter by status, survives refresh, dropdown values match the stored enum |
| §9 DoD, Pipeline | Create an opportunity (optionally linked to a lead), move it between stages, board reflects the change after a reload |
| Quality pass | The three now-visible CRM components carried hardcoded light-theme colors that would have rendered as white blocks on the dark dashboard; they now use `DESIGN.md` tokens. Removed the `react-hooks/set-state-in-effect` violation in `ClientsTable` and `ApprovalQueue` and kept the new component clean |

### Decisions taken (answers to §10)

1. **Contacts vs Clients naming** — kept **Clients** for the nav label, API routes, and the `Client` model. `crm-plan-v2.md` §7.2 allowed either; keeping the existing vocabulary is the zero-churn option and the rename stays a one-line change if you want "Contacts" later.
2. **Marketing scope** — treated as interpretation (a): a later rename/rescope of the existing Content/Drafts/Approval workflow. **No code was written under the "Marketing" name**, which is what §9 required before any such build.
3. **Pipeline stages** — seeded as the plan's placeholder: New (10%), Qualified (30%), Proposal (60%), Won (100%), Lost (0%). They live as rows in `PipelineStage`, so replacing them with your real process is a data change, not a code change.
4. **Leads qualification** — no `Client` fork and no new fields; the `Lead` model already carries `source`, `value`, `status`, and `ownerUserId`.

### Deliberately not started

- **Inbox** (§9): still gated on a real platform adapter, as the plan requires. Its nav entry now carries a visible "Coming soon" label instead of describing itself as already built.
- **Marketing build** (§7.2): waits on decision 2 above being confirmed as a rename rather than a new campaigns concept.

