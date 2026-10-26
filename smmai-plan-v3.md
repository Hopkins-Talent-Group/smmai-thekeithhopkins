# SMMAI Plan v3 — Dashboard & Product Architecture Review

Audit target: `vitrixLab/social-media-smm-automation`, branch `dev`.

This plan supersedes the dashboard-related assumptions in `smmai-plan.md` and `smmai-plan-v2.md`. The earlier plans remain useful for the static marketing/login pages; this document focuses on the **actual Next.js dashboard prototype** under `nextjs-setup/nextjs-dashboard/` and on what an SMMAI production dashboard should contain.

## Executive summary

The current dashboard is **not yet a complete social-media-management dashboard**. It is a prototype combining:

- a human approval queue;
- automation/policy status;
- a brand-guardrails editor;
- lightweight analytics cards;
- an architecture/AST graph explorer;
- a CRM shell;
- layout/view/density controls.

Those are useful building blocks, but the current information architecture is missing several workflows that are central to an SMM product: connected social accounts, publishing/calendar, content library, unified engagement/inbox, campaign/workspace context, real analytics drill-downs, failed-job/retry visibility, notifications, audit history, and operational settings.

The most important v3 decision is therefore:

> **Do not add more dashboard widgets until the core SMM information architecture and data contracts are defined.**

The existing dashboard also contains implementation blockers that should be fixed before treating it as a production UI.

---

# 1. Current dashboard inventory

## 1.1 Application shell

| Component | Path | Current role | Keep? | v3 placement |
|---|---|---|---|---|
| Dashboard page | `src/app/dashboard/page.tsx` | Orchestrates sections and global controls | Yes | Dashboard route |
| DashboardHeader | `src/components/layout/DashboardHeader.tsx` | Top bar, view/density/platform controls | Yes, simplify | Global header |
| DashboardShell | `src/components/layout/DashboardShell.tsx` | Sidebar + main content | Yes | Global shell |
| LayoutControlBar | `src/components/layout/LayoutControlBar.tsx` | Duplicates navigation and display controls | Mostly no | Reduce/remove |
| SiteFooter | `src/components/layout/SiteFooter.tsx` | Footer | Optional | Global shell, once |
| DashboardCard | `src/components/dashboard/DashboardCard.tsx` | Generic dashboard card | Yes if standardized | Shared UI |

### Finding

There are currently **two competing navigation/control surfaces**:

1. sidebar navigation in `DashboardShell`;
2. navigation switcher + sidebar toggle in `LayoutControlBar`;
3. additional navigation menu behavior in `DashboardHeader`.

For a production dashboard, navigation should have one clear source of truth. The header should handle global context/actions; the sidebar should handle primary product navigation. The layout control bar should not repeat primary navigation.

---

# 2. Current feature components: essential vs optional

## 2.1 ApprovalQueue — ESSENTIAL

Path: `src/components/crm/ApprovalQueue.tsx`

This is directly aligned with SMMAI's core product promise: AI-assisted automation with a human approval gate.

### Keep as a primary product surface

Required capabilities:

- pending approval count;
- filter by platform;
- filter by status;
- content preview;
- approve;
- reject;
- edit before approval;
- submit/reopen;
- publish only after approval;
- clear status transitions;
- bulk approval/rejection where permissions allow;
- pagination/infinite loading for real queues;
- failed-action state;
- audit history for each transition.

### Current issues

- `handleCreateDraft` calls `loadDrafts()`, but that function is not defined in the component. The existing refresh mechanism is `refreshKey`; use one data-loading path.
- Error handling uses blocking `alert()`.
- The UI currently presents publishing as a status transition. Production publishing must be an explicit API operation with confirmation, authorization, idempotency, and result state.
- Tabs, counts, and platform filters need URL/state synchronization if the page is shareable/bookmarkable.
- The modal needs proper dialog semantics, focus trapping, escape handling, and return-focus behavior.
- Draft cards should support media previews, platform-specific validation, scheduled time, author/reviewer, and moderation results.

**Verdict: keep and promote to a core Content/Approval workflow.**

---

# 3. AutomationStatusCard — ESSENTIAL, but not as a fake control panel

Path: `src/components/crm/AutomationStatusCard.tsx`

The concepts are essential:

