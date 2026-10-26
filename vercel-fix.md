# `vercel-fix.md`

```markdown
# Vercel Deployment Fix Guide

This document records every issue encountered deploying `social-media-smm-automation`
to Vercel and the exact fix for each. Follow it top-to-bottom on a fresh checkout
if the build ever breaks again.

Repo: `github.com/VitrixLab-Philippines/social-media-smm-automation`
Stack: pnpm monorepo → Next.js 16.3.6 app in `nextjs-setup/nextjs-dashboard`

---

## Table of Contents

1. [Monorepo layout](#1-monorepo-layout)
2. [Vercel project settings](#2-vercel-project-settings)
3. [`.gitignore` fixes](#3-gitignore-fixes)
4. [Root `package.json` vs lockfile](#4-root-packagejson-vs-lockfile)
5. [`src/lib/crm.ts` types](#5-srclibcrmts-types)
6. [API route fixes](#6-api-route-fixes)
7. [Component fixes](#7-component-fixes)
8. [Shared `DashboardViewSection` type](#8-shared-dashboardviewsection-type)
9. [Verification checklist](#9-verification-checklist)

---

## 1. Monorepo layout

```
social-media-smm-automation/
├── package.json                 # root: only `serve`
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── .gitignore
└── nextjs-setup/
    └── nextjs-dashboard/        # ← the actual Next.js app
        ├── package.json         # has `next`, `react`, etc.
        ├── next.config.ts
        └── src/
            ├── app/
            ├── components/
            └── lib/
                └── crm.ts
```

**Rule:** the Next.js app is *not* at the repo root. Vercel must be told this.

---

## 2. Vercel project settings

**Dashboard → Project → Settings → General → Root Directory**

```
nextjs-setup/nextjs-dashboard
```

**Build & Development Settings** — leave at defaults:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Install Command | *(default — `pnpm install`)* |
| Build Command | *(default — `pnpm build`)* |
| Output Directory | *(default — `.next`)* |

**Do NOT** put a `vercel.json` at the repo root that `cd`s into the app folder —
Vercel already starts inside the Root Directory, so a `cd nextjs-setup/...` will
fail with `No such file or directory`.

If you want a `vercel.json`, place it **inside** `nextjs-setup/nextjs-dashboard/`,
not at the repo root.

### Why

Vercel runs its build inside the Root Directory. Framework detection and
`next build` both need to see `next` in the local `package.json`. Pointing the
Root Directory at the app folder satisfies both.

---

## 3. `.gitignore` fixes

The stock Python `.gitignore` template was in use and had two problems.

### Problem A — `lib/` matched at every depth

```
# ❌ matches src/lib/, node_modules/*/lib/, etc.
lib/
```

This silently excluded `nextjs-setup/nextjs-dashboard/src/lib/crm.ts` from every
commit. The file existed locally but was never on `main`, so Vercel failed with:

```
Module not found: Can't resolve '@/lib/crm'
```

**Fix** — anchor the rule to the repo root, or delete it (this isn't a Python project):

```gitignore
# only matches <repo-root>/lib/
/lib/
```

To verify the file is no longer ignored:

```bash
git check-ignore -v nextjs-setup/nextjs-dashboard/src/lib/crm.ts
# should print NOTHING
```

If other source files are still being ignored:

```bash
git status --ignored | grep -i '/lib/'
```

### Problem B — corrupted trailing line

The last line was a mangled `. p n p m - s t o r e /` (spaced-out characters).
Delete it, or replace with a clean version:

```gitignore
.pnpm-store/
```

### Recommended minimal `.gitignore` for this repo

Replace the whole file with:

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build output
.next/
out/
build/
dist/

# Env
.env
.env*.local

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Editor / OS
.DS_Store
.vscode/
.idea/

# Vercel
.vercel

# Turbopack
.turbo

# TypeScript
*.tsbuildinfo
next-env.d.ts
```

### Commit the recovered file

