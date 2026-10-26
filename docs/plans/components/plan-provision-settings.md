# Provision Upgrade Plan: Settings

**Section ID:** `settings`
**API:** [`src/app/api/settings/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/settings/route.ts)
**Status:** 🟢 Phase 2 Implemented
**Priority:** P0 — Workspace Settings Provision (promoted from P1)

> **Implemented (2026-10-02):** `SettingsHub` UI, server-authoritative
> **`DRY_RUN` toggle with a confirmation dialog** persisted to `SystemState.settings`,
> AI-provider selection, and a `settings.changed` audit event per save. Out-of-scope
> plan items were dropped — Billing, 2FA, and avatar upload do not exist in the
> Prisma schema. Remaining: notification rules, per-key API management.

---

## Overview

The Settings provision manages workspace-level preferences, user profile, notification rules, AI provider config, and security settings. Backed by `WorkspaceSettings` and `User` Prisma models.

---

## Settings Sections

| Section | Description |
|---|---|
| **Profile** | Name, email, avatar, password change |
| **Workspace** | Workspace name, timezone, locale, logo |
| **AI Provider** | Switch between `NVIDIA_API_KEY`, `OPENROUTER_API_KEY`, model selection |
| **Notifications** | Email, in-app, webhook notification rules |
| **Security** | API keys, session management, 2FA |
| **Billing** | Plan, usage limits, payment method |
| **Integrations** | OAuth connections (Google, Meta) |

---

## Upgrade Goals

- [ ] Tabbed settings layout with URL-based tab routing (`?tab=profile`)
- [ ] Profile: avatar upload, name/email edit, password change
- [ ] AI Provider: toggle between providers, set API key, test connection
- [ ] `DRY_RUN` toggle with prominent warning label
- [ ] Workspace settings: timezone selector, locale, logo upload
- [ ] API key management: generate, revoke, label keys
- [ ] Notification rules: per-event toggles (approval needed, publish failed, etc.)
- [ ] Audit trail of settings changes (who changed what, when)
- [ ] Danger zone: delete workspace (with typed confirmation)

---

## Files Affected

| File | Change |
|---|---|
| `components/dashboard/SettingsHub.tsx` | New: full provision with tabs |
| `components/dashboard/ProfileSettings.tsx` | New: profile tab |
| `components/dashboard/AIProviderSettings.tsx` | New: AI config tab |
| `components/dashboard/SecuritySettings.tsx` | New: security tab |
| [`src/app/api/settings/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/settings/route.ts) | Full settings CRUD |
| [`src/lib/secrets.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/lib/secrets.ts) | Secure key management |

---

## Acceptance Criteria

- [ ] All settings tabs render correct forms
- [ ] Save actions persist via PATCH and show success toast
- [ ] `DRY_RUN` toggle shows a warning modal before disabling
- [ ] AI provider connection test returns success/fail within 3 seconds
- [ ] Password change requires current password confirmation
- [ ] Danger zone delete requires typing workspace name

---

## References

- [`src/app/api/settings/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/settings/route.ts)
- [`src/lib/secrets.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/lib/secrets.ts)
- [`src/generated/prisma/models/WorkspaceSettings.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/generated/prisma/models/WorkspaceSettings.ts)
- [`AGENTS.md`](file:///D:/citrixlabph/smma/AGENTS.md) — DRY_RUN environment variable rules