- dry-run/live state;
- human approval gate;
- moderation/policy status;
- automation health;
- signal/ranking engine status.

### Current problem

The component uses local React state for `dryRun` and `wasmRanking`. That means the UI can claim that live publishing or WASM ranking changed without changing the actual backend configuration.

That is unsafe for a control surface.

### v3 rule

Separate:

**System status**

- current mode;
- adapter health;
- queue health;
- moderation status;
- last successful job;
- failed jobs;
- API/token health.

from:

**System controls**

- enable/disable live publishing;
- change automation policy;
- change approval requirements.

Every mutating control must call a server-side API and return a persisted state.

Live publishing should require:

1. explicit permission;
2. confirmation;
3. clear environment/mode indicator;
4. audit event;
5. rollback/disable path.

**Verdict: keep as a compact Automation & Safety summary; move detailed configuration to Settings/Automation.**

---

# 4. AnalyticsCards — ESSENTIAL, but currently too shallow

Path: `src/components/crm/AnalyticsCards.tsx`

Analytics are essential to an SMM platform because the repository architecture explicitly includes an analytics feedback loop.

Current implementation provides:

- engagement rate;
- impressions;
- clicks;
- percentage change;
- one card per platform.

### What is missing

A useful analytics surface should answer:

1. What happened?
2. Why did it happen?
3. Which content performed?
4. Which platform/audience/topic performed?
5. What should the planner do next?

Minimum v3 analytics:

- total reach/impressions;
- engagements;
- engagement rate;
- clicks/link CTR;
- follower/audience change;
- posts published;
- approval rate;
- top posts;
- performance by platform;
- performance by content pillar/topic;
- period-over-period comparison;
- date range;
- platform filter;
- campaign/client filter where applicable;
- drill-down to post level;
- freshness timestamp;
- data-source/sync status.

The feedback loop should connect analytics to recommendations rather than stopping at metric cards.

**Verdict: keep, redesign as a real Analytics workspace rather than a row of cards.**

---

# 5. BrandProfileCard — ESSENTIAL, but move to Guardrails/Settings

Path: `src/components/crm/BrandProfileCard.tsx`

The underlying capability is essential:

- audience;
- brand voice;
- prohibited topics;
- required disclosures.

This directly supports AI generation and moderation.

### v3 additions

Brand configuration should include:

- brand voice;
- audience;
- content pillars;
- terminology;
- banned/prohibited topics;
- required disclosures;
- CTA rules;
- platform-specific rules;
- visual/media guidance;
- approval policy;
- version/history;
- who changed the policy;
- test/preview against a sample draft.

Do not make guardrail editing a casual inline dashboard mutation. It is a configuration surface with meaningful downstream effects.

**Verdict: keep; place under Settings > Brand & Guardrails, with a read-only summary on the dashboard.**

---

# 6. ContentDraftCard — ESSENTIAL

Path: `src/components/crm/ContentDraftCard.tsx`

The draft card is central to the approval workflow.

### v3 requirements

Add:

- media attachment/preview;
- platform preview;
- scheduled date/time/time zone;
- content pillar;
- campaign;
- AI generation provenance;
- moderation checks;
- policy violations;
- reviewer;
- revision history;
- comments/feedback;
- approval timestamp;
- publish result;
- retry state;
- external platform post ID where available.

The current hardcoded platform color map should not be the only representation of platform identity. Use accessible platform labels/icons plus semantic status.

The current `published` state should not be treated as proof of an external publish. It should represent a confirmed backend publish result.

**Verdict: keep and evolve into the canonical Post/Draft entity view.**

---

# 7. GraphExplorer — NOT an end-user dashboard essential

Path: `src/components/dashboard/GraphExplorer.tsx`

This is useful for:

- developers;
- architecture/debugging;
- internal project inspection;
- graphify/AST diagnostics.

It is not a core SMM operator workflow.

### v3 placement

Move it to:

**Settings / Developer / System Diagnostics**

or hide it behind an internal/admin role.

Do not make an AST graph one of the primary navigation destinations for normal marketers.

**Verdict: keep as an internal tool, remove from primary SMM navigation.**

---

# 8. ClientManagement — NOT ready for the main dashboard

Path: `src/components/crm/ClientManagement.tsx`

It is currently a placeholder saying functionality is coming soon.

