# Provision Upgrade Plan: Overview (Command Center)

**Section ID:** `overview`
**Component:** [`components/dashboard/CommandCenter.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/dashboard/CommandCenter.tsx)
**Dashboard Page:** [`src/app/dashboard/page.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/dashboard/page.tsx)
**API:** [`src/app/api/crm/overview/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/overview/route.ts)
**Status:** 🟡 In Progress
**Priority:** P0 — Landing Provision (Default View)

---

## Overview

The Command Center is the default view when the dashboard loads. It is the "god view" — showing KPIs, workflow phase progress, recent activity, and quick-action shortcuts for the SMM automation pipeline.

---

## Upgrade Goals

- [ ] Add live KPI cards: drafts pending, posts published today, approval queue count, engagement rate
- [ ] Add pipeline phase visualiser (5-phase SMM flow with progress indicators)
- [ ] Add recent activity feed (last 10 events from `AuditLog`)
- [ ] Add quick-action buttons: "New Draft", "Run Workflow", "Review Approvals"
- [ ] Connect to `GET /api/crm/overview` for real data
- [ ] Add skeleton loading state for all KPI cards
- [ ] Add auto-refresh every 60 seconds
- [ ] Show system status badge (API healthy / degraded)

---

## KPI Cards Needed

| Metric | Source |
|---|---|
| Drafts pending review | `ContentDraft` WHERE `status = pending` |
| Posts published today | `PublishJob` WHERE `publishedAt >= today` |
| Approval queue | `ContentDraft` WHERE `status = needs_approval` |
| Avg engagement rate | `AnalyticsSnapshot` last 7 days |
| Active workflows | `Workflow` WHERE `status = active` |

---

## API: `GET /api/crm/overview`

**Current response shape** — extend to include:
```typescript
{
  draftsPending: number
  publishedToday: number
  approvalQueue: number
  avgEngagementRate: number
  activeWorkflows: number
  recentActivity: AuditLogEntry[]
  systemStatus: 'healthy' | 'degraded'
}
```

---

## Files Affected

| File | Change |
|---|---|
| [`components/dashboard/CommandCenter.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/dashboard/CommandCenter.tsx) | Add KPI cards, activity feed |
| [`components/dashboard/DashboardCard.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/dashboard/DashboardCard.tsx) | Extend for KPI display |
| [`src/app/api/crm/overview/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/overview/route.ts) | Return full KPI payload |
| `components/ui/SkeletonCard.tsx` | New: skeleton for KPI cards |

---

## Acceptance Criteria

- [ ] All 5 KPI cards render with live data
- [ ] Recent activity feed shows last 10 events with timestamps
- [ ] Quick-action buttons navigate to correct sections
- [ ] Skeleton shown during data fetch
- [ ] Auto-refresh every 60 seconds without full page reload
- [ ] System status badge reflects API health

---

## References

- [`components/dashboard/CommandCenter.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/dashboard/CommandCenter.tsx)
- [`src/app/api/crm/overview/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/overview/route.ts)
- [`src/smm/domain/models.py`](file:///D:/citrixlabph/smma/src/smm/domain/models.py)
