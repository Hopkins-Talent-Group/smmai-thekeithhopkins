# v2.1 — Nav Header UI Fix

The `DashboardHeader` component still had two lingering issues from the earlier build logs (`TS2322` on the toggle handlers) plus general UI gaps after adding Clients in v2. This rewrites it cleanly, fixes the types, and upgrades the visual layout.

## What changed in v2.1

| Area | Before | After |
|---|---|---|
| Section tabs | Inline buttons, hidden on mobile | Scrollable tab strip wired to `DashboardViewSection` |
| View/density toggles | `onClick={setViewMode}` → `TS2322` | Wrapped handlers, accessible `aria-pressed`, segmented control UI |
| Platform filter | Raw `<select>` | Styled select with icon, persists to parent |
| Search | Absent | Optional global search box (debounced) |
| User menu | Static avatar | Dropdown with role + sign out stub |
| Notifications | Absent | Bell with unread badge and dropdown |
| Mobile | Broken layout | Hamburger toggles sidebar; tabs scroll horizontally |
| A11y | None | `aria-*`, keyboard-friendly, focus rings |
| Types | `string` / inferred | All fields typed against `crm.ts` |

---

## 1. `src/components/layout/DashboardHeader.tsx`

Full replacement. Keeps the existing prop contract but adds optional new ones so it stays backwards-compatible with `DashboardShell`.

```tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { DashboardViewSection } from "@/lib/crm";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface DashboardHeaderProps {
  currentSection: DashboardViewSection;
  viewMode: "grid" | "list";
  density: "spacious" | "compact";
  selectedPlatform: string;
  sidebarOpen: boolean;

  onSelectSection: (section: DashboardViewSection) => void;
  onToggleViewMode: (mode: "grid" | "list") => void;
  onToggleDensity: (density: "spacious" | "compact") => void;
  onPlatformChange: (platform: string) => void;
  onToggleSidebar: () => void;

  // Optional (v2.1)
  onSearch?: (query: string) => void;
  userName?: string;
  userRole?: string;
  notificationCount?: number;
}

const PLATFORMS = [
  { value: "all", label: "All platforms" },
  { value: "meta", label: "Meta" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter / X" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
];

const TABS: { id: DashboardViewSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "approval", label: "Approval Gate" },
  { id: "drafts", label: "Drafts" },
  { id: "clients", label: "Clients" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function DashboardHeader({
  currentSection,
  viewMode,
  density,
  selectedPlatform,
  sidebarOpen,
  onSelectSection,
  onToggleViewMode,
  onToggleDensity,
  onPlatformChange,
  onToggleSidebar,
  onSearch,
  userName = "Citrix Lab",
  userRole = "Admin",
  notificationCount = 0,
}: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!onSearch) return;
    const t = setTimeout(() => onSearch(searchValue.trim()), 250);
    return () => clearTimeout(t);
  }, [searchValue, onSearch]);

  return (
    <header style={headerStyle}>
      {/* Row 1: brand + actions */}
      <div style={rowStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <button
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={sidebarOpen}
            style={iconButtonStyle}
            className="dh-icon-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3 6h18M3 12h18M3 18h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={logoStyle} aria-hidden>SM</div>
            <div style={{ minWidth: 0 }}>
              <div style={brandStyle}>SMMAI</div>
              <div style={brandSubStyle}>CRM Console</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onSearch && (
            <div style={searchWrapStyle} className="dh-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search clients, drafts…"
                aria-label="Search"
                style={searchInputStyle}
              />
            </div>
          )}

          {/* Platform filter */}
          <label style={selectWrapStyle} className="dh-select">
            <span style={srOnly}>Platform</span>
            <select
              value={selectedPlatform}
              onChange={(e) => onPlatformChange(e.target.value)}
              style={selectStyle}
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          {/* Notifications */}
          <div ref={notifRef} style={{ position: "relative" }}>
            <button
              onClick={() => setNotifOpen((v) => !v)}
              aria-label={`Notifications${notificationCount ? ` (${notificationCount} unread)` : ""}`}
              aria-expanded={notifOpen}
              style={iconButtonStyle}
              className="dh-icon-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {notificationCount > 0 && (
                <span style={badgeStyle}>{notificationCount > 9 ? "9+" : notificationCount}</span>
              )}
            </button>

            {notifOpen && (
              <div style={dropdownStyle} role="menu">
                <div style={dropdownHeaderStyle}>Notifications</div>
                {notificationCount === 0 ? (
                  <div style={dropdownEmptyStyle}>You're all caught up.</div>
                ) : (
                  <ul style={listStyle}>
                    <li style={listItemStyle}>3 drafts awaiting approval</li>
                    <li style={listItemStyle}>New client added — Northwind Labs</li>
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* User menu */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              style={userButtonStyle}
            >
              <span style={avatarStyle} aria-hidden>
                {userName
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <span className="dh-user-text" style={{ textAlign: "left", lineHeight: 1.15 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
                  {userName}
                </span>
                <span style={{ display: "block", fontSize: 11, color: "#6b7280" }}>
                  {userRole}
                </span>
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {menuOpen && (
              <div style={dropdownStyle} role="menu">
                <button role="menuitem" style={menuItemStyle}>Profile</button>
                <button role="menuitem" style={menuItemStyle}>Preferences</button>
                <div style={dividerStyle} />
                <button role="menuitem" style={{ ...menuItemStyle, color: "#b91c1c" }}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: section tabs + view controls */}
      <div style={tabRowStyle}>
        <nav
          role="tablist"
          aria-label="Dashboard sections"
          style={tabsScrollStyle}
          className="dh-tabs"
        >
          {TABS.map((tab) => {
            const active = tab.id === currentSection;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => onSelectSection(tab.id)}
                style={active ? tabActiveStyle : tabStyle}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div style={controlsStyle}>
          <div style={segmentStyle} role="group" aria-label="View mode">
            <button
              onClick={() => onToggleViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              aria-label="Grid view"
              style={viewMode === "grid" ? segmentActiveStyle : segmentStyleBtn}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            <button
              onClick={() => onToggleViewMode("list")}
              aria-pressed={viewMode === "list"}
              aria-label="List view"
              style={viewMode === "list" ? segmentActiveStyle : segmentStyleBtn}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div style={segmentStyle} role="group" aria-label="Density">
            <button
              onClick={() => onToggleDensity("spacious")}
              aria-pressed={density === "spacious"}
              aria-label="Spacious density"
              style={density === "spacious" ? segmentActiveStyle : segmentStyleBtn}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={() => onToggleDensity("compact")}
              aria-pressed={density === "compact"}
              aria-label="Compact density"
              style={density === "compact" ? segmentActiveStyle : segmentStyleBtn}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 8h16M4 12h16M4 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Small responsive style block */}
      <style jsx>{`
        @media (max-width: 880px) {
          :global(.dh-search) { display: none; }
        }
        @media (max-width: 720px) {
          :global(.dh-select) { display: none; }
          :global(.dh-user-text) { display: none; }
        }
        :global(.dh-icon-btn:focus-visible),
        :global(.dh-tabs button:focus-visible) {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }
      `}</style>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Styles (inline, matches v2 pattern)                                 */
/* ------------------------------------------------------------------ */

const headerStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 30,
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "saturate(180%) blur(8px)",
  borderBottom: "1px solid #e5e7eb",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 16px",
  minHeight: 60,
};

const tabRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "0 16px 8px",
  borderTop: "1px solid #f3f4f6",
};

const tabsScrollStyle: React.CSSProperties = {
  display: "flex",
  gap: 4,
  overflowX: "auto",
  paddingTop: 8,
  scrollbarWidth: "none",
  flex: 1,
  minWidth: 0,
};

const tabStyle: React.CSSProperties = {
  whiteSpace: "nowrap",
  background: "transparent",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  fontSize: 13,
  color: "#4b5563",
  cursor: "pointer",
};

const tabActiveStyle: React.CSSProperties = {
  ...tabStyle,
  background: "#111827",
  color: "#fff",
  fontWeight: 600,
};

const controlsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexShrink: 0,
};

const segmentStyle: React.CSSProperties = {
  display: "inline-flex",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: 2,
  background: "#fff",
};

const segmentStyleBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: "4px 8px",
  borderRadius: 6,
  cursor: "pointer",
  color: "#374151",
  display: "inline-flex",
  alignItems: "center",
};

const segmentActiveStyle: React.CSSProperties = {
  ...segmentStyleBtn,
  background: "#111827",
  color: "#fff",
};

const iconButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111827",
  cursor: "pointer",
  position: "relative",
};

const logoStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: "linear-gradient(135deg,#6366f1,#0ea5e9)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  letterSpacing: 0.5,
};

const brandStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#111827",
  lineHeight: 1,
};

const brandSubStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  marginTop: 2,
};

const searchWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  background: "#fff",
  minWidth: 220,
  color: "#6b7280",
};

const searchInputStyle: React.CSSProperties = {
  border: "none",
  outline: "none",
  fontSize: 13,
  width: "100%",
  color: "#111827",
  background: "transparent",
};

const selectWrapStyle: React.CSSProperties = {
  position: "relative",
  display: "inline-flex",
};

const selectStyle: React.CSSProperties = {
  appearance: "none",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  background: "#fff",
  color: "#111827",
  cursor: "pointer",
};

const badgeStyle: React.CSSProperties = {
  position: "absolute",
  top: -4,
  right: -4,
  background: "#ef4444",
  color: "#fff",
  fontSize: 10,
  fontWeight: 700,
  borderRadius: 999,
  minWidth: 16,
  height: 16,
  padding: "0 4px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const userButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "4px 8px",
  background: "#fff",
  cursor: "pointer",
  color: "#111827",
};

const avatarStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: "50%",
  background: "#111827",
  color: "#fff",
  fontSize: 11,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  right: 0,
  top: "calc(100% + 6px)",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  minWidth: 220,
  padding: 6,
  zIndex: 40,
};

const dropdownHeaderStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  padding: "6px 8px",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const dropdownEmptyStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  padding: "10px 8px",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
};

const listItemStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#111827",
  padding: "8px",
  borderRadius: 6,
};

const menuItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "transparent",
  border: "none",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
  cursor: "pointer",
  color: "#111827",
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: "#f3f4f6",
  margin: "4px 0",
};

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};
```