```bash
cd ~/smma
git add .gitignore
git add -f nextjs-setup/nextjs-dashboard/src/lib/crm.ts
git add nextjs-setup/nextjs-dashboard/src/lib/
git commit -m "Fix .gitignore: stop ignoring src/lib"
git push origin main
```

Verify on GitHub:

```
https://github.com/VitrixLab-Philippines/social-media-smm-automation/blob/main/nextjs-setup/nextjs-dashboard/src/lib/crm.ts
```

---

## 4. Root `package.json` vs lockfile

Do **not** add `next` to the root `package.json` just to trick Vercel's framework
detector. It causes:

```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile"
* 1 dependencies were added: next@14.2.6
```

because CI uses `--frozen-lockfile` and the lockfile wasn't regenerated.

**Correct approach:** keep the root `package.json` minimal (`serve` only), set the
Vercel Root Directory (§2), and never duplicate `next` at the root.

If you *do* modify any `package.json`, always regenerate the lockfile locally:

```bash
rm -rf node_modules nextjs-setup/nextjs-dashboard/node_modules
pnpm install
git add package.json pnpm-lock.yaml
git commit -m "Update lockfile"
```

---

## 5. `src/lib/crm.ts` types

The types must cover every value used across the app. Full working version:

```ts
// src/lib/crm.ts

export type Platform =
  | "meta"
  | "linkedin"
  | "twitter"
  | "x"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | (string & {}); // allows custom strings while keeping autocomplete

export type DraftStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published";

export type DashboardViewSection =
  | "overview"
  | "drafts"
  | "analytics"
  | "clients"
  | "settings";

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

export interface Client {
  id: string;
  name: string;
  email: string;
  approved: boolean;
  posts: { count: number; lastPost: Date | string };
  revenue: number;
  lastActivity: string;
}

export const initialBrandProfile: BrandProfile = {
  name: "",
  audience: "",
  voice: "",
  prohibitedTopics: [],
  requiredDisclosures: [],
};

export const initialClients: Client[] = [
  {
    id: "1",
    name: "Acme Corp",
    email: "contact@acme.com",
    approved: true,
    posts: { count: 42, lastPost: new Date() },
    revenue: 12500,
    lastActivity: "2024-01-15",
  },
];

export const initialAnalytics: AnalyticsMetric[] = [
  {
    platform: "meta",
    impressions: 100,
    engagements: 12,
    clicks: 5,
    followersGained: 3,
    change: 0,
    rate: 0,
  },
];

export const initialDrafts: ContentDraft[] = [
  {
    id: "1",
    topic: "Welcome to SMMAI",
    platform: "meta",
    text: "Get started with social media management automation.",
    hashtags: ["#content", "#automation"],
    status: "published",
    metadata: {},
    createdAt: new Date().toISOString(),
  },
];
```

### What each addition fixes

| Addition | Fixes |
|---|---|
| `"pending"` in `DraftStatus` | `drafts/route.ts`, `CRMDashboard.tsx`, `ContentDraftCard.tsx` comparisons |
| `"scheduled"` in `DraftStatus` | `StatusPill.tsx` `Record<DraftStatus, …>` (see §7) |
| `export type Platform` | `ApprovalQueue.tsx: Module '"@/lib/crm"' has no exported member 'Platform'` |
| `engagementScore?`, `author?` | `ContentDraftCard.tsx` `TS2339` |
| `createdAt: string \| Date` | `CRMDashboard.tsx: Type 'Date' is not assignable to type 'string'` |
| `change?`, `rate?` on metric | `AnalyticsCards.tsx` `TS2339` |
| `DashboardViewSection` | `page.tsx` / `DashboardShell.tsx` type mismatch (§8) |

---

## 6. API route fixes

### `src/app/api/crm/publish/route.ts`

Three bugs: wrong initializer, non-literal status, and `push` reassignment.

