"use client";

import React, { useEffect, useState } from "react";

interface SystemStatus { health?: "healthy" | "degraded" | "unhealthy"; dryRun?: boolean; wasmRanking?: boolean; }

export default function AutomationStatusCard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/crm/status", { cache: "no-store" });
        const data = await res.json();
        if (res.ok) setStatus(data);
      } finally {
        setLoading(false);
      }
    };
    void load();
    const interval = window.setInterval(load, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const health = status?.health || "unknown";

  return (
    <section className="card" aria-labelledby="automation-heading" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
        <div><span className="eyebrow">Automation status</span><h2 id="automation-heading" style={{ margin: 0, fontSize: "var(--text-lg)" }}>Engine & policy gates</h2></div>
        <span style={{ padding: "0.25rem 0.55rem", borderRadius: "var(--radius-small)", border: "1px solid var(--line)", background: "var(--surface)", color: health === "healthy" ? "var(--primary)" : "var(--accent)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)" }}>
          {loading ? "Checking…" : health === "unknown" ? "Status unavailable" : health}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "0.75rem" }}>
        <StatusItem label="Publishing safety" value={status?.dryRun ? "Dry run enabled" : "Live mode"} detail="Server-reported execution mode." />
        <StatusItem label="Human approval" value="Required" detail="Publishing should remain behind the approval gate." />
        <StatusItem label="Moderation" value="Pre-publish" detail="Content policy checks belong before delivery." />
        <StatusItem label="Signal engine" value={status?.wasmRanking ? "WASM" : "Python / server"} detail="Server-reported ranking path." />
      </div>

      <p style={{ margin: "0.9rem 0 0", color: "var(--muted)", fontSize: "var(--text-xs)" }}>
        Controls are intentionally read-only here until the backing configuration API is authoritative. The dashboard must not imply that browser-local toggles change production behavior.
      </p>
    </section>
  );
}

function StatusItem({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div style={{ padding: "0.85rem", border: "1px solid var(--line)", borderRadius: "var(--radius-medium)", background: "var(--surface)" }}>
      <span style={{ display: "block", color: "var(--muted)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)" }}>{label}</span>
      <strong style={{ display: "block", marginTop: "0.25rem", fontSize: "var(--text-sm)" }}>{value}</strong>
      <span style={{ display: "block", marginTop: "0.3rem", color: "var(--muted)", fontSize: "var(--text-xs)", lineHeight: "var(--lh-normal)" }}>{detail}</span>
    </div>
  );
}
