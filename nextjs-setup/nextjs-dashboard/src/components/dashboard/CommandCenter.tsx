"use client";

import React, { useEffect, useState } from "react";
import type { DashboardViewSection } from "@/lib/crm";

type Metrics = {
  clients: number; leads: number; openOpportunities: number; pendingApprovals: number;
  scheduledJobs: number; failedJobs: number; connectedAccounts: number;
};

const cards: Array<{ key: keyof Metrics; label: string; section: DashboardViewSection }> = [
  { key: "pendingApprovals", label: "Needs approval", section: "approval" },
  { key: "scheduledJobs", label: "Queued publishes", section: "calendar" },
  { key: "failedJobs", label: "Failed jobs", section: "automation" },
  { key: "connectedAccounts", label: "Connected accounts", section: "accounts" },
  { key: "leads", label: "Active leads", section: "pipeline" },
  { key: "openOpportunities", label: "Open opportunities", section: "pipeline" },
  { key: "clients", label: "CRM clients", section: "clients" },
];

export default function CommandCenter({ onNavigate }: { onNavigate: (section: DashboardViewSection) => void }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activities, setActivities] = useState<Array<{ id: string; subject: string; type: string }>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/crm/overview", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load command center.");
        setMetrics(data.metrics);
        setActivities(data.recentActivities ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load command center."));
  }, []);

  return (
    <section aria-labelledby="command-center" style={{ display: "grid", gap: "1rem" }}>
      {error && <div role="alert" className="card" style={{ padding: "0.85rem" }}>{error}</div>}
      <div id="command-center" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))", gap: "0.75rem" }}>
        {cards.map((card) => (
          <button key={card.key} type="button" className="card" onClick={() => onNavigate(card.section)}
            style={{ textAlign: "left", padding: "1rem", cursor: "pointer", border: "1px solid var(--line)", color: "var(--text)", background: "var(--panel)" }}>
            <span style={{ display: "block", color: "var(--muted)", fontSize: "var(--text-xs)" }}>{card.label}</span>
            <strong style={{ display: "block", marginTop: "0.3rem", fontSize: "1.65rem" }}>{metrics ? metrics[card.key] : "—"}</strong>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: "1rem" }}>
        <section className="card" aria-labelledby="quick-actions">
          <h2 id="quick-actions" style={{ margin: 0, fontSize: "var(--text-md)" }}>Quick actions</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.8rem" }}>
            <button className="btn primary" type="button" onClick={() => onNavigate("drafts")}>Create content</button>
            <button className="btn secondary" type="button" onClick={() => onNavigate("pipeline")}>Open CRM pipeline</button>
            <button className="btn secondary" type="button" onClick={() => onNavigate("accounts")}>Manage social accounts</button>
            <button className="btn secondary" type="button" onClick={() => onNavigate("inbox")}>Open unified inbox</button>
          </div>
        </section>
        <section className="card" aria-labelledby="activity-feed">
          <h2 id="activity-feed" style={{ margin: 0, fontSize: "var(--text-md)" }}>Recent activity</h2>
          {activities.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>No workspace activity yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: "0.75rem 0 0", display: "grid", gap: "0.55rem" }}>
              {activities.map((item) => <li key={item.id} style={{ borderTop: "1px solid var(--line)", paddingTop: "0.55rem", fontSize: "var(--text-sm)" }}><strong>{item.subject}</strong><span style={{ color: "var(--muted)", marginLeft: "0.4rem" }}>{item.type}</span></li>)}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