Do not expose placeholder functionality in the main production dashboard.

If agency/multi-client operation is a real product requirement, build it as a first-class hierarchy:

**Workspace → Client → Brand → Social accounts → Campaigns → Content**

Minimum client management:

- client list;
- client switcher;
- client status;
- assigned users/roles;
- brand profile;
- connected accounts;
- approval policy;
- billing/plan metadata if applicable;
- client-level analytics.

**Verdict: remove placeholder from the primary dashboard until implemented; plan as a separate core domain.**

---

# 9. CRM dashboard composition — avoid duplication

Path: `src/components/crm/CRMDashboard.tsx`

Current composition repeats several major components:

- AutomationStatusCard;
- ApprovalQueue;
- AnalyticsCards;
- BrandProfileCard;
- ContentDraftCard.

The top-level dashboard already renders AutomationStatusCard, ApprovalQueue, AnalyticsCards, and BrandProfileCard based on `currentSection`.

This creates two competing compositions for the same features.

### v3 rule

Use one information architecture.

Recommended:

- Dashboard = overview;
- Content = drafts/approval/calendar;
- Analytics = analytics;
- Accounts = connections;
- Engagement = inbox;
- Brand = guardrails;
- Automation = workflows/policies;
- Clients = agency management;
- Settings = configuration;
- System Diagnostics = developer-only.

A separate "CRM dashboard" should only exist if CRM is genuinely a distinct product module.

**Verdict: refactor; do not maintain a second dashboard composition that duplicates the primary route.**

---

# 10. Missing essential dashboard/product components

The following are currently absent or insufficient and should be planned before adding cosmetic dashboard widgets.

## 10.1 Overview / Command Center — ESSENTIAL

The landing dashboard should answer "what needs my attention?"

Recommended blocks:

1. Pending approvals
2. Scheduled today
3. Failed publishing/actions
4. Performance snapshot
5. Account connection health
6. Recent activity
7. Top-performing content
8. Automation/safety status

Avoid making the overview a dense wall of unrelated KPI cards.

---

## 10.2 Content Calendar — ESSENTIAL

For an SMM product, a calendar is a primary workflow.

Required:

- month/week/list views;
- scheduled posts;
- draft/pending/approved/published states;
- drag/reschedule;
- platform filtering;
- campaign filtering;
- time-zone awareness;
- create draft;
- edit scheduled post;
- failed publish visibility;
- conflict detection.

---

## 10.3 Social Accounts / Connections — ESSENTIAL

Currently missing as a primary feature.

Required:

- connected account list;
- platform;
- account/page/channel identity;
- connection status;
- last sync;
- token expiry/reauth state;
- permissions/scopes;
- connect/reconnect/disconnect;
- test connection.

This should be visible in both Settings and health summaries.

---

## 10.4 Unified Inbox / Engagement — ESSENTIAL for a mature SMM product

Missing from the current dashboard.

Required:

- comments;
- mentions;
- messages where supported;
- platform;
- sentiment/classification where implemented;
- assignment;
- reply;
- resolved/unresolved;
- filters;
- unread count;
- SLA/age indicators.

This is separate from publishing and should not be hidden inside analytics.

---

## 10.5 Content Library — ESSENTIAL

A production SMM workflow needs reusable media/content assets.

Required:

- images/videos;
- captions/templates;
- folders/tags;
- search;
- asset metadata;
- platform compatibility;
- reuse in draft creation;
- permissions.

---

## 10.6 Publishing / Job Operations — ESSENTIAL

The current approval UI should not be the only operational visibility.

Required:

- scheduled;
- publishing;
- published;
- failed;
- retrying;
- cancelled;
- rate-limited;
- authentication failure.

Every job needs a durable status and useful failure reason.

---

## 10.7 Notifications / Activity / Audit — ESSENTIAL

Required for trustworthy automation:

- approval requested;
- approval completed;
- publish succeeded;
- publish failed;
- account disconnected;
- token expiring;
- moderation failure;
- automation mode changed;
- guardrail changed.

Audit events should include actor, action, timestamp, target, and result.

---

# 11. Recommended v3 information architecture

## Primary navigation

1. **Overview**
2. **Content**
   - Calendar
   - Drafts
   - Approval Queue
   - Published
3. **Engagement**
   - Inbox
   - Comments/Mentions
