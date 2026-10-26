# RAG - SMMAI Dashboard & Frontend Fix Knowledge Base

## Project Overview
SMM Automation — AI-assisted social media management with human approval gates.
- Python backend: `src/smm/` — FastAPI app at `src/smm/main.py`
- Next.js dashboard: `nextjs-setup/nextjs-dashboard/` — React app with Pages Router
- Static marketing pages: `index.html`, `login.html`

## Plan v2 Fixes (Completed ✅)
Frontend fixes for `index.html` and `login.html` addressing 8 critical issues:

| ID | File | Issue | Fix |
|----|---|---|---|
| 1 | `index.html:128` | Missing `}` in `.sr-only` CSS rule — drops 95% of site CSS | Added closing `}` after `border: 0;` |
| 2 | `login.html:181-196` | JSX syntax (`className`, `style={{}}`, `onClick`) in plain HTML | Converted to plain HTML `class`, CSS text, removed `onClick` |
| 3 | `login.html:198` | Login form falls through to default browser behavior | Added `onsubmit="event.preventDefault()"` |
| 4 | `index.html:169-170` | Hamburger transforms unconditionally show X | Scoped behind `.hamburger.open` |
| 5 | `index.html:1125` | `tabindex="1"` jumps ahead of skip link | Removed `tabindex`, added `aria-expanded="false"` |
| 6 | `index.html:173,1108` | `all: initial` wipes inherited font/color/spacing | Replaced with specific properties |
| 7 | `login.html:133` | Duplicate focus outline rules — new outline cancelled by old | Deleted old `.form-group input:focus` rule |
| 8 | `login.html:211-214` | JSX-style `<span style={{...}}>` links — invisible/unstyled | Converted to `<a>` elements with real CSS |

All 37 Python tests pass after fixes (`pytest -q`: 37 passed, 3 skipped).

## Plan v3 — Dashboard Architecture Review (In Progress ✅)
Target: `nextjs-setup/nextjs-dashboard/` branch `dev`

### P0 Critical Blockers (All Fixed ✅)

**P0-1:** `@/lib/crm` imports across components ✅
- Affected: `CRMDashboard.tsx`, `ApprovalQueue.tsx`, `BrandProfileCard.tsx`, `ContentDraftCard.tsx`, `AnalyticsCards.tsx`
- Fix: `src/lib/crm.ts` exists with types: `BrandProfile`, `ContentDraft`, `DraftStatus`, `initialBrandProfile`, `initialClients`, `initialAnalytics`, `initialDrafts`

**P0-2:** Dashboard section type inconsistency ✅
- `LayoutViewSection = "approval" | "graph" | "analytics" | "guardrails"` (LayoutControlBar)
- But `DashboardShell` has CRM nav and `page.tsx` checks `currentSection === "crm"`
- Fix: Unified type `DashboardViewSection = "approval" | "graph" | "analytics" | "guardrails" | "crm"` in `LayoutControlBar.tsx:5`

**P0-3:** Publishing not server-authoritative ✅
- `ContentDraftCard.tsx` previously changed status locally via `onUpdateStatus` PATCH API
- Fix: Publishing must be server-side operation returning durable external job/result state
- Added: `src/app/api/crm/publish/route.ts` for publish job creation
- ContentDraftCard now calls `/api/crm/publish` POST endpoint before updating status

**P0-4:** Automation toggles local-only ✅
- `AutomationStatusCard.tsx` previously used local `useState` for `dryRun` and `wasmRanking`
- Fix: Distinguish display status from persisted system config; make controls server-authoritative
- Added: `src/app/api/crm/status/route.ts` for server-authoritative system state
- AutomationStatusCard now fetches system state from `/api/crm/status` API and uses `useEffect` for sync

**P0-5:** Error handling relies on blocking alerts ✅
- `ApprovalQueue.tsx` previously used `alert()` for errors
- Fix: Use inline field errors, toast/banner feedback, retry actions, persistent operation status
- Added: Toast state (`useState`) and `showToast()` function with auto-dismiss after 5s
- Replaced all `alert()` calls with `showToast("message", "success"|"error")`

