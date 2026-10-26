# Provision Upgrade Plan: Approval Gate

**Section ID:** `approval`
**Dashboard Page:** [`src/app/dashboard/page.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/dashboard/page.tsx)
**API:** [`src/app/api/crm/drafts/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/drafts/route.ts)
**Backend Service:** [`src/smm/publishing/service.py`](file:///D:/citrixlabph/smma/src/smm/publishing/service.py)
**Status:** 🟢 Phase 2 Implemented
**Priority:** P0 — Human Gate (Core Business Logic)

> **Implemented (2026-10-02):** queue with platform filter, approve/reject,
> rejection **revision notes**, **batch approve (max 20)**, workspace-scoped RBAC
> with an explicit viewer denial, per-transition **audit events**, and the
> **DRY_RUN** fix (simulation returns the draft to `approved` and never marks it
> published; the button reads "Simulate publish (dry-run)"). Remaining:
> approve/reject history timeline, moderation-violation inline warnings,
> AI-vs-human diff view.

---

## Overview

The Approval Gate is the **human-in-the-loop checkpoint** for all AI-generated content. No draft can be published without explicit human approval. This is the highest-criticality provision — it enforces the `DRY_RUN=true` safety default and prevents unreviewed content from going live.

---

## Upgrade Goals

- [ ] List all drafts with `status = needs_approval` in a reviewable queue
- [ ] Show full draft content with platform, tone, and target audience context
- [ ] Side-by-side diff view: AI-generated vs human-edited version
- [ ] Approve / Reject / Request Revision actions with confirmation modal
- [ ] Batch approve multiple drafts (with audit trail entry per approval)
- [ ] Add comment / revision notes field on rejection
- [ ] Show moderation policy violations inline (from `ModerationService`)
- [ ] Approved drafts route to `PublishingService` (respecting `DRY_RUN`)
- [ ] Show approval history timeline per draft
- [ ] Real-time queue update when new drafts arrive (polling 30s)

---

## Approval Actions

| Action | Backend Call | Result |
|---|---|---|
| Approve | `PATCH /api/crm/drafts/:id` `{ status: 'approved' }` | Routes to publisher |
| Reject | `PATCH /api/crm/drafts/:id` `{ status: 'rejected', note }` | Returns to planner |
| Request revision | `PATCH /api/crm/drafts/:id` `{ status: 'revision_requested', note }` | Flags for AI revision |
| Batch approve | `POST /api/crm/drafts/batch-approve` `{ ids[] }` | Bulk operation |

---

## Files Affected

| File | Change |
|---|---|
| [`src/app/api/crm/drafts/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/drafts/route.ts) | Add PATCH approve/reject/revision, batch endpoint |
| `components/dashboard/ApprovalQueue.tsx` | New: queue list component |
| `components/dashboard/DraftReviewPanel.tsx` | New: draft detail + actions panel |
| `components/dashboard/ApprovalHistoryTimeline.tsx` | New: per-draft approval history |
| [`src/smm/publishing/service.py`](file:///D:/citrixlabph/smma/src/smm/publishing/service.py) | Trigger on approval |
| [`src/smm/moderation/policy.py`](file:///D:/citrixlabph/smma/src/smm/moderation/policy.py) | Surface violations to UI |

---

## Acceptance Criteria

- [ ] All `needs_approval` drafts listed with platform and content preview
- [ ] Approve / Reject actions write to DB and update queue immediately
- [ ] Rejected drafts show rejection note in draft history
- [ ] `DRY_RUN=true` mode clearly labelled — publish button shows "Simulate" not "Publish"
- [ ] Batch approve works for up to 20 drafts
- [ ] Moderation policy violations shown as inline warnings
- [ ] Audit log entry created for every approval/rejection action
- [ ] Queue polls for new drafts every 30 seconds

---

## References

- [`src/smm/publishing/service.py`](file:///D:/citrixlabph/smma/src/smm/publishing/service.py)
- [`src/smm/moderation/policy.py`](file:///D:/citrixlabph/smma/src/smm/moderation/policy.py)
- [`src/app/api/crm/drafts/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/drafts/route.ts)
- [`AGENTS.md`](file:///D:/citrixlabph/smma/AGENTS.md) — DRY_RUN safety rule