4. **Analytics**
5. **Accounts**
6. **Brand & Guardrails**
7. **Automation**
8. **Clients** (agency/multi-client only)
9. **Settings**

Developer/admin-only:

10. **System Diagnostics**
    - Architecture Graph
    - job diagnostics
    - integration diagnostics

### Why this structure

It follows user jobs rather than implementation domains.

"Architecture Graph", "WASM", and "CRM" describe how the system is built; "Content", "Analytics", "Accounts", and "Engagement" describe what an SMM operator is trying to accomplish.

---

# 12. Dashboard overview composition

The default Overview should be intentionally small.

## Row 1 — attention

- Pending approvals
- Scheduled today
- Failed jobs
- Connection warnings

These are action-oriented, not vanity metrics.

## Row 2 — performance

- Reach/impressions
- Engagement rate
- Click/CTR
- Audience growth

Each metric should have:

- selected period;
- comparison period;
- freshness timestamp;
- source;
- click-through to analytics.

## Row 3 — workflow

- Upcoming scheduled posts
- Approval queue preview
- Recent publishing failures

## Row 4 — intelligence

- Top-performing content
- Recommended next topics/angles
- Analytics feedback loop

## Row 5 — safety

- Automation mode
- Human approval gate
- Moderation status
- Account health

Do not show all details simultaneously. The Overview is a command center, not the entire application.

---

# 13. Component review against the repository dashboard design skill

The repository contains a separate analytics-dashboard design skill at:

`dashboard-skill/analytics-dashboard-ui/`

It specifies:

- metric/KPI cards;
- bar charts;
- line/area charts;
- radial gauge;
- progress;
- category/device breakdown;
- pagination;
- 12-column grid;
- dark/light token system.

These are useful **visual primitives**, not a complete SMM information architecture.

## Use

- KPI card for Overview/Analytics;
- line/area chart for performance trends;
- bar chart for platform/content comparisons;
- breakdown lists for platform/account distribution;
- progress/gauge only when a percentage has a meaningful denominator;
- pagination for large content/activity datasets.

## Do not automatically add

- radial gauges simply because the design skill provides one;
- pagination to every small list;
- multiple chart types to the same screen;
- generic device breakdowns when the SMM problem is actually platform/content performance.

Component choice must follow the user task and data, not the component library.

---

# 14. Design-system conflict that must be resolved

There are currently two visual systems:

### SMMAI brand system

`DESIGN.md`

- Plus Jakarta Sans;
- emerald primary;
- amber status;
- green-cast dark background;
- deliberate small/medium/large radii;
- low motion;
- no generic blue-midnight;
- brand-specific visual language.

### Analytics dashboard skill

`dashboard-skill/analytics-dashboard-ui/`

- Inter;
- orange accent;
- black/neutral canvas;
- 20px cards;
- analytics-kit aesthetic.

The dashboard implementation currently uses the SMMAI tokens (`var(--primary)`, `var(--panel)`, etc.) rather than the analytics skill's orange tokens.

### v3 decision

Do **not** blindly import the analytics skill's colors or typography into the product.

Use its component architecture as reference where useful, but map the components onto the canonical SMMAI design tokens.

One product should have one visual language.

---

# 15. Critical implementation blockers found in the current dashboard

## P0 — Resolve before production dashboard work

### P0-1 — Missing `@/lib/crm` source in the current tree

Multiple components import:

`@/lib/crm`

but the `src/lib/` tree is not present in the current `dev` tree.

Affected components include:

- `CRMDashboard.tsx`
- `ApprovalQueue.tsx`
- `BrandProfileCard.tsx`
- `ContentDraftCard.tsx`
- `AnalyticsCards.tsx`

The imported domain types/data must be restored or the import architecture changed before this dashboard can be considered buildable.

---

### P0-2 — Dashboard section type excludes CRM

`LayoutControlBar.tsx` defines:

`DashboardViewSection = "approval" | "graph" | "analytics" | "guardrails"`

but `DashboardShell.tsx` contains a CRM navigation item and `page.tsx` checks:

`currentSection === "crm"`

The section model is inconsistent.

**Fix:** define one shared navigation/domain type and use it everywhere.

---

### P0-3 — Publishing action is not a real publishing operation

`ContentDraftCard.tsx` changes an approved post directly to `published` through the draft status API.