---

## 2. Wire `onToggleSidebar` from the shell

`DashboardShell.tsx` must pass the sidebar toggle so the hamburger works. Ensure it renders both and passes the prop:

```tsx
// src/components/layout/DashboardShell.tsx
const [sidebarOpen, setSidebarOpen] = useState(true);

<DashboardHeader
  currentSection={activeSection}
  viewMode={viewMode}
  density={density}
  selectedPlatform={selectedPlatform}
  sidebarOpen={sidebarOpen}
  onSelectSection={onSectionChange}
  onToggleViewMode={setViewMode}
  onToggleDensity={setDensity}
  onPlatformChange={setSelectedPlatform}
  onToggleSidebar={() => setSidebarOpen((v) => !v)}
  onSearch={(q) => { /* optional: propagate to pages */ }}
  userName="Citrix Lab"
  userRole="Admin"
  notificationCount={3}
/>
```

If `DashboardShell` already manages `sidebarOpen` for its sidebar, just pass `() => setSidebarOpen(v => !v)` — no other change needed.

---

## 3. Optional — debounced search consumers

If you want the search to filter the Clients table, lift state or use a small context. Simplest approach in `dashboard/page.tsx`:

```tsx
const [query, setQuery] = useState("");

<DashboardShell
  // ...
  onSearch={setQuery}   // passed through to DashboardHeader
/>

{currentSection === "clients" && (
  <section style={{ padding: 24 }}>
    <ClientsTable globalQuery={query} />
  </section>
)}
```

Then in `ClientsTable`, seed the search box from `globalQuery`:

```tsx
export default function ClientsTable({ globalQuery = "" }: { globalQuery?: string }) {
  // ...
  useEffect(() => setSearch(globalQuery), [globalQuery]);
}
```

This is optional — the header works standalone without it.

---

## 4. Errors this fixes

| Original error | Fix |
|---|---|
| `DashboardHeader.tsx(98,11) TS2322: Type '(mode: "grid" \| "list") => void' is not assignable to MouseEventHandler` | Handlers are wrapped: `onClick={() => onToggleViewMode("grid")}` |
| `DashboardHeader.tsx(112,11) TS2322: Type '(density: "spacious" \| "compact") => void' …` | Same pattern for density |
| Section switch type mismatch (`string` vs `DashboardViewSection`) | Tabs iterate `TABS: { id: DashboardViewSection }[]` and call `onSelectSection(tab.id)` |
| Broken mobile layout | Hamburger + scroll tabs + hidden search/select under 720/880px |
| Missing a11y | `role="tablist"`, `aria-selected`, `aria-pressed`, `aria-expanded`, `aria-label`, focus rings |

---

## 5. Verify locally

```bash
cd ~/smma/nextjs-setup/nextjs-dashboard
pnpm build
```

Expect a clean type-check and the header to appear in the dashboard. Then:

```bash
pnpm dev
```

Open `http://localhost:YOUR_PORT/dashboard` and check:

- [ ] Tabs switch sections (Overview / Approval / Drafts / Clients / Analytics / Settings)
- [ ] Grid/List toggle visibly toggles `aria-pressed` and swaps the icon styling
- [ ] Density toggle does the same
- [ ] Platform dropdown updates (visible in the shell state)
- [ ] Bell opens/closes, shows badge when `notificationCount > 0`
- [ ] User menu opens/closes on outside click
- [ ] Search box debounces (`onSearch` fires ~250 ms after typing)
- [ ] Resize to ≤880px → search disappears; ≤720px → select and user text disappear; tabs scroll horizontally
- [ ] Tab key cycles focus rings on hamburger, bell, user, and tabs
- [ ] No console errors

---

## 6. Commit

```bash
cd ~/smma
git add nextjs-setup/nextjs-dashboard/src/components/layout/DashboardHeader.tsx \
        nextjs-setup/nextjs-dashboard/src/components/layout/DashboardShell.tsx \
        nextjs-setup/nextjs-dashboard/src/app/dashboard/page.tsx
git commit -m "v2.1: fix nav header UI, types, and responsive layout"
git push origin main
```

---

## 7. v2.1 deliverables

| File | Change |
|---|---|
| `DashboardHeader.tsx` | Full rewrite: types fixed, tabs, toggles, search, notifications, user menu, mobile responsive, a11y |
| `DashboardShell.tsx` | Pass `sidebarOpen` + `onToggleSidebar`; forward optional `onSearch` / user props |
| `dashboard/page.tsx` | Optional: wire global search state → `ClientsTable` |

Once pushed, Vercel should build cleanly and the header will look and behave like a real dashboard nav — no more type errors, no more squeezed mobile layout.