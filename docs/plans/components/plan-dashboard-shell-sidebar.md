# Component Upgrade Plan: DashboardShell (Sidebar Nav)

**Component:** [`DashboardShell.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/layout/DashboardShell.tsx)
**Route coverage:** `/dashboard` (authenticated)
**Status:** 🔴 Not Started
**Priority:** P0 — Core Dashboard Navigation

---

## Overview

`DashboardShell` is the main authenticated layout wrapper. It renders the **sidebar navigation** and the `<main>` content area. The sidebar uses a categorised `navCategories` array to group nav items into four sections.

---

## Current Sidebar Navigation Structure

### Category: Publishing & Editorial
| ID | Label | Description | Badge |
|---|---|---|---|
| `overview` | Overview | Command center | — |
| `approval` | Approval Gate | Human gate | `Gate` |
| `drafts` | Draft Library | Content & posts | — |
| `calendar` | Content Calendar | Scheduling & timing | — |

### Category: Engagement & CRM
| ID | Label | Description |
|---|---|---|
| `inbox` | Unified Inbox | Conversations & DMs |
| `clients` | Clients | Account management |
| `pipeline` | Deal Pipeline | Leads & opportunities |

### Category: Intelligence & Quality
| ID | Label | Description |
|---|---|---|
| `analytics` | Analytics | Feedback signals |
| `guardrails` | Brand & Guardrails | Voice & policy |
| `automation` | Automation | Jobs & workflows |

### Category: Workspace & System
| ID | Label | Description | devOnly |
|---|---|---|---|
| `accounts` | Social Accounts | Connected networks | — |
| `settings` | Settings | Preferences & rules | — |
| `audit` | Audit Log | Security & compliance | — |
| `graph` | System Diagnostics | Architecture graph | ✅ |

---

## Current State Issues

- Entire shell (sidebar + main layout) is one 410-line file — needs splitting
- Sidebar is toggled externally via `sidebarOpen` prop from parent — state should be self-contained
- Nav renders inline SVGs for each icon — `NavIcon` component is a large switch statement
- No keyboard navigation between nav items (arrow keys)
- No collapsed/icon-only sidebar mode
- No mobile drawer version — sidebar is either open or absent
- All inline styles — no CSS classes or token references
- Footer links (Back to overview, Sign in) hardcoded

---

## Upgrade Goals

- [ ] Split into `Sidebar.tsx` + `DashboardShell.tsx` (shell = layout only)
- [ ] Move `navCategories` config to `lib/nav.ts` for easy editing
- [ ] Replace `NavIcon` switch statement with Lucide React icon map
- [ ] Add collapsed sidebar mode (icon-only, 56px wide) with tooltip labels
- [ ] Add mobile drawer variant (`< 768px`) with overlay
- [ ] Add keyboard arrow navigation between items in same category
- [ ] Move sidebar open/close state into a `useSidebar` hook
- [ ] Replace all inline styles with CSS tokens from `tokens.css`
- [ ] Footer links configurable via props or config
- [ ] Badge on "Approval Gate" should show real pending count from API

---

## `useSidebar` Hook API

```typescript
const { isOpen, toggle, close, collapse, isCollapsed } = useSidebar()
```

---

## Files Affected

| File | Change |
|---|---|
| [`components/layout/DashboardShell.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/layout/DashboardShell.tsx) | Refactor → layout shell only |
| `components/layout/Sidebar.tsx` | New: extracted sidebar |
| `lib/nav.ts` | New: nav config array |
| `hooks/useSidebar.ts` | New: sidebar state hook |
| [`src/app/api/crm/drafts/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/drafts/route.ts) | Add pending approval count to response |

---

## Acceptance Criteria

- [ ] All 14 nav sections render correctly
- [ ] `devOnly` items hidden in production
- [ ] Active section highlights correctly
- [ ] Sidebar collapses to icon-only on user toggle
- [ ] Mobile drawer opens/closes with overlay
- [ ] Approval Gate badge shows live pending count
- [ ] Keyboard arrow navigation works within category groups
- [ ] No inline styles remain in DashboardShell

---

## References

- [`components/layout/DashboardShell.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/layout/DashboardShell.tsx)
- [`src/lib/crm.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/lib/crm.ts)
- [`src/tokens.css`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/tokens.css)
- [`DESIGN.md`](file:///D:/citrixlabph/smma/DESIGN.md)