A status label is not equivalent to a successful external publish.

**Fix:** publishing must be a server-side operation returning durable external job/result state.

---

### P0-4 — Automation toggles are local-only

`AutomationStatusCard.tsx` changes local React state for DRY_RUN/WASM state.

**Fix:** distinguish display status from persisted system configuration and make dangerous controls server-authoritative.

---

### P0-5 — Error handling relies on blocking alerts

Current components use `alert()` for errors.

**Fix:** use inline field errors, toast/banner feedback, retry actions, and persistent operation status for long-running jobs.

---

# 16. P1 — Important implementation issues

### P1-1 — Navigation duplication

DashboardHeader, DashboardShell, and LayoutControlBar all participate in navigation/control.

Consolidate.

### P1-2 — Header links use `href="#"`

The SMM Control Hub link and mobile navigation entries use placeholder links.

Use buttons for in-page section state or real routes for real destinations.

### P1-3 — DashboardHeader platform display is a link, not a filter

The header displays `selectedPlatform` in a `Link href="#"`, while the actual filter is elsewhere.

Use one canonical platform selector.

### P1-4 — Footer is rendered twice

`DashboardShell` renders `SiteFooter`, while `dashboard/page.tsx` also renders `SiteFooter`.

Keep one owner.

### P1-5 — Header/sidebar layout has competing height/margin assumptions

The page uses a full-height wrapper, the shell adds `paddingTop: 64px`, and the header uses a negative margin.

Simplify to a conventional app shell:

`header` → `sidebar + main` → optional footer.

### P1-6 — Inline styles dominate feature components

This makes token consistency and responsive behavior harder to maintain.

Move repeated dashboard patterns into shared CSS/component primitives.

### P1-7 — Modal accessibility

The Create Draft modal needs:

- `role="dialog"`;
- `aria-modal="true"`;
- labelled heading;
- focus trap;
- escape close;
- return focus;
- background interaction prevention.

### P1-8 — Destructive/live actions need confirmation

Reject, publish, live-mode changes, account disconnect, and guardrail changes need appropriate confirmation and permission handling.

---

# 17. Data architecture requirements

The dashboard should be driven by domain entities rather than UI-local demo objects.

Minimum entities:

- Workspace
- Client
- User
- Role/Permission
- BrandProfile
- SocialAccount
- ContentDraft
- MediaAsset
- Campaign
- ScheduledPost
- PublishJob
- PublishResult
- Approval
- ModerationResult
- AnalyticsSnapshot
- AnalyticsPostMetric
- EngagementItem
- Notification
- AuditEvent

## Important distinction

Do not overload `ContentDraft.status` with the entire publishing lifecycle.

A draft can be:

`draft → pending_approval → approved → scheduled → publishing → published`

with failure/cancellation branches.

Publishing should have its own job/result model so a failed external API call does not corrupt the editorial state.

---

# 18. Required state model for every async dashboard component

Every data-driven component should explicitly support:

1. loading;
2. loaded;
3. empty;
4. error;
5. stale/out-of-date;
6. retrying;
7. permission denied where applicable.

For analytics specifically:

- data freshness;
- last sync;
- partial platform availability;
- unavailable metric;
- API/rate-limit state.

Avoid fake placeholder values that look like production metrics.

---

# 19. Security and authorization requirements

The UI must never be the enforcement layer for:

- human approval;
- live publishing;
- moderation;
- account access;
- role permissions;
- client isolation;
- automation configuration.

Server-side APIs must enforce all of these.

Recommended roles:

- Owner
- Admin
- Manager
- Editor
- Approver
- Analyst
- Client/Viewer

Permissions should be action-specific rather than inferred from the page a user can see.

---

# 20. Dashboard best-practice checklist

## Information architecture

- [ ] One primary navigation model
- [ ] Overview is action-oriented
- [ ] Content workflow is separate from analytics
- [ ] Engagement/inbox is separate from publishing
- [ ] Settings/configuration is separate from daily operations
- [ ] Developer diagnostics are not primary marketer navigation

## Interaction

- [ ] All buttons have real actions
- [ ] No `href="#"` placeholders for production actions
- [ ] Destructive actions confirm appropriately
- [ ] Live publishing is explicit
- [ ] Long-running jobs show progress/result
- [ ] Failed operations have retry paths
- [ ] Filters persist/share correctly where useful

