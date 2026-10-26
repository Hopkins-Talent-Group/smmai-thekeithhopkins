# Component Upgrade Plan: SiteNav

**Component:** [`SiteNav.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/layout/SiteNav.tsx)
**Route coverage:** Public landing page (`/`)
**Status:** 🔴 Not Started
**Priority:** P1 — Public-facing Nav

---

## Overview

`SiteNav` is the site-wide top navigation bar rendered on the public landing page. It is a fixed 64px glassmorphic header with the SMMAI logo, anchor links to page sections, a Login link, and a light/dark theme toggle.

---

## Current Nav Links

| Label | Destination |
|---|---|
| How it works | `/#workflow` |
| Architecture | `/#architecture` |
| Security | `/#security` |
| Roadmap | `/#roadmap` |
| Login | `/login` |

---

## Current State Issues

- `active` class is hardcoded on "How it works" — not scroll-aware
- Theme toggle uses `localStorage` directly — not a shared context
- No mobile hamburger menu (nav links hidden on small screens — not confirmed)
- No smooth scroll behaviour for anchor links
- No active highlight as user scrolls past each section
- Theme state is local to `SiteNav` — not propagated to child sections

---

## Upgrade Goals

- [ ] Implement scroll-spy to highlight active nav link as sections enter viewport (`IntersectionObserver`)
- [ ] Extract theme state into a `ThemeProvider` context so all sections inherit it
- [ ] Add responsive mobile menu (hamburger → sheet/drawer on `< 768px`)
- [ ] Add smooth-scroll polyfill / `scroll-behavior: smooth` enforcement
- [ ] Add "Get Started" / CTA button next to Login for conversion
- [ ] Add `aria-current="page"` driven by scroll-spy state
- [ ] Move nav links config to a static array for easy extension

---

## Nav Link Config (Target)

```typescript
const NAV_LINKS = [
  { label: 'How it works', href: '/#workflow' },
  { label: 'Architecture', href: '/#architecture' },
  { label: 'Security', href: '/#security' },
  { label: 'Roadmap', href: '/#roadmap' },
]
```

---

## Files Affected

| File | Change |
|---|---|
| [`components/layout/SiteNav.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/layout/SiteNav.tsx) | Add scroll-spy, mobile menu, CTA |
| `context/ThemeContext.tsx` | New: shared theme provider |
| `hooks/useScrollSpy.ts` | New: IntersectionObserver hook |

---

## Acceptance Criteria

- [ ] Active nav link updates as user scrolls through sections
- [ ] Theme toggle synced across all page sections
- [ ] Mobile menu opens/closes correctly at `< 768px`
- [ ] All links have visible focus states (WCAG AA)
- [ ] SiteNav renders above all page content (`z-index` safe)

---

## References

- [`components/layout/SiteNav.tsx`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/components/layout/SiteNav.tsx)
- [`DESIGN.md`](file:///D:/citrixlabph/smma/DESIGN.md)
- [`antislop.md`](file:///D:/citrixlabph/smma/antislop.md)
