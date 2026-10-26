# Provision Upgrade Plan: Brand & Guardrails

**Section ID:** `guardrails`
**API:** [`src/app/api/crm/brand/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/brand/route.ts)
**Backend:** [`src/smm/moderation/policy.py`](file:///D:/citrixlabph/smma/src/smm/moderation/policy.py)
**Status:** 🔴 Not Started
**Priority:** P1 — Quality & Compliance Provision

---

## Overview

The Brand & Guardrails provision lets users configure `BrandProfile` policies — tone of voice, banned words, content restrictions, platform-specific rules, and compliance constraints. These guardrails are enforced by `ModerationService` before any draft enters the approval gate.

---

## Upgrade Goals

- [ ] Brand voice editor: tone sliders (formal↔casual, serious↔playful)
- [ ] Banned words / phrases list (add, remove, import CSV)
- [ ] Platform-specific rules (e.g. no URLs on Instagram, character limits)
- [ ] Compliance rules (no medical claims, no financial advice, etc.)
- [ ] Moderation policy test panel: paste content → see which rules trigger
- [ ] Brand profile version history (track changes)
- [ ] Per-client brand profile override support
- [ ] AI-assisted guardrail suggestion ("based on past rejections, add these rules")

---

## Files Affected

| File | Change |
|---|---|
| `components/dashboard/BrandGuardrails.tsx` | New: full provision component |
| `components/dashboard/PolicyTestPanel.tsx` | New: content testing panel |
| [`src/app/api/crm/brand/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/brand/route.ts) | Full CRUD for brand profile |
| [`src/smm/moderation/policy.py`](file:///D:/citrixlabph/smma/src/smm/moderation/policy.py) | Expose policy details via API |

---

## Acceptance Criteria

- [ ] Brand profile saves and immediately applies to future draft moderation
- [ ] Policy test panel returns violations within 500ms
- [ ] Banned words list supports up to 500 entries
- [ ] Platform rules configurable per platform
- [ ] Change history shows who edited what and when

---

## References

- [`src/smm/moderation/policy.py`](file:///D:/citrixlabph/smma/src/smm/moderation/policy.py)
- [`src/generated/prisma/models/BrandProfile.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/generated/prisma/models/BrandProfile.ts)
- [`src/app/api/crm/brand/route.ts`](file:///D:/citrixlabph/smma/nextjs-setup/nextjs-dashboard/src/app/api/crm/brand/route.ts)
