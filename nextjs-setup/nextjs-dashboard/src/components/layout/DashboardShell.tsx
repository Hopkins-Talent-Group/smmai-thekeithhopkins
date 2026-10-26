"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { DashboardViewSection } from "@/lib/crm";

interface DashboardShellProps {
  children: ReactNode;
  sidebarOpen: boolean;
  activeSection: DashboardViewSection;
  onSelectSection: (section: DashboardViewSection) => void;
}

export interface NavItem {
  id: DashboardViewSection;
  label: string;
  description: string;
  badge?: string;
  devOnly?: boolean;
}

export interface NavCategory {
  title: string;
  items: NavItem[];
}

const navCategories: NavCategory[] = [
  {
    title: "Publishing & Editorial",
    items: [
      { id: "overview", label: "Overview", description: "Command center" },
      { id: "approval", label: "Approval Gate", description: "Human gate", badge: "Gate" },
      { id: "drafts", label: "Draft Library", description: "Content & posts" },
      { id: "calendar", label: "Content Calendar", description: "Scheduling & timing" },
    ],
  },
  {
    title: "Engagement & CRM",
    items: [
      { id: "inbox", label: "Unified Inbox", description: "Conversations & DMs" },
      { id: "clients", label: "Clients", description: "Account management" },
      { id: "pipeline", label: "Deal Pipeline", description: "Leads & opportunities" },
    ],
  },
  {
    title: "Intelligence & Quality",
    items: [
      { id: "analytics", label: "Analytics", description: "Feedback signals" },
      { id: "guardrails", label: "Brand & Guardrails", description: "Voice & policy" },
      { id: "automation", label: "Automation", description: "Jobs & workflows" },
    ],
  },
  {
    title: "Workspace & System",
    items: [
      { id: "accounts", label: "Social Accounts", description: "Connected networks" },
      { id: "settings", label: "Settings", description: "Preferences & rules" },
      { id: "audit", label: "Audit Log", description: "Security & compliance" },
      { id: "graph", label: "System Diagnostics", description: "Architecture graph", devOnly: true },
    ],
  },
];

function NavIcon({ section }: { section: DashboardViewSection }) {
  const iconStyle: React.CSSProperties = {
    width: 16,
    height: 16,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  switch (section) {
    case "overview":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      );
    case "approval":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "drafts":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 9H8" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </svg>
      );
    case "calendar":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h18" />
        </svg>
      );
    case "inbox":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "clients":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "pipeline":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12h20" />
          <path d="M20 12v8H4v-8" />
          <path d="m4 8 8-4 8 4" />
          <path d="M10 12v4" />
          <path d="M14 12v4" />
        </svg>
      );
    case "analytics":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" x2="18" y1="20" y2="10" />
          <line x1="12" x2="12" y1="20" y2="4" />
          <line x1="6" x2="6" y1="20" y2="14" />
        </svg>
      );
    case "guardrails":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        </svg>
      );
    case "automation":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case "accounts":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" x2="22" y1="12" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case "settings":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "audit":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "graph":
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="6" x2="6" y1="9" y2="15" />
          <circle cx="18" cy="12" r="3" />
          <line x1="8.6" x2="15.4" y1="7.3" y2="10.7" />
          <line x1="8.6" x2="15.4" y1="16.7" y2="13.3" />
        </svg>
      );
    default:
      return null;
  }
}

