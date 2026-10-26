# Provision Upgrade Plan: Clients

**Section ID:** `clients`
**Component:** [`components/crm/ClientsTable.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/crm/ClientsTable.tsx)
**Supporting:** [`components/crm/ClientStatsCards.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/crm/ClientStatsCards.tsx)
**API:** [`src/app/api/crm/clients/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/clients/route.ts), [`src/app/api/crm/clients/[id]/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/clients/%5Bid%5D/route.ts)
**Status:** 🟡 In Progress
**Priority:** P0 — CRM Core Provision

---

## Overview

The Clients provision is the account management hub. It lists all `Client` records (agencies, brands) with their associated social accounts, active content drafts, and engagement metrics. It is the CRM backbone of the SMM automation system.

---

## Upgrade Goals

- [ ] Client table: name, industry, active platforms, draft count, last activity, health score
- [ ] Click-through to client detail page with full brand profile
- [ ] Add/edit client form with `BrandProfile` configuration
- [ ] Client health score (based on recent engagement + publish frequency)
- [ ] Per-client draft pipeline mini-view (counts by status)
- [ ] Social account connection status per client
- [ ] Search + filter by industry, platform, health score
- [ ] CSV export of client list
- [ ] Bulk assign drafts to a client

---

## Data Models Used

| Model | Purpose |
|---|---|
| `Client` | Core account record |
| `BrandProfile` | Voice, tone, guardrails |
| `SocialAccount` | Connected platforms |
| `ContentDraft` | Drafts linked to client |
| `AnalyticsSnapshot` | Engagement metrics |
| `Contact` | People within the client org |

---

## Files Affected

| File | Change |
|---|---|
| [`components/crm/ClientsTable.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/crm/ClientsTable.tsx) | Add health score, platform icons, draft counts |
| [`components/crm/ClientStatsCards.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/crm/ClientStatsCards.tsx) | Add engagement trend, platform breakdown |
| `components/dashboard/ClientDetail.tsx` | New: full client detail panel |
| `components/dashboard/ClientForm.tsx` | New: add/edit client form |
| [`src/app/api/crm/clients/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/clients/route.ts) | Add search, filter, health score |
| [`src/app/api/crm/clients/[id]/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/clients/%5Bid%5D/route.ts) | Full client detail endpoint |

---

## Acceptance Criteria

- [ ] Client table loads with pagination (25 per page)
- [ ] Health score badge colour-coded (green/amber/red)
- [ ] Client detail shows all connected social accounts
- [ ] Add client form validates required fields
- [ ] Search returns results within 300ms

---

## References

- [`components/crm/ClientsTable.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/crm/ClientsTable.tsx)
- [`src/smm/domain/models.py`](file:///D:/citrixlabph/smma/src/smm/domain/models.py)
- [`src/lib/crm.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/lib/crm.ts)
