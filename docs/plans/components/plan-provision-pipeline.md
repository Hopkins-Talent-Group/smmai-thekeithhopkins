# Provision Upgrade Plan: Deal Pipeline

**Section ID:** `pipeline`
**Component:** [`components/crm/PipelineBoard.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/crm/PipelineBoard.tsx)
**API:** [`src/app/api/crm/pipeline/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/pipeline/route.ts)
**Status:** 🔴 Not Started
**Priority:** P1 — Sales CRM Provision

---

## Overview

The Deal Pipeline is a Kanban-style board for tracking `Lead` → `Opportunity` → `Client` conversion. It uses the `Pipeline`, `PipelineStage`, and `Opportunity` Prisma models.

---

## Upgrade Goals

- [ ] Kanban board with drag-and-drop between stages
- [ ] Stage columns: Prospect, Qualified, Proposal, Negotiation, Closed Won, Closed Lost
- [ ] Deal cards: company name, value, owner, last activity, days in stage
- [ ] Add/edit deal form with probability and expected close date
- [ ] Pipeline value summary (total, weighted by probability)
- [ ] Filter by owner, stage, value range, close date
- [ ] Stale deal alerting (no activity > X days)
- [ ] Convert won deal to `Client` record automatically

---

## Files Affected

| File | Change |
|---|---|
| [`components/crm/PipelineBoard.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/crm/PipelineBoard.tsx) | Full Kanban build |
| `components/dashboard/DealCard.tsx` | New: deal card component |
| `components/dashboard/DealForm.tsx` | New: add/edit deal form |
| [`src/app/api/crm/pipeline/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/pipeline/route.ts) | Add full CRUD + stage move |

---

## Acceptance Criteria

- [ ] Drag-drop moves deal to new stage and persists via PATCH
- [ ] Pipeline total value displays in header
- [ ] Stale deals highlighted after 7 days of no activity
- [ ] "Won" deal creates a new Client record
- [ ] Board renders correctly for 50+ deals

---

## References

- [`components/crm/PipelineBoard.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/crm/PipelineBoard.tsx)
- [`src/generated/prisma/models/Pipeline.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/generated/prisma/models/Pipeline.ts)
- [`src/generated/prisma/models/Opportunity.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/generated/prisma/models/Opportunity.ts)
