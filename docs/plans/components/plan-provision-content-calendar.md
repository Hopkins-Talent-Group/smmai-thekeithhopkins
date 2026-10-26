# Provision Upgrade Plan: Content Calendar

**Section ID:** `calendar`
**API:** [`src/app/api/crm/drafts/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/drafts/route.ts)
**Backend:** [`src/smm/schedules/cron.py`](file:///D:/citrixlabph/smma/src/smm/schedules/cron.py)
**Status:** 🔴 Not Started
**Priority:** P1 — Scheduling Provision

---

## Overview

The Content Calendar visualises all scheduled and published drafts on a calendar grid. It allows editors to drag-and-drop rescheduling, see per-platform posting density, and identify content gaps.

---

## Upgrade Goals

- [ ] Month / Week / Day view toggle
- [ ] Drag-and-drop to reschedule drafts (update `scheduledAt` via PATCH)
- [ ] Per-platform colour coding on calendar cells
- [ ] Click on a day to see all drafts for that date
- [ ] "Suggested posting times" from analytics engagement data
- [ ] Show published posts with engagement badges (likes, shares)
- [ ] Integrate with `src/smm/schedules/cron.py` for job visibility
- [ ] Export calendar view to PDF / iCal

---

## Files Affected

| File | Change |
|---|---|
| `components/dashboard/ContentCalendar.tsx` | New: calendar provision |
| `components/dashboard/CalendarDraftCell.tsx` | New: draft cell in calendar |
| [`src/app/api/crm/drafts/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/drafts/route.ts) | Add `?from=&to=` date range filter |
| [`src/smm/schedules/cron.py`](file:///D:/citrixlabph/smma/src/smm/schedules/cron.py) | Expose schedule jobs via API |

---

## Acceptance Criteria

- [ ] Month view shows all scheduled/published drafts
- [ ] Drag-drop reschedules and persists via PATCH
- [ ] Platform colour legend visible
- [ ] Week view shows time-slot grid
- [ ] Empty days show "Add content" prompt

---

## References

- [`src/smm/schedules/cron.py`](file:///D:/citrixlabph/smma/src/smm/schedules/cron.py)
- [`src/smm/analytics/feedback.py`](file:///D:/citrixlabph/smma/src/smm/analytics/feedback.py)