```ts
// src/app/api/crm/publish/route.ts
import { NextRequest, NextResponse } from "next/server";

type JobStatus = "pending" | "succeeded" | "failed";

interface Job {
  id: string;
  draftId: string;
  platform: string;
  status: JobStatus;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// ❌ was: const jobs: Record<string, Job[]> = [];
const jobs: Record<string, Job[]> = {};

// ...

const newJob: Job = {
  id: crypto.randomUUID(),
  draftId: String(draftId),
  platform: String(platform),
  status: "pending", // ← literal, not a generic `string`
  createdAt: new Date().toISOString(),
};

// ❌ was: jobs[draftId] = jobs[draftId].push(newJob);
jobs[draftId] = jobs[draftId] ?? [];
jobs[draftId].push(newJob);
```

**Errors this fixes**

- `TS2322: Type 'never[]' is not assignable to type 'Record<…>'`
- `TS2322: Type 'string' is not assignable to type '"pending" | "succeeded" | "failed"'`
- `TS2349: This expression is not callable` (because `push` returns a number)
- `TS7006: Parameter 'j' implicitly has an 'any' type`

### `src/app/api/crm/drafts/route.ts`

No change needed once `DraftStatus` includes `"pending"` (§5).

### `src/app/api/crm/brand/route.ts`

No change needed once `@/lib/crm` resolves (§3).

---

## 7. Component fixes

### `src/components/ui/StatusPill.tsx`

`Record<DraftStatus, …>` must have a key for **every** member of `DraftStatus`.

```ts
import { DraftStatus } from "@/lib/crm";

const STATUS_STYLES: Record<
  DraftStatus,
  { label: string; bg: string; color: string; border: string }
> = {
  draft:     { label: "Draft",     bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
  pending:   { label: "Pending",   bg: "#fef3c7", color: "#92400e", border: "#fcd34d" },
  approved:  { label: "Approved",  bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  rejected:  { label: "Rejected",  bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  scheduled: { label: "Scheduled", bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  published: { label: "Published", bg: "#e0e7ff", color: "#3730a3", border: "#a5b4fc" },
};
```

If the union changes, update this map in lock-step.

### `src/components/layout/DashboardHeader.tsx`

`onClick={setViewMode}` passes the click event as the argument. Wrap it:

```tsx
// ❌
<button onClick={setViewMode}>Grid</button>
<button onClick={setDensity}>Compact</button>

// ✅
<button onClick={() => setViewMode("grid")}>Grid</button>
<button onClick={() => setViewMode("list")}>List</button>
<button onClick={() => setDensity("spacious")}>Spacious</button>
<button onClick={() => setDensity("compact")}>Compact</button>
```

Do the same for every `onClick={set…}` in the file.

### `src/components/crm/ContentDraftCard.tsx`

Six `TS2722: Cannot invoke an object which is possibly 'undefined'` errors come
from optional callbacks being called without a guard.

**Fix (single change):** default each callback to a no-op.

```tsx
interface ContentDraftCardProps {
  draft: ContentDraft;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onPublish?: (id: string) => void;
  onEdit?: (id: string) => void;
}

function ContentDraftCard({
  draft,
  onApprove = () => {},
  onReject = () => {},
  onPublish = () => {},
  onEdit = () => {},
}: ContentDraftCardProps) {
  // ...
}
```

Alternative: call with optional chaining (`onApprove?.(draft.id)`) — but the
no-op default is less churn.

### `src/components/crm/ApprovalQueue.tsx`

**Error `(109,18)`** — the toast object is missing `message` and `type`.

Either supply them:

```tsx
setToast({ show: false, message: "", type: "" });
```

Or make the state a discriminated union (cleaner):

```tsx
type ToastState =
  | { show: false }
  | { show: true; message: string; type: "success" | "error" | "info" };

const [toast, setToast] = useState<ToastState>({ show: false });
```

**Error `(110,9)` — `loadDrafts` is not defined.** Add it with `useCallback`
and call it from an effect.

```tsx
import { useCallback, useEffect, useState } from "react";

const loadDrafts = useCallback(async () => {
  try {
    const res = await fetch("/api/crm/drafts");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setDrafts(Array.isArray(data) ? data : data.drafts ?? []);
  } catch {
    setToast({ show: true, message: "Failed to load drafts", type: "error" });
  }
}, []);

useEffect(() => {
  loadDrafts();
}, [loadDrafts]);
```

