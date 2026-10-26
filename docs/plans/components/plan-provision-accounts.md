# Provision Upgrade Plan: Social Accounts

**Section ID:** `accounts`
**API:** [`src/app/api/settings/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/settings/route.ts)
**Backend:** [`src/smm/integrations/adapters.py`](file:///D:/citrixlabph/smma/src/smm/integrations/adapters.py), [`src/smm/integrations/contracts.py`](file:///D:/citrixlabph/smma/src/smm/integrations/contracts.py)
**Status:** 🟢 Phase 2 Implemented
**Priority:** P0 — Platform Integration Provision

> **Implemented (2026-10-02):** `SocialAccountsManager` UI, OAuth
> connect/callback/disconnect routes, `/api/accounts` + `/{id}/capabilities` +
> `/{id}/refresh`, encrypted credential storage via `lib/secrets.ts`, and
> LinkedIn/X webhook ingestion. The `twitter` → `x` key split is resolved.
> Remaining: webhook event log viewer in the UI, and promoting the route-level
> test matrix rows to automated tests.

---

## Overview

The Social Accounts provision manages OAuth-connected social media platform accounts. It uses `SocialAccount` and `IntegrationConnection` Prisma models and is backed by the platform adapter system in `src/smm/integrations/`.

---

## Supported Platforms

| Platform | Adapter | Status |
|---|---|---|
| Meta (Facebook/Instagram) | `MetaAdapter` | Webhook: [`/api/webhooks/meta/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/webhooks/meta/route.ts) |
| LinkedIn | `LinkedInAdapter` | Planned |
| Twitter/X | `TwitterAdapter` | Planned |

---

## Upgrade Goals

- [ ] List all connected `SocialAccount` records with platform icon, username, follower count
- [ ] OAuth connect flow per platform (Meta, LinkedIn, Twitter)
- [ ] Token expiry warnings with re-auth prompt
- [ ] Disconnect account with confirmation
- [ ] Per-account post limits and rate limit status
- [ ] Account health check (API reachability)
- [ ] Multi-workspace: assign accounts to specific workspaces
- [ ] Webhook event log per account (from `WebhookEvent` model)

---

## Files Affected

| File | Change |
|---|---|
| `components/dashboard/SocialAccountsManager.tsx` | New: full provision |
| `components/dashboard/AccountConnectCard.tsx` | New: per-platform connect card |
| `components/dashboard/WebhookEventLog.tsx` | New: event log viewer |
| [`src/app/api/settings/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/settings/route.ts) | Add account management endpoints |
| [`src/smm/integrations/adapters.py`](file:///D:/citrixlabph/smma/src/smm/integrations/adapters.py) | Health check method per adapter |
| [`src/app/api/webhooks/meta/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/webhooks/meta/route.ts) | Surface events in UI |

---

## Acceptance Criteria

- [ ] Connected accounts listed with real follower/following counts
- [ ] Token expiry shown as days remaining
- [ ] OAuth connect flow works end-to-end for Meta
- [ ] Disconnect removes all associated tokens securely
- [ ] Webhook event log shows last 50 events per account

---

## References

- [`src/smm/integrations/adapters.py`](file:///D:/citrixlabph/smma/src/smm/integrations/adapters.py)
- [`src/smm/integrations/contracts.py`](file:///D:/citrixlabph/smma/src/smm/integrations/contracts.py)
- [`src/lib/platforms.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/lib/platforms.ts)
- [`src/generated/prisma/models/SocialAccount.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/generated/prisma/models/SocialAccount.ts)
- [`src/generated/prisma/models/IntegrationConnection.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/generated/prisma/models/IntegrationConnection.ts)
