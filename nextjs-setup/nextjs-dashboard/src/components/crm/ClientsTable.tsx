"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Client, ClientStats, ClientStatus, CLIENT_STATUSES } from "@/lib/crm";
import ClientForm from "./ClientForm";
import ClientStatsCards from "./ClientStatsCards";

const statusColor: Record<ClientStatus, { bg: string; color: string }> = {
  PROSPECT: { bg: "rgba(245,158,11,0.12)", color: "var(--accent)" },
  ACTIVE: { bg: "var(--primary-light)", color: "var(--primary)" },
  PAUSED: { bg: "rgba(113,133,121,0.18)", color: "var(--muted)" },
  CHURNED: { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
};

export default function ClientsTable() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all");
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/crm/clients?stats=1", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to load clients.");
      setClients(data.clients ?? []);
      setStats(data.stats ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load clients.");
      setClients([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  const closeForm = useCallback(() => {
    setEditing(null);
    setCreating(false);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.name, c.company, c.email, c.industry ?? "", ...c.tags]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [clients, search, statusFilter]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this client?")) return;
    const res = await fetch(`/api/crm/clients/${id}`, { method: "DELETE" });
    if (res.ok) {
      setClients((prev) => prev.filter((c) => c.id !== id));
      load();
    }
  }

  const isCompact = density === "compact";
  const tableCellPadding = isCompact ? "6px 10px" : "12px 14px";
  const tableFontSize = isCompact ? 13 : 14;

  return (
    <div>
      {stats && <ClientStatsCards stats={stats} />}

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 260, flexWrap: "wrap" }}>
          <input
            placeholder="Search name, company, email, tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: isCompact ? "6px 10px" : "8px 12px",
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 14,
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ClientStatus | "all")
            }
            style={{
              padding: isCompact ? "6px 10px" : "8px 12px",
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 14,
            }}
          >
            <option value="all">All statuses</option>
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* View Mode Toggle: List vs Grid */}
          <div
            role="group"
            aria-label="View layout"
            style={{
              display: "inline-flex",
              border: "1px solid var(--line)",
              borderRadius: 6,
              overflow: "hidden",
              background: "var(--surface)",
            }}
          >
            <button
              type="button"
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              title="List view"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: viewMode === "list" ? "var(--panel)" : "transparent",
                color: viewMode === "list" ? "var(--primary)" : "var(--muted)",
                border: "none",
                padding: isCompact ? "5px 9px" : "7px 11px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: viewMode === "list" ? 600 : 400,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              <span>List</span>
            </button>
            <button
              type="button"
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
              title="Grid view"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: viewMode === "grid" ? "var(--panel)" : "transparent",
                color: viewMode === "grid" ? "var(--primary)" : "var(--muted)",
                border: "none",
                borderLeft: "1px solid var(--line)",
                padding: isCompact ? "5px 9px" : "7px 11px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: viewMode === "grid" ? 600 : 400,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              <span>Grid</span>
            </button>
          </div>

          {/* Density Toggle: Comfortable vs Compact */}
          <div
            role="group"
            aria-label="Display density"
            style={{
              display: "inline-flex",
              border: "1px solid var(--line)",
              borderRadius: 6,
              overflow: "hidden",
              background: "var(--surface)",
            }}
          >
            <button
              type="button"
              aria-label="Comfortable density"
              aria-pressed={density === "comfortable"}
              onClick={() => setDensity("comfortable")}
              title="Comfortable density"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: density === "comfortable" ? "var(--panel)" : "transparent",
                color: density === "comfortable" ? "var(--primary)" : "var(--muted)",
                border: "none",
                padding: isCompact ? "5px 9px" : "7px 11px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: density === "comfortable" ? 600 : 400,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="5" x2="21" y2="5"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="19" x2="21" y2="19"></line>
              </svg>
              <span>Comfortable</span>
            </button>
            <button
              type="button"
              aria-label="Compact density"
              aria-pressed={density === "compact"}
              onClick={() => setDensity("compact")}
              title="Compact density"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: density === "compact" ? "var(--panel)" : "transparent",
                color: density === "compact" ? "var(--primary)" : "var(--muted)",
                border: "none",
                borderLeft: "1px solid var(--line)",
                padding: isCompact ? "5px 9px" : "7px 11px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: density === "compact" ? 600 : 400,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="4" x2="21" y2="4"></line>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="3" y1="14" x2="21" y2="14"></line>
                <line x1="3" y1="19" x2="21" y2="19"></line>
              </svg>
              <span>Compact</span>
            </button>
          </div>

          <button
            onClick={() => setCreating(true)}
            style={{
              background: "var(--primary)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 6,
              padding: isCompact ? "6px 12px" : "8px 14px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>+</span> New client
          </button>
        </div>
      </div>

      {(creating || editing) && (
        <ClientForm
          initial={editing ?? undefined}
          onCancel={closeForm}
          onSaved={() => {
            closeForm();
            load();
          }}
        />
      )}

      {error ? (
        <div role="alert" className="card" style={{ padding: "1rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text)", fontSize: "var(--text-sm)" }}>{error}</span>
          <button type="button" className="btn secondary" onClick={() => void load()}>Try again</button>
        </div>
      ) : loading ? (
        <div style={{ color: "var(--muted)", padding: 24, textAlign: "center" }}>Loading clients…</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--line)",
            borderRadius: 10,
            padding: 24,
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          {clients.length === 0
            ? "No clients in this workspace yet. Use + New client to add the first one."
            : "No clients match the current filters. Clear the search or choose a different status."}
        </div>
      ) : viewMode === "list" ? (
        <div
          style={{
            overflowX: "auto",
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--panel)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: tableFontSize,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", background: "var(--surface)" }}>
                <th style={{ padding: tableCellPadding, fontSize: isCompact ? 11 : 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid var(--line)" }}>Company</th>
                <th style={{ padding: tableCellPadding, fontSize: isCompact ? 11 : 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid var(--line)" }}>Contact</th>
                <th style={{ padding: tableCellPadding, fontSize: isCompact ? 11 : 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid var(--line)" }}>Status</th>
                <th style={{ padding: tableCellPadding, fontSize: isCompact ? 11 : 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid var(--line)" }}>Posts</th>
                <th style={{ padding: tableCellPadding, fontSize: isCompact ? 11 : 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid var(--line)" }}>Revenue</th>
                <th style={{ padding: tableCellPadding, fontSize: isCompact ? 11 : 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid var(--line)" }}>Manager</th>
                <th style={{ padding: tableCellPadding, fontSize: isCompact ? 11 : 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid var(--line)" }}>Last activity</th>
                <th style={{ padding: tableCellPadding, fontSize: isCompact ? 11 : 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid var(--line)", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: tableCellPadding }}>
                    <div style={{ fontWeight: 600 }}>{c.company}</div>
                    <div style={{ color: "var(--muted)", fontSize: isCompact ? 11 : 12 }}>{c.industry ?? "—"}</div>
                  </td>
                  <td style={{ padding: tableCellPadding }}>
                    <div>{c.name}</div>
                    <div style={{ color: "var(--muted)", fontSize: isCompact ? 11 : 12 }}>{c.email}</div>
                  </td>
                  <td style={{ padding: tableCellPadding }}>
                    <span
                      style={{
                        background: statusColor[c.status].bg,
                        color: statusColor[c.status].color,
                        borderRadius: 999,
                        padding: isCompact ? "1px 8px" : "2px 10px",
                        fontSize: isCompact ? 11 : 12,
                        textTransform: "capitalize",
                        display: "inline-block",
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: tableCellPadding }}>{c.posts.count}</td>
                  <td style={{ padding: tableCellPadding }}>${c.revenue.toLocaleString()}</td>
                  <td style={{ padding: tableCellPadding }}>{c.accountManager ?? "—"}</td>
                  <td style={{ padding: tableCellPadding }}>
                    {new Date(c.lastActivity).toLocaleDateString()}
                  </td>
                  <td style={{ padding: tableCellPadding, textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => setEditing(c)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--primary)",
                        cursor: "pointer",
                        fontSize: isCompact ? 12 : 13,
                        padding: "2px 6px",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#f87171",
                        cursor: "pointer",
                        fontSize: isCompact ? 12 : 13,
                        padding: "2px 6px",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View Layout */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "repeat(auto-fill, minmax(240px, 1fr))"
              : "repeat(auto-fill, minmax(290px, 1fr))",
            gap: isCompact ? 10 : 16,
          }}
        >
          {filtered.map((c) => (
            <div
              key={c.id}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 8,
                background: "var(--panel)",
                padding: isCompact ? "12px" : "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: isCompact ? 8 : 12,
                transition: "border-color 0.15s ease",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                  <div>
                    <h3 style={{ fontSize: isCompact ? 14 : 15, fontWeight: 600, margin: 0, color: "var(--text)" }}>
                      {c.company}
                    </h3>
                    <span style={{ fontSize: isCompact ? 11 : 12, color: "var(--muted)" }}>
                      {c.industry || "General Industry"}
                    </span>
                  </div>
                  <span
                    style={{
                      background: statusColor[c.status].bg,
                      color: statusColor[c.status].color,
                      borderRadius: 999,
                      padding: "2px 8px",
                      fontSize: 11,
                      textTransform: "capitalize",
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {c.status}
                  </span>
                </div>

                <div
                  style={{
                    margin: isCompact ? "6px 0" : "10px 0",
                    padding: isCompact ? "6px 8px" : "8px 10px",
                    background: "var(--surface)",
                    borderRadius: 6,
                    fontSize: isCompact ? 12 : 13,
                  }}
                >
                  <div style={{ fontWeight: 500, color: "var(--text)" }}>{c.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: isCompact ? 11 : 12, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.email}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                    fontSize: isCompact ? 11 : 12,
                    color: "var(--muted)",
                  }}
                >
                  <div>
                    <span>Revenue: </span>
                    <strong style={{ color: "var(--text)" }}>${c.revenue.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Posts: </span>
                    <strong style={{ color: "var(--text)" }}>{c.posts.count}</strong>
                  </div>
                  <div>
                    <span>Manager: </span>
                    <span style={{ color: "var(--text)" }}>{c.accountManager ?? "—"}</span>
                  </div>
                  <div>
                    <span>Activity: </span>
                    <span style={{ color: "var(--text)" }}>{new Date(c.lastActivity).toLocaleDateString()}</span>
                  </div>
                </div>

                {c.tags && c.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: isCompact ? 6 : 8 }}>
                    {c.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 10,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "var(--surface)",
                          color: "var(--muted)",
                          border: "1px solid var(--line)",
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  borderTop: "1px solid var(--line)",
                  paddingTop: isCompact ? 6 : 8,
                  marginTop: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditing(c)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--primary)",
                    cursor: "pointer",
                    fontSize: isCompact ? 12 : 13,
                    padding: "3px 8px",
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#f87171",
                    cursor: "pointer",
                    fontSize: isCompact ? 12 : 13,
                    padding: "3px 8px",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}