Reference `loadDrafts` later (e.g. after approve/reject) and it will resolve.

---

## 8. Shared `DashboardViewSection` type

Two errors, one on each side of a prop:

- `dashboard/page.tsx(40,9): Type 'Dispatch<SetStateAction<DashboardViewSection>>' is not assignable to type '(section: string) => void'`
- `DashboardShell.tsx(73,50): Argument of type 'string' is not assignable to parameter of type 'DashboardViewSection'`

Both sides must agree on **one** type. Export it from `crm.ts` (§5) and import it
in both files.

```tsx
// src/app/dashboard/page.tsx
import { DashboardViewSection } from "@/lib/crm";

const [section, setSection] = useState<DashboardViewSection>("overview");
```

```tsx
// src/components/layout/DashboardShell.tsx
import { DashboardViewSection } from "@/lib/crm";

interface DashboardShellProps {
  activeSection: DashboardViewSection;
  onSectionChange: (section: DashboardViewSection) => void;
  // ...
}
```

If you prefer loose typing, widen **both** sides to `string` — just don't mix
`string` on one side and `DashboardViewSection` on the other.

---

## 9. Verification checklist

Before pushing, always run the build locally:

```bash
cd ~/smma/nextjs-setup/nextjs-dashboard
pnpm build
```

You should see, in order:

```
▲ Next.js 16.3.6 (Turbopack)
  Creating an optimized production build ...
✓ Compiled successfully
  Running TypeScript ...
  Collecting page data ...
✓ Generating static pages
  Finalizing page optimization ...

Route (app)                              Size     First Load JS
...
```

No `Failed to type check.` and no `ELIFECYCLE Command failed`.

Then commit and push:

```bash
cd ~/smma
git add .
git commit -m "Fix Vercel build: types, routes, and .gitignore"
git push origin main
```

### Post-deploy smoke tests

Once Vercel shows **Ready**, hit the deployed URL and check:

- [ ] `/` renders
- [ ] `/dashboard` renders
- [ ] `/dashboard` → drafts section loads (exercises `loadDrafts` + `ApprovalQueue`)
- [ ] `GET /api/crm/drafts` returns JSON
- [ ] `GET /api/crm/brand` returns JSON
- [ ] `POST /api/crm/publish` returns a job object (not `jobs is not callable`)

---

## Quick reference — error → fix

| Build error | Fix | Section |
|---|---|---|
| `next: command not found` | Set Root Directory, don't `cd` in build cmd | §2 |
| `No Next.js version detected` | Root Directory must be the app folder | §2 |
| `ERR_PNPM_OUTDATED_LOCKFILE` | Regenerate lockfile, don't duplicate `next` at root | §4 |
| `Module not found: Can't resolve '@/lib/crm'` | `.gitignore` `lib/` → `/lib/`; commit the file | §3 |
| `StatusPill.tsx` missing `scheduled` | Add key to `STATUS_STYLES` | §7 |
| `publish/route.ts` job errors | `jobs = {}`, literal `"pending"`, use `.push` | §6 |
| `ContentDraftCard.tsx` possibly undefined | Default callbacks to `() => {}` | §7 |
| `ApprovalQueue.tsx` toast / loadDrafts | Full toast object, define `loadDrafts` | §7 |
| `DashboardHeader.tsx` onClick type | `onClick={() => setViewMode("grid")}` | §7 |
| `DashboardViewSection` mismatch | Shared type from `crm.ts` | §8 |

---

*Last updated: after commit `b89c453` → passing build.*
```

**How to use it:** save as `vercel-fix.md` at the repo root, commit it, and refer back any time the build regresses. The sections are ordered by the sequence we actually hit the errors, so if you start from a clean checkout and follow §2 → §3 → §4 → §5 → §6 → §7 → §8, you'll land on a green Vercel build without re-discovering any of these.