"use client";

import React, { useEffect, useState } from "react";

interface Overview { drafts: number; published: number; statusCounts: Record<string, number>; timeframe?: string; }

export default function AnalyticsCards() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/analytics?type=overview&timeframe=30d", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Analytics unavailable.");
        setData(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Analytics unavailable."))
      .finally(() => setLoading(false));
  }, []);

  const metrics = data ? [
    { label: "Content items", value: data.drafts, detail: "Tracked in the workspace" },
    { label: "Published", value: data.published, detail: "Marked published" },
    { label: "Awaiting approval", value: data.statusCounts?.pending ?? 0, detail: "Human review required" },
    { label: "Scheduled", value: data.statusCounts?.scheduled ?? 0, detail: "Queued for delivery" },
  ] : [];

  return (
    <section aria-labelledby="analytics-heading">
      <div style={{ marginBottom: "1rem" }}>
        <span className="eyebrow">Performance feedback</span>
        <h2 id="analytics-heading" style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-black)" }}>Publishing analytics</h2>
        <p style={{ margin: "0.4rem 0 0", color: "var(--muted)", fontSize: "var(--text-sm)" }}>Current workspace pipeline metrics for the last 30 days.</p>
      </div>

      {loading && <div className="card" style={{ padding: "1.5rem", color: "var(--muted)" }}>Loading analytics…</div>}
      {error && <div role="alert" className="card" style={{ padding: "1rem", color: "var(--text)", borderColor: "rgba(239,68,68,0.3)" }}>{error}</div>}

      {!loading && !error && data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: "0.9rem" }}>
            {metrics.map((metric) => (
              <article key={metric.label} className="card" style={{ padding: "1.1rem" }}>
                <span style={{ display: "block", color: "var(--muted)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)" }}>{metric.label}</span>
                <strong style={{ display: "block", marginTop: "0.4rem", fontSize: "clamp(1.7rem, 4vw, 2.3rem)", lineHeight: 1, color: "var(--text)" }}>{metric.value.toLocaleString()}</strong>
                <span style={{ display: "block", marginTop: "0.55rem", color: "var(--muted)", fontSize: "var(--text-xs)" }}>{metric.detail}</span>
              </article>
            ))}
          </div>
          <div className="card" style={{ marginTop: "0.9rem", padding: "1rem", color: "var(--muted)", fontSize: "var(--text-xs)" }}>
            Analytics currently reflects publishing workflow state. Engagement, reach, and platform-level performance should appear here once normalized analytics ingestion is connected.
          </div>
        </>
      )}
    </section>
  );
}