## Accessibility

- [ ] Keyboard navigation
- [ ] Visible focus
- [ ] Correct semantic headings
- [ ] Proper dialogs
- [ ] Labels for form controls
- [ ] Status not conveyed by color alone
- [ ] Adequate touch targets
- [ ] Reduced motion
- [ ] Screen-reader announcements for async status changes

## Data integrity

- [ ] No fake success states
- [ ] No local-only security controls
- [ ] Durable job state
- [ ] Audit trail
- [ ] Freshness indicators
- [ ] Explicit timezone
- [ ] Idempotent publish operations
- [ ] API failure states
- [ ] Rate-limit states

## Visual system

- [ ] SMMAI tokens are canonical
- [ ] One typography system
- [ ] One color language
- [ ] Consistent card hierarchy
- [ ] Charts have meaningful axes/context
- [ ] No chart without an actionable question
- [ ] Mobile layout tested
- [ ] Dark/light states tested

---

# 21. Recommended implementation sequence

## Phase A — Make the current dashboard trustworthy

1. Restore/fix `src/lib/crm` domain model/imports.
2. Fix the dashboard section type.
3. Remove duplicated navigation/control ownership.
4. Remove duplicate footer.
5. Replace placeholder links.
6. Make publishing server-authoritative.
7. Make automation settings server-authoritative.
8. Replace `alert()` UX.
9. Fix modal accessibility.
10. Establish shared dashboard tokens/components.

## Phase B — Establish the product shell

Implement:

1. Overview
2. Content
3. Analytics
4. Accounts
5. Engagement
6. Brand & Guardrails
7. Automation
8. Settings

Add Clients only when multi-client behavior is actually implemented.

## Phase C — Complete SMM workflows

1. Content calendar
2. Media/content library
3. Account connections
4. Publish job center
5. Unified inbox
6. Notifications
7. Audit activity
8. Real analytics drill-down

## Phase D — Intelligence loop

Connect:

**Research → Planning → Draft → Moderation → Human approval → Publishing → Analytics → Recommendation → Planning**

This should be the core SMMAI product loop.

---

# 22. Definition of done for the dashboard MVP

The dashboard MVP is ready for real users when a user can:

- connect a supported social account;
- configure brand guardrails;
- create or generate a draft;
- see moderation results;
- submit it for human approval;
- approve/reject/edit it;
- schedule it;
- publish it through a real server-side job;
- see success/failure;
- retry a safe failure;
- see the post in the calendar;
- inspect performance after publishing;
- see the analytics feedback;
- understand account/system health;
- review relevant audit activity.

The MVP does **not** need every chart, CRM feature, graph visualization, or advanced customization.

---

# 23. Final component decisions

| Current component | Decision |
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

---

# 24. Product principle for v3

SMMAI should optimize the dashboard around **operator decisions and safe execution**, not around the number of widgets displayed.

A good dashboard should make these questions immediately answerable:

1. **What needs my attention?**
2. **What is scheduled or about to publish?**
3. **Is automation safe and healthy?**
4. **Which accounts have problems?**
5. **What content is performing?**
6. **What should I do next?**

Everything else should support those questions or live in a deeper workflow.

---

## Source files reviewed

- `smmai-plan.md`
- `smmai-plan-v2.md`
- `DESIGN.md`
- `dashboard-skill/analytics-dashboard-ui/SKILL.md`
- `dashboard-skill/analytics-dashboard-ui/references/tokens.css`
- `dashboard-skill/analytics-dashboard-ui/references/component-specs.md`
- `dashboard-skill/analytics-dashboard-ui/examples/preview.html`
- `nextjs-setup/nextjs-dashboard/src/app/dashboard/page.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/crm/CRMDashboard.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/crm/ApprovalQueue.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/crm/AnalyticsCards.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/crm/AutomationStatusCard.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/crm/BrandProfileCard.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/crm/ClientManagement.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/crm/ContentDraftCard.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/dashboard/GraphExplorer.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/layout/DashboardHeader.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/layout/DashboardShell.tsx`
- `nextjs-setup/nextjs-dashboard/src/components/layout/LayoutControlBar.tsx`
- `nextjs-setup/nextjs-dashboard/package.json`

