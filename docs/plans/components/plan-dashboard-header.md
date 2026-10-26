# Component Upgrade Plan: DashboardHeader

**Component:** [`DashboardHeader.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/layout/DashboardHeader.tsx)
**Route coverage:** `/dashboard` (authenticated)
**Status:** 🔴 Not Started
**Priority:** P0 — Dashboard Header Nav

---

## Overview

`DashboardHeader` is the top bar of the authenticated dashboard. It sits above the `DashboardShell` sidebar and main content area. It controls the sidebar toggle and provides the top-level workspace identity and user controls.

---

## Upgrade Goals

- [ ] Add **global search** input (`Cmd+K` shortcut, searches drafts, clients, accounts)
- [ ] Add **notifications bell** with unread badge (connect to `AuditLog` or event stream)
- [ ] Add **user avatar menu** (profile, logout) — currently no user identity shown
- [ ] Add **workspace switcher** dropdown (multi-workspace support from Prisma `Workspace` model)
- [ ] Add **quick-create button** (+) for new draft / post
- [ ] Sidebar toggle button should animate hamburger → close icon
- [ ] Add breadcrumb trail showing current active section label
- [ ] Replace inline styles with CSS custom properties / tokens from `tokens.css`

---

## Props Interface (Target)

```typescript
interface DashboardHeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  activeSection: DashboardViewSection
  user?: { name: string; email: string; avatarUrl?: string }
  workspaceName?: string
  unreadCount?: number
}
```

---

## Files Affected

| File | Change |
|---|---|
| [`components/layout/DashboardHeader.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/layout/DashboardHeader.tsx) | Major upgrade |
| `components/layout/UserMenu.tsx` | New: user avatar dropdown |
| `components/layout/WorkspaceSwitcher.tsx` | New: workspace selector |
| `hooks/useGlobalSearch.ts` | New: debounced search across entities |
| [`src/app/api/crm/overview/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/overview/route.ts) | Extend with search capability |

---

## Acceptance Criteria

- [ ] Sidebar toggle works and icon animates
- [ ] Active section name displays as breadcrumb
- [ ] User menu shows name/email and logout
- [ ] Notification bell shows real unread count
- [ ] `Cmd+K` focuses search from anywhere in dashboard
- [ ] All tokens referenced from `tokens.css` (no magic values)

---

## References

- [`components/layout/DashboardHeader.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/layout/DashboardHeader.tsx)
- [`src/tokens.css`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/tokens.css)
- [`DESIGN.md`](file:///D:/citrixlabph/smma/DESIGN.md)
