# Provision Upgrade Plan: Analytics

**Section ID:** `analytics`
**Component:** [`components/dashboard/GraphExplorer.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/dashboard/GraphExplorer.tsx)
**API:** [`src/app/api/analytics/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/analytics/route.ts), [`src/app/api/engagement/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/engagement/route.ts)
**Backend:** [`src/smm/analytics/feedback.py`](file:///D:/citrixlabph/smma/src/smm/analytics/feedback.py), WASM [`src/smm/wasm/feedback.py`](file:///D:/citrixlabph/smma/src/smm/wasm/feedback.py)
**Status:** 🔴 Not Started
**Priority:** P1 — Intelligence Provision

---

## Overview

The Analytics provision displays engagement performance, content effectiveness, and AI-driven rank signals. It surfaces `AnalyticsSnapshot` data computed by the Python `engagement_rate()` function and WASM rank signal modules.

---

## Upgrade Goals

- [ ] Engagement rate trend chart (7d / 30d / 90d)
- [ ] Per-platform breakdown (Instagram, Facebook, LinkedIn, Twitter)
- [ ] Per-client performance comparison table
- [ ] Top performing posts (by engagement rate)
- [ ] AI rank signals visualisation (from `src/smm/research/signals.py`)
- [ ] Content type breakdown (image, video, carousel, text)
- [ ] Export analytics to CSV / PDF
- [ ] Connect `GET /api/analytics` to `AnalyticsSnapshot` Prisma model
- [ ] WASM-computed metrics rendered client-side for speed

---

## Key Metric: `engagement_rate()`

```python
# src/smm/analytics/feedback.py
def engagement_rate(snapshot: AnalyticsSnapshot) -> float:
    return snapshot.engagements / snapshot.impressions
```

**API call:** `POST /api/compute/engagement_rate`

---

## Files Affected

| File | Change |
|---|---|
| [`components/dashboard/GraphExplorer.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/dashboard/GraphExplorer.tsx) | Repurpose for analytics charts |
| `components/dashboard/AnalyticsDashboard.tsx` | New: full analytics provision |
| `components/dashboard/EngagementChart.tsx` | New: line chart component |
| `components/dashboard/PlatformBreakdown.tsx` | New: bar chart per platform |
| [`src/app/api/analytics/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/analytics/route.ts) | Full analytics data endpoint |
| [`src/smm/analytics/feedback.py`](file:///D:/citrixlabph/smma/src/smm/analytics/feedback.py) | Add time-series aggregation |
| [`src/smm/research/signals.py`](file:///D:/citrixlabph/smma/src/smm/research/signals.py) | Expose rank signals via API |

---

## Acceptance Criteria

- [ ] Engagement rate chart renders with correct data for selected date range
- [ ] Platform breakdown shows data for all connected platforms
- [ ] Top 10 posts ranked by engagement rate
- [ ] WASM module used for client-side metric computation where applicable
- [ ] Data export works for all chart views

---

## References

- [`src/smm/analytics/feedback.py`](file:///D:/citrixlabph/smma/src/smm/analytics/feedback.py)
- [`src/smm/wasm/feedback.py`](file:///D:/citrixlabph/smma/src/smm/wasm/feedback.py)
- [`src/smm/research/signals.py`](file:///D:/citrixlabph/smma/src/smm/research/signals.py)
- [`src/generated/prisma/models/AnalyticsSnapshot.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/generated/prisma/models/AnalyticsSnapshot.ts)