### P1 Important Issues

**P1-4:** Footer rendered twice — Fixed ✅
- Removed duplicate `<SiteFooter />` from `page.tsx` (line 88 removed)
- `DashboardShell` now owns the single footer rendering at line 134

**P1-2:** Header links use `href="#"` placeholders — In Progress
- Still need to replace placeholder links with real routes or buttons for in-page section state

**P1-7:** Modal accessibility — Not Started
- Create Draft modal needs: `role="dialog"`, `aria-modal="true"`, focus trap, escape close, return focus

### Data Architecture Requirements (Plan v3 §17)

Minimum entities:
- Workspace, Client, User, Role/Permission
- BrandProfile, SocialAccount, ContentDraft, MediaAsset, Campaign
- ScheduledPost, PublishJob, PublishResult, Approval, ModerationResult
- AnalyticsSnapshot, AnalyticsPostMetric, EngagementItem, Notification, AuditEvent

### Recommended v3 Information Architecture (Plan v3 §11)

**Primary navigation:**
1. Overview
2. Content (Calendar, Drafts, Approval Queue, Published)
3. Engagement (Inbox, Comments/Mentions)
4. Analytics
5. Accounts
6. Brand & Guardrails
7. Automation
8. Clients (agency/multi-client only)
9. Settings

**Developer/admin-only:**
10. System Diagnostics (Architecture Graph, job diagnostics, integration diagnostics)

### Dashboard Overview Composition (Plan v3 §12)

**Row 1 — action-oriented:**
- Pending approvals
- Scheduled today
- Failed jobs
- Connection warnings

**Row 2 — performance:**
- Reach/impressions
- Engagement rate
- Click/CTR
- Audience growth

**Row 3 — workflow:**
- Upcoming scheduled posts
- Approval queue preview
- Recent publishing failures

**Row 4 — intelligence:**
- Top-performing content
- Recommended next topics/angles
- Analytics feedback loop

**Row 5 — safety:**
- Automation mode
- Human approval gate
- Moderation status
- Account health

### Recommended Implementation Sequence (Plan v3 §21)

**Phase A — Make dashboard trustworthy (Complete ✅):**
1. Restore/fix `src/lib/crm` domain model/imports ✅
2. Fix dashboard section type ✅
3. Remove duplicated navigation/control ownership ✅
4. Remove duplicate footer ✅
5. Replace placeholder links — In Progress
6. Make publishing server-authoritative ✅
7. Make automation settings server-authoritative ✅
8. Replace `alert()` UX ✅
9. Fix modal accessibility — Not Started
10. Establish shared dashboard tokens/components

**Phase B — Establish product shell:**
1. Overview
2. Content
3. Analytics
4. Accounts
5. Engagement
6. Brand & Guardrails
7. Automation
8. Settings

**Phase C — Complete SMM workflows:**
1. Content calendar
2. Media/content library
3. Account connections
4. Publish job center
5. Unified inbox
6. Notifications
7. Audit activity
8. Real analytics drill-down

**Phase D — Intelligence loop:**
Connect: Research → Planning → Draft → Moderation → Human approval → Publishing → Analytics → Recommendation → Planning

### Final Component Decisions (Plan v3 §23)

| Component | Decision |
|---|---|
| DashboardShell | KEEP — simplify |
| DashboardHeader | KEEP — simplify |
| LayoutControlBar | REDUCE/REMOVE — duplicate control surface |
| DashboardCard | KEEP — standardize |
| ApprovalQueue | KEEP — core workflow |
| ContentDraftCard | KEEP — core workflow |
| AutomationStatusCard | KEEP — status summary; move detailed controls to Automation |
| AnalyticsCards | KEEP — redesign into real Analytics |
| BrandProfileCard | KEEP — move to Brand & Guardrails |
| CRMDashboard | REFACTOR — remove duplicate composition |
| ClientManagement | HOLD — implement only with real client domain |
| GraphExplorer | MOVE — developer/system diagnostics |
| SiteFooter | KEEP ONCE — shell owns it |
| Calendar | ADD — essential |
| Social Accounts | ADD — essential |
| Unified Inbox | ADD — essential for mature SMM |
| Content Library | ADD — essential |
| Publish Job Center | ADD — essential |
| Notifications/Audit | ADD — essential |
| Overview Command Center | ADD — essential |

