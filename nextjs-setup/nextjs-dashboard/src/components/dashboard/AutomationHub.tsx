"use client";

import React, { useCallback, useEffect, useState } from "react";

interface HubJob {
  id: string;
  draftId: string;
  draftTopic: string;
  platform: string;
  status: string;
  error: string | null;
  externalPostId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface HubData {
  queue: { pending: number; failed: number; deadLetter: number; unavailable: boolean };
  byStatus: Record<string, number>;
  jobs: HubJob[];
  workflows: Array<{ id: string; name: string; isActive: boolean; updatedAt: string }>;
  dryRun: boolean;
}

export default function AutomationHub() {
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/automation/hub", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to load automation state.");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load automation state.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load());
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <section aria-labelledby="automation-heading" style={{ display: "grid", gap: "1rem" }}>
      <div className="card" style={{ padding: "1rem 1.25rem" }}>
        <h2 id="automation-heading" style={{ margin: 0, fontSize: "var(--text-md)" }}>Jobs and workflows</h2>
        <p style={{ margin: "0.4rem 0 0", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
          Live queue depth, recent publish jobs, and dead-letter visibility. Refreshes every 30 seconds.
          {data && <strong style={{ color: data.dryRun ? "var(--accent)" : "#f87171" }}> {data.dryRun ? "· DRY-RUN mode" : "· LIVE mode"}</strong>}
        </p>
        {error && <div role="alert" style={{ marginTop: "0.7rem", padding: "0.55rem 0.7rem", borderRadius: "var(--radius-small)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", fontSize: "var(--text-xs)" }}>{error}</div>}
      </div>
      {loading && !data ? (
        <div className="card" style={{ padding: "1.25rem", color: "var(--muted)", fontSize: "var(--text-sm)" }}>Loading automation state…</div>
      ) : data && (
        <>
          <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            {[
              { label: "Queued", value: data.queue.pending },
              { label: "Dead-letter", value: data.queue.deadLetter },
              { label: "Failed jobs", value: data.queue.failed },
              ...Object.entries(data.byStatus).map(([status, count]) => ({ label: status, value: count })),
            ].map((stat) => (
              <div key={stat.label} className="card" style={{ padding: "0.8rem 1rem" }}>
                <div style={{ color: "var(--muted)", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{stat.label}</div>
                <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-bold)" }}>{stat.value}</div>
              </div>
            ))}
          </div>
          {data.queue.unavailable && (
            <div className="card" style={{ padding: "0.9rem 1.1rem", fontSize: "var(--text-xs)", color: "var(--accent)" }}>
              Redis queue is unreachable — job counts below come from the database only.
            </div>
          )}
          <div className="card" style={{ padding: "1rem 1.25rem" }}>
            <h3 style={{ margin: "0 0 0.6rem", fontSize: "var(--text-sm)" }}>Recent publish jobs</h3>
            {data.jobs.length === 0 ? (
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--text-xs)" }}>No publish jobs yet. Approve a draft and queue it for publishing.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.5rem" }}>
                {data.jobs.map((job) => (
                  <li key={job.id} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem", alignItems: "baseline", borderTop: "1px solid var(--line)", paddingTop: "0.5rem", fontSize: "var(--text-xs)" }}>
                    <strong style={{ color: "var(--text)" }}>{job.draftTopic}</strong>
                    <span style={{ color: "var(--muted)" }}>{job.platform}</span>
                    <span style={{ padding: "0.1rem 0.45rem", borderRadius: "var(--radius-small)", border: "1px solid var(--line)", background: "var(--surface)" }}>{job.status}</span>
                    {job.error && <span style={{ color: "#f87171" }}>{job.error}</span>}
                    {job.externalPostId && <span style={{ color: "var(--muted)" }}>↗ {job.externalPostId}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