export default function DashboardShell({ children, sidebarOpen, activeSection, onSelectSection }: DashboardShellProps) {
  return (
    <div style={{ minHeight: "calc(100vh - 64px)", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {sidebarOpen && (
          <aside
            aria-label="Dashboard navigation"
            style={{
              width: 256,
              flexShrink: 0,
              borderRight: "1px solid var(--line)",
              background: "var(--panel)",
              display: "flex",
              flexDirection: "column",
              height: "calc(100vh - 64px)",
              position: "sticky",
              top: 64,
            }}
          >
            {/* Workspace Identifier Header */}
            <div style={{ padding: "1.1rem 1rem 0.9rem", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-bold)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--ls-label)",
                  }}
                >
                  Workspace
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.6875rem",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-small)",
                    background: "rgba(5,150,105,0.12)",
                    color: "var(--primary)",
                    fontWeight: "var(--weight-semibold)",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)" }} />
                  Live
                </span>
              </div>
              <strong style={{ display: "block", marginTop: "0.35rem", fontSize: "var(--text-sm)", color: "var(--text)", letterSpacing: "var(--ls-snug)" }}>
                S M M <span style={{ color: "var(--primary)" }}>AI</span>
              </strong>
            </div>

            {/* Categorized Navigation Body */}
            <div
              style={{
                flex: "1 1 auto",
                overflowY: "auto",
                padding: "0.85rem 0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {navCategories.map((category) => {
                const visibleItems = category.items.filter((item) => !item.devOnly || process.env.NODE_ENV !== "production");
                if (visibleItems.length === 0) return null;

                return (
                  <div key={category.title} role="group" aria-label={category.title}>
                    <div
                      style={{
                        padding: "0 0.5rem 0.4rem",
                        color: "var(--muted)",
                        fontSize: "0.6875rem",
                        fontWeight: "var(--weight-bold)",
                        textTransform: "uppercase",
                        letterSpacing: "var(--ls-label)",
                        userSelect: "none",
                      }}
                    >
                      {category.title}
                    </div>
                    <nav style={{ display: "grid", gap: "0.15rem" }}>
                      {visibleItems.map((item) => {
                        const active = item.id === activeSection;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => onSelectSection(item.id)}
                            aria-current={active ? "page" : undefined}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              border: "1px solid",
                              borderColor: active ? "rgba(5,150,105,0.35)" : "transparent",
                              background: active ? "var(--primary-light)" : "transparent",
                              color: active ? "var(--text)" : "var(--muted)",
                              borderRadius: "var(--radius-medium)",
                              padding: "0.55rem 0.65rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "0.6rem",
                              fontFamily: "inherit",
                              transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
                              <span style={{ color: active ? "var(--primary)" : "var(--muted)", display: "flex", alignItems: "center" }}>
                                <NavIcon section={item.id} />
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "var(--text-sm)",
                                    fontWeight: active ? "var(--weight-bold)" : "var(--weight-medium)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {item.label}
                                </span>
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "var(--text-xs)",
                                    color: active ? "var(--primary)" : "var(--muted)",
                                    lineHeight: 1.2,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {item.description}
                                </span>
                              </div>
                            </div>

                            {item.badge && (
                              <span
                                style={{
                                  flexShrink: 0,
                                  fontSize: "0.625rem",
                                  fontWeight: "var(--weight-bold)",
                                  padding: "2px 5px",
                                  borderRadius: "var(--radius-small)",
                                  background: active ? "var(--primary)" : "rgba(5,150,105,0.2)",
                                  color: active ? "var(--bg)" : "var(--primary)",
                                  lineHeight: 1,
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                );
              })}
            </div>

            {/* Sidebar Footer Link Block */}
            <div
              style={{
                marginTop: "auto",
                borderTop: "1px solid var(--line)",
                padding: "0.85rem 1rem",
                flexShrink: 0,
                background: "var(--panel)",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <Link
                href="/"
                style={{
                  color: "var(--muted)",
                  fontSize: "var(--text-xs)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  transition: "color 0.15s ease",
                }}
              >
                ← Back to overview / site
              </Link>
              <Link
                href="/login"
                style={{
                  color: "var(--muted)",
                  fontSize: "var(--text-xs)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  transition: "color 0.15s ease",
                }}
              >
                Sign in / Switch account
              </Link>
            </div>
          </aside>
        )}
        <main style={{ flex: 1, minWidth: 0, padding: "clamp(1.25rem, 3vw, 2.5rem)", overflow: "hidden" }}>{children}</main>
      </div>
    </div>
  );
}
