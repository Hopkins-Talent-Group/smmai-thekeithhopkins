"use client";

import React, { useEffect, useRef, useState } from "react";
import { DashboardViewSection } from "@/lib/crm";

export interface DashboardHeaderProps {
  currentSection: DashboardViewSection;
  selectedPlatform: string;
  sidebarOpen: boolean;
  onPlatformChange: (platform: string) => void;
  onToggleSidebar: () => void;
  userName?: string;
  userRole?: string;
  notificationCount?: number;
}

const PLATFORMS = [
  { value: "all", label: "All platforms" },
  { value: "meta", label: "Meta" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
];

const LABELS: Record<DashboardViewSection, string> = {
  overview: "Overview",
  approval: "Approval gate",
  drafts: "Drafts",
  analytics: "Analytics",
  guardrails: "Brand & guardrails",
  clients: "Clients",
  settings: "Settings",
  graph: "System diagnostics",
  accounts: "Accounts",
  audit: "Audit",
  automation: "Automation",
  calendar: "Calendar",
  inbox: "Inbox",
  pipeline: "Pipeline",};

export default function DashboardHeader({
  currentSection,
  selectedPlatform,
  sidebarOpen,
  onPlatformChange,
  onToggleSidebar,
  userName = "Workspace admin",
  userRole = "Admin",
  notificationCount = 0,
}: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const initials = userName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(7,12,9,0.96)", borderBottom: "1px solid var(--line)", backdropFilter: "blur(10px)" }}>
      <div style={{ minHeight: 64, padding: "0.65rem clamp(1rem, 2.5vw, 1.5rem)", display: "flex", alignItems: "center", gap: "1rem" }}>
        <button type="button" onClick={onToggleSidebar} aria-label={sidebarOpen ? "Collapse navigation" : "Expand navigation"} aria-expanded={sidebarOpen}
          style={{ width: 38, height: 38, border: "1px solid var(--line)", borderRadius: "var(--radius-medium)", background: "var(--surface)", color: "var(--text)", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 18 }}>
          ☰
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: "var(--text)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-bold)" }}>S M M <span style={{ color: "var(--primary)" }}>AI</span></div>
          <div style={{ color: "var(--muted)", fontSize: "var(--text-xs)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{LABELS[currentSection]}</div>
        </div>
        <label style={{ display: "flex", alignItems: "center" }}>
          <span className="sr-only">Platform</span>
          <select value={selectedPlatform} onChange={(event) => onPlatformChange(event.target.value)} aria-label="Filter by platform"
            style={{ minHeight: 38, maxWidth: 160, border: "1px solid var(--line)", borderRadius: "var(--radius-medium)", background: "var(--surface)", color: "var(--text)", padding: "0 0.7rem", font: "inherit", fontSize: "var(--text-xs)" }}>
            {PLATFORMS.map((platform) => <option key={platform.value} value={platform.value}>{platform.label}</option>)}
          </select>
        </label>
        <div ref={notifRef} style={{ position: "relative" }}>
          <button type="button" onClick={() => setNotifOpen((open) => !open)} aria-label={"Notifications" + (notificationCount ? ": " + notificationCount + " unread" : "")} aria-expanded={notifOpen}
            style={{ width: 38, height: 38, border: "1px solid var(--line)", borderRadius: "var(--radius-medium)", background: "var(--surface)", color: "var(--text)", cursor: "pointer", position: "relative" }}>
            ♢
            {notificationCount > 0 && <span aria-hidden style={{ position: "absolute", top: -4, right: -4, minWidth: 17, height: 17, padding: "0 4px", borderRadius: 9, background: "var(--accent)", color: "var(--bg)", fontSize: 10, fontWeight: 800, display: "grid", placeItems: "center" }}>{notificationCount > 9 ? "9+" : notificationCount}</span>}
          </button>
          {notifOpen && (
            <div role="menu" style={{ position: "absolute", right: 0, top: "calc(100% + 0.5rem)", width: 280, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius-medium)", padding: "0.75rem", boxShadow: "0 16px 40px rgba(0,0,0,0.35)" }}>
              <strong style={{ fontSize: "var(--text-sm)" }}>Notifications</strong>
              <p style={{ margin: "0.5rem 0 0", color: "var(--muted)", fontSize: "var(--text-xs)" }}>{notificationCount ? notificationCount + " item(s) need attention." : "You're all caught up."}</p>
            </div>
          )}
        </div>
        <div ref={menuRef} style={{ position: "relative" }}>
          <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={menuOpen}
            style={{ display: "flex", alignItems: "center", gap: "0.55rem", border: "1px solid var(--line)", borderRadius: "var(--radius-medium)", background: "var(--surface)", color: "var(--text)", padding: "0.35rem 0.6rem", cursor: "pointer", font: "inherit" }}>
            <span aria-hidden style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 }}>{initials}</span>
            <span className="dh-user-text" style={{ textAlign: "left", lineHeight: 1.2 }}>
              <strong style={{ display: "block", fontSize: 12 }}>{userName}</strong>
              <span style={{ display: "block", fontSize: 10, color: "var(--muted)" }}>{userRole}</span>
            </span>
            <span aria-hidden>⌄</span>
          </button>
          {menuOpen && (
            <div role="menu" style={{ position: "absolute", right: 0, top: "calc(100% + 0.5rem)", width: 180, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius-medium)", padding: "0.35rem", boxShadow: "0 16px 40px rgba(0,0,0,0.35)" }}>
              <button type="button" role="menuitem" style={menuItemStyle}>Profile</button>
              <button type="button" role="menuitem" style={menuItemStyle}>Preferences</button>
              <div style={{ height: 1, background: "var(--line)", margin: "0.25rem 0" }} />
              <button type="button" role="menuitem" style={{ ...menuItemStyle, color: "#f87171" }}>Sign out</button>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        @media (max-width: 640px) { :global(.dh-user-text) { display: none; } }
        @media (max-width: 520px) { select { max-width: 120px !important; } }
      `}</style>
    </header>
  );
}

const menuItemStyle: React.CSSProperties = {
  width: "100%",
  border: 0,
  background: "transparent",
  color: "var(--text)",
  textAlign: "left",
  padding: "0.55rem 0.65rem",
  borderRadius: "var(--radius-small)",
  cursor: "pointer",
  font: "inherit",
  fontSize: "var(--text-xs)",
};
