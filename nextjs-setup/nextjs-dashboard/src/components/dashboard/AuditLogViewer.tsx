"use client";

import React, { useCallback, useEffect, useState } from "react";

interface AuditEvent {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorUserId: string | null;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_STYLES: Record<string, string> = {
  "draft.approved": "var(--primary)",
  "draft.published": "var(--primary)",
  "draft.rejected": "#f87171",
  "job.failed": "#f87171",
  "job.dead_lettered": "#f87171",
  "account.disconnected": "#f87171",
  "account.connected": "var(--primary)",
};

export default function AuditLogViewer() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (action: string, nextCursor: string | null, append: boolean) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ take: "50" });
      if (action !== "all") params.set("action", action);
      if (nextCursor) params.set("cursor", nextCursor);
      const res = await fetch(`/api/audit?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load audit log.");
      setEvents((prev) => (append ? [...prev, ...(data.events ?? [])] : (data.events ?? [])));
      setActions(data.actions ?? []);
      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load audit log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load("all", null, false));
  }, [load]);

  function onFilterChange(value: string) {
    setFilter(value);
    setCursor(null);
    void load(value, null, false);
  }

  return (
    <section aria-labelledby="audit-heading" style={{ display: "grid", gap: "1rem" }}>
      <div className="card" style={{ padding: "1rem 1.25rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 id="audit-heading" style={{ margin: 0, fontSize: "var(--text-md)" }}>Audit log</h2>
          <p style={{ margin: "0.4rem 0 0", color: "var(--muted)", fontSize: "var(--text-sm)" }}>Immutable workspace event trail — approvals, publishes, connects, settings. Secrets are never logged.</p>
        </div>
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "var(--text-xs)", color: "var(--muted)" }}>
          Action
          <select value={filter} onChange={(e) => onFilterChange(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-small)", color: "var(--text)", padding: "0.4rem 0.6rem" }}>
            <option value="all">All actions</option>
            {actions.map((action) => <option key={action} value={action}>{action}</option>)}
          </select>
        </label>
      </div>
      {error && <div role="alert" className="card" style={{ padding: "0.9rem 1.1rem", fontSize: "var(--text-xs)", color: "#f87171" }}>{error}</div>}
      {loading && events.length === 0 ? (
        <div className="card" style={{ padding: "1.25rem", color: "var(--muted)", fontSize: "var(--text-sm)" }}>Loading audit events…</div>
      ) : events.length === 0 ? (
        <div className="card" style={{ padding: "1.25rem", color: "var(--muted)", fontSize: "var(--text-sm)" }}>No audit events yet. Approve a draft, connect a provider, or change a setting to create the first entries.</div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.6rem" }}>
          {events.map((event) => (
            <li key={event.id} className="card" style={{ padding: "0.8rem 1rem", display: "flex", flexWrap: "wrap", gap: "0.4rem 0.9rem", alignItems: "baseline", fontSize: "var(--text-xs)" }}>
              <span style={{ padding: "0.1rem 0.45rem", borderRadius: "var(--radius-small)", border: "1px solid var(--line)", background: "var(--surface)", color: ACTION_STYLES[event.action] ?? "var(--text)", fontWeight: "var(--weight-bold)" }}>{event.action}</span>
              <span style={{ color: "var(--muted)" }}>{event.resourceType}{event.resourceId ? ` · ${event.resourceId.slice(0, 12)}` : ""}</span>
              <span style={{ marginLeft: "auto", color: "var(--muted)" }}>{new Date(event.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
      {hasMore && (
        <button type="button" className="btn secondary" disabled={loading} style={{ justifySelf: "start", padding: "0.5rem 0.9rem", fontSize: "var(--text-xs)" }} onClick={() => void load(filter, cursor, true)}>
          {loading ? "Loading…" : "Load older events"}
        </button>
      )}
    </section>
  );
}