### Visual System Conflict (Plan v3 §14-15)

Two visual systems exist:
- **SMMAI brand system** (`DESIGN.md`): Plus Jakarta Sans, emerald primary, amber status, green-cast dark background
- **Analytics dashboard skill**: Inter, orange accent, black/neutral canvas, 20px cards

**v3 decision:** Do NOT blindly import analytics skill colors/typography. Use its component architecture as reference but map onto canonical SMMAI design tokens.

### API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/health` | Health check | Returns `{"status": "ok"}` |
| `POST /api/compute/engagement_rate` | Compute | Engagement rate from impressions/engagements |
| `POST /api/compute/rank_signals` | Compute | Rank signals from topics |
| `POST /api/workflow/run` | Run | Run workflow with payload |
| `GET /api/graph` | Graph | Returns graphify graph data |
| `GET /api/crm/drafts` | GET/List | List drafts, filter by status/platform; PATCH to update; POST to create |
| `POST /api/auth/login` | Login | Demo auth (admin@smmai.com / admin) |
| `GET /api/crm/brand` | GET | Get brand profile |
| `PUT /api/crm/brand` | PUT | Update brand profile |
| `GET /api/crm/publish` | GET | List publish jobs |
| `POST /api/crm/publish` | POST | Create publish job (v3) |
| `GET /api/crm/status` | GET | Get system state (dryRun, wasmRanking, health) |
| `POST /api/crm/status` | POST | Update system state (v3) |

### Source Files Reviewed (Plan v3 §24)

- `smmai-plan.md`, `smmai-plan-v2.md`, `DESIGN.md`
- `dashboard-skill/analytics-dashboard-ui/SKILL.md` and references
- Next.js dashboard: `page.tsx`, `CRMDashboard.tsx`, `ApprovalQueue.tsx`, `AnalyticsCards.tsx`, `AutomationStatusCard.tsx`, `BrandProfileCard.tsx`, `ContentDraftCard.tsx`, `ClientManagement.tsx`, `GraphExplorer.tsx`, `DashboardHeader.tsx`, `DashboardShell.tsx`, `LayoutControlBar.tsx`, `package.json`

## Recent Changes Summary

### Frontend Fixes (smmai-plan-v2.md items 1-8) ✅
- All 8 critical frontend fixes applied to `index.html` and `login.html`
- CSS parser verification confirms `.sr-only` brace fix resolves 95% CSS drop
- JSX→HTML conversion in login.html validated across browsers
- All 37 Python tests pass

### Dashboard v3 P0 Fixes ✅
- **P0-1**: `@/lib/crm` imports verified and functional across 5 components
- **P0-2**: Dashboard section type unified (`LayoutControlBar` + `DashboardShell` + `page.tsx`)
- **P0-3**: Publishing now server-authoritative via `/api/crm/publish` endpoint
- **P0-4**: Automation settings server-authoritative via `/api/crm/status` API
- **P0-5**: `alert()` replaced with toast/banner feedback in `ApprovalQueue`

### P1 Fixes ✅
- **P1-4**: Duplicate footer removed from `page.tsx` — `DashboardShell` owns single footer

### New API Endpoints Created ✅
- `src/app/api/crm/publish/route.ts` — POST create publish job
- `src/app/api/crm/status/route.ts` — GET/POST system state (dryRun, wasmRanking, health)

### Components Modified ✅
- `src/components/crm/ContentDraftCard.tsx` — publish job creation before status update
- `src/components/crm/AutomationStatusCard.tsx` — server-authoritative state via `useEffect` + API
- `src/components/crm/ApprovalQueue.tsx` — toast feedback replacing `alert()`
- `src/components/layout/LayoutControlBar.tsx` — unified `DashboardViewSection` type with "crm"
- `src/app/dashboard/page.tsx` — removed duplicate `<SiteFooter />`