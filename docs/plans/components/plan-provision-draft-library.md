# Provision Upgrade Plan: Draft Library

**Section ID:** `drafts`
**Component:** [`components/crm/ContentDraftCard.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/crm/ContentDraftCard.tsx)
**API:** [`src/app/api/crm/drafts/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/drafts/route.ts)
**Status:** 🔴 Not Started
**Priority:** P0 — Core Content Provision

---

## Overview

The Draft Library is the content repository for all AI-generated and human-edited social media posts. It surfaces `ContentDraft` records with status filtering, platform filtering, and inline editing capabilities.

---

## Draft Status Lifecycle

```
planned → draft → needs_approval → approved → scheduled → published
                                ↓
                             rejected → revision_requested → draft
```

---

## Upgrade Goals

- [ ] Paginated list of all drafts with status + platform filter bar
- [ ] Inline status badge (colour-coded per status)
- [ ] Platform icons (Instagram, Facebook, LinkedIn, Twitter/X)
- [ ] Click-to-expand full draft content preview
- [ ] Inline edit: headline, body, hashtags, call-to-action
- [ ] "Send to Approval" button from `draft` status
- [ ] "Schedule" button for `approved` drafts (date/time picker)
- [ ] "Duplicate" action to clone a draft for another platform
- [ ] "Archive" / soft-delete action
- [ ] Bulk select + bulk status update
- [ ] Search by keyword across draft content
- [ ] Sort by: created, updated, scheduled date, platform, status

---

## Filter Bar Config

```typescript
const DRAFT_FILTERS = {
  status: ['all', 'planned', 'draft', 'needs_approval', 'approved', 'scheduled', 'published', 'rejected'],
  platform: ['all', 'instagram', 'facebook', 'linkedin', 'twitter'],
}
```

---

## Files Affected

| File | Change |
|---|---|
| [`components/crm/ContentDraftCard.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/crm/ContentDraftCard.tsx) | Full upgrade — add actions, platform icon |
| `components/dashboard/DraftLibrary.tsx` | New: list wrapper with filter bar |
| `components/dashboard/DraftEditPanel.tsx` | New: inline edit slide-over panel |
| [`src/app/api/crm/drafts/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/drafts/route.ts) | Add search, sort, pagination params |
| [`src/lib/platforms.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/lib/platforms.ts) | Platform config + icon map |

---

## Acceptance Criteria

- [ ] All draft statuses render with correct colour badges
- [ ] Filter by status and platform updates list without page reload
- [ ] Inline edit saves to DB via PATCH
- [ ] "Send to Approval" moves draft to `needs_approval` and refreshes Approval Gate badge
- [ ] Schedule picker shows calendar + time input
- [ ] Search returns results within 300ms (debounced)
- [ ] Pagination handles 100+ drafts gracefully

---

## References

- [`components/crm/ContentDraftCard.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/crm/ContentDraftCard.tsx)
- [`src/smm/domain/models.py`](file:///D:/citrixlabph/smma/src/smm/domain/models.py) — `ContentDraft` model
- [`src/smm/content/planner.py`](file:///D:/citrixlabph/smma/src/smm/content/planner.py)
- [`src/lib/platforms.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/lib/platforms.ts)
