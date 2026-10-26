"use client";

import React, { useCallback, useEffect, useState } from "react";
import { LeadStatus, LEAD_STATUSES, PipelineView } from "@/lib/crm";

const statusBadge: Record<string, { bg: string; color: string }> = {
  OPEN: { bg: "rgba(245,158,11,0.12)", color: "var(--accent)" },
  WON: { bg: "var(--primary-light)", color: "var(--primary)" },
  LOST: { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
};

const fieldLabel: React.CSSProperties = {
  display: "grid",
  gap: "0.35rem",
  color: "var(--muted)",
  fontSize: "var(--text-xs)",
  fontWeight: "var(--weight-semibold)",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 40,
  padding: "0.6rem 0.7rem",
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-small)",
  color: "var(--text)",
  font: "inherit",
  fontSize: "var(--text-sm)",
};

function money(value: number | null): string {
  return value === null ? "" : `$${value.toLocaleString()}`;
}

export default function PipelineBoard() {
  const [data, setData] = useState<PipelineView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showOppForm, setShowOppForm] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);

  const [oppTitle, setOppTitle] = useState("");
  const [oppAmount, setOppAmount] = useState("");
  const [oppStage, setOppStage] = useState("");
  const [oppClose, setOppClose] = useState("");
  const [oppLead, setOppLead] = useState("");

  const [leadTitle, setLeadTitle] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [leadValue, setLeadValue] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/pipeline", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Unable to load the pipeline.");
      setData(body as PipelineView);
      setError("");
      setOppStage((prev) => prev || (body.stages?.[0]?.id ?? ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load the pipeline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred through a promise callback so the effect body itself never
    // sets state synchronously (react-hooks/set-state-in-effect).
    Promise.resolve().then(() => load());
  }, [load]);

  async function request(method: string, payload: unknown): Promise<void> {
    const res = await fetch("/api/crm/pipeline", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "The pipeline update failed.");
  }

  async function handleMove(oppId: string, stageId: string) {
    setNotice("");
    setError("");
    try {
      await request("PATCH", { id: oppId, stageId });
      const stageName = data?.stages.find((stage) => stage.id === stageId)?.name ?? "new stage";
      setNotice(`Opportunity moved to ${stageName}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The pipeline update failed.");
    }
  }

  async function handleCreateOpp(event: React.FormEvent) {
    event.preventDefault();
    setNotice("");
    setError("");
    try {
      await request("POST", {
        type: "opportunity",
        title: oppTitle,
        amount: oppAmount ? Number(oppAmount) : undefined,
        stageId: oppStage || undefined,
        expectedCloseAt: oppClose || undefined,
        leadId: oppLead || undefined,
      });
      setNotice(`Opportunity "${oppTitle.trim()}" created.`);
      setOppTitle("");
      setOppAmount("");
      setOppClose("");
      setOppLead("");
      setShowOppForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The pipeline update failed.");
    }
  }

  async function handleCreateLead(event: React.FormEvent) {
    event.preventDefault();
    setNotice("");
    setError("");
    try {
      await request("POST", {
        type: "lead",
        title: leadTitle,
        source: leadSource || undefined,
        value: leadValue ? Number(leadValue) : undefined,
      });
      setNotice(`Lead "${leadTitle.trim()}" added.`);
      setLeadTitle("");
      setLeadSource("");
      setLeadValue("");
      setShowLeadForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The pipeline update failed.");
    }
  }

  async function handleLeadStatus(id: string, status: LeadStatus) {
    setNotice("");
    setError("");
    try {
      await request("PATCH", { type: "lead", id, status });
      setNotice(`Lead status set to ${status}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The pipeline update failed.");
    }
  }

  if (loading) {
    return <p style={{ color: "var(--muted)", fontSize: "var(--text-sm)" }}>Loading pipeline…</p>;
  }

  if (error && !data) {
    return (
      <div role="alert" className="card" style={{ padding: "1.25rem" }}>
        <p style={{ margin: 0, color: "var(--text)", fontSize: "var(--text-sm)" }}>{error}</p>
        <button type="button" className="btn secondary" style={{ marginTop: "0.75rem" }} onClick={() => { setLoading(true); void load(); }}>
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const openLeads = data.leads.filter((lead) => lead.status !== "CONVERTED" && lead.status !== "LOST");

  return (
    <section aria-label="Pipeline" style={{ display: "grid", gap: "1.25rem" }}>
      <header style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ padding: "0.3rem 0.6rem", border: "1px solid var(--line)", borderRadius: "var(--radius-small)", background: "var(--surface)", color: "var(--muted)", fontSize: "var(--text-xs)" }}>
            Open value <strong style={{ color: "var(--text)" }}>{money(data.counts.openValue)}</strong>
          </span>
          <span style={{ padding: "0.3rem 0.6rem", border: "1px solid var(--line)", borderRadius: "var(--radius-small)", background: "var(--surface)", color: "var(--muted)", fontSize: "var(--text-xs)" }}>
            Open <strong style={{ color: "var(--text)" }}>{data.counts.openOpportunities}</strong>
          </span>
          <span style={{ padding: "0.3rem 0.6rem", border: "1px solid var(--line)", borderRadius: "var(--radius-small)", background: "var(--surface)", color: "var(--muted)", fontSize: "var(--text-xs)" }}>
            Leads <strong style={{ color: "var(--text)" }}>{openLeads.length}</strong>
          </span>
        </div>
        <button type="button" className="btn primary" onClick={() => { setShowOppForm((open) => !open); setShowLeadForm(false); }}>
          {showOppForm ? "Close new opportunity" : "New opportunity"}
        </button>
      </header>

      <div aria-live="polite">
        {error && <p role="alert" style={{ margin: 0, color: "#f87171", fontSize: "var(--text-sm)" }}>{error}</p>}
        {!error && notice && <p role="status" style={{ margin: 0, color: "var(--primary)", fontSize: "var(--text-sm)" }}>{notice}</p>}
      </div>

      {showOppForm && (
        <form onSubmit={handleCreateOpp} className="card" style={{ padding: "1.1rem", display: "grid", gap: "0.8rem" }}>
          <h3 style={{ margin: 0, fontSize: "var(--text-md)" }}>New opportunity</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.8rem" }}>
            <label style={fieldLabel}>Title *
              <input required maxLength={200} value={oppTitle} onChange={(e) => setOppTitle(e.target.value)} placeholder="Retainer renewal" style={fieldStyle} />
            </label>
            <label style={fieldLabel}>Amount (USD)
              <input type="number" min={0} step="0.01" value={oppAmount} onChange={(e) => setOppAmount(e.target.value)} placeholder="4500" style={fieldStyle} />
            </label>
            <label style={fieldLabel}>Stage
              <select value={oppStage} onChange={(e) => setOppStage(e.target.value)} style={fieldStyle}>
                {data.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
              </select>
            </label>
            <label style={fieldLabel}>Expected close
              <input type="date" value={oppClose} onChange={(e) => setOppClose(e.target.value)} style={fieldStyle} />
            </label>
            <label style={fieldLabel}>Linked lead
              <select value={oppLead} onChange={(e) => setOppLead(e.target.value)} style={fieldStyle}>
                <option value="">None</option>
                {openLeads.map((lead) => <option key={lead.id} value={lead.id}>{lead.title}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" className="btn primary">Create opportunity</button>
            <button type="button" className="btn secondary" onClick={() => setShowOppForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ overflowX: "auto", paddingBottom: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.9rem", minWidth: "min-content" }}>
          {data.stages.map((stage) => {
            const stageValue = stage.opportunities
              .filter((opp) => opp.status === "OPEN")
              .reduce((sum, opp) => sum + (opp.amount ?? 0), 0);
            return (
              <div key={stage.id} className="card" style={{ minWidth: 250, width: 250, flexShrink: 0, padding: "0.9rem", display: "grid", gap: "0.7rem", alignContent: "start" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "baseline" }}>
                  <strong style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{stage.name}</strong>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>{stage.probability}% · {stage.opportunities.length}</span>
                </div>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>{money(stageValue)} open</span>

                {stage.opportunities.length === 0 && (
                  <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--muted)" }}>No opportunities in this stage.</p>
                )}

                {stage.opportunities.map((opp) => (
                  <article key={opp.id} style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-small)", background: "var(--surface)", padding: "0.7rem", display: "grid", gap: "0.45rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "start" }}>
                      <strong style={{ fontSize: "var(--text-sm)", color: "var(--text)", wordBreak: "break-word" }}>{opp.title}</strong>
                      <span style={{ padding: "0.1rem 0.45rem", borderRadius: "var(--radius-small)", background: statusBadge[opp.status]?.bg ?? "var(--surface)", color: statusBadge[opp.status]?.color ?? "var(--muted)", fontSize: "10px", fontWeight: "var(--weight-bold)", flexShrink: 0 }}>
                        {opp.status}
                      </span>
                    </div>
                    {opp.amount !== null && <span style={{ fontSize: "var(--text-sm)", color: "var(--primary)", fontWeight: "var(--weight-semibold)" }}>{money(opp.amount)}</span>}
                    {opp.lead && <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>Lead: {opp.lead.title}</span>}
                    {opp.expectedCloseAt && <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>Close: {new Date(opp.expectedCloseAt).toLocaleDateString()}</span>}
                    <label style={{ ...fieldLabel, marginTop: "0.2rem" }}>
                      Stage
                      <select aria-label={`Move ${opp.title}`} value={stage.id} onChange={(e) => void handleMove(opp.id, e.target.value)} style={{ ...fieldStyle, minHeight: 34, padding: "0.35rem 0.5rem" }}>
                        {data.stages.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {data.stages.every((stage) => stage.opportunities.length === 0) && (
        <div className="card" style={{ padding: "1rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--text-sm)" }}>
            No opportunities yet. Create the first one to start tracking deals through {data.pipeline.name}.
          </p>
          <button type="button" className="btn primary" onClick={() => setShowOppForm(true)}>New opportunity</button>
        </div>
      )}

      <section aria-label="Leads" className="card" style={{ padding: "1.1rem", display: "grid", gap: "0.9rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: "var(--text-md)" }}>Leads</h3>
          <button type="button" className="btn secondary" onClick={() => setShowLeadForm((open) => !open)}>
            {showLeadForm ? "Close new lead" : "New lead"}
          </button>
        </div>

        {showLeadForm && (
          <form onSubmit={handleCreateLead} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.8rem", alignItems: "end" }}>
            <label style={fieldLabel}>Title *
              <input required maxLength={200} value={leadTitle} onChange={(e) => setLeadTitle(e.target.value)} placeholder="Inbound audit request" style={fieldStyle} />
            </label>
            <label style={fieldLabel}>Source
              <input maxLength={120} value={leadSource} onChange={(e) => setLeadSource(e.target.value)} placeholder="Website form" style={fieldStyle} />
            </label>
            <label style={fieldLabel}>Estimated value (USD)
              <input type="number" min={0} step="0.01" value={leadValue} onChange={(e) => setLeadValue(e.target.value)} style={fieldStyle} />
            </label>
            <button type="submit" className="btn primary" style={{ minHeight: 40 }}>Add lead</button>
          </form>
        )}

        {data.leads.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--text-sm)" }}>
            No leads yet. Add one to track inbound work before it becomes an opportunity.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
            {data.leads.map((lead) => (
              <li key={lead.id} style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: "0.55rem" }}>
                <div style={{ display: "grid", gap: "0.15rem" }}>
                  <strong style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>{lead.title}</strong>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                    {[lead.source, lead.value !== null ? money(lead.value) : null].filter(Boolean).join(" · ") || "No source recorded"}
                  </span>
                </div>
                <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                  Status
                  <select aria-label={`Status for ${lead.title}`} value={lead.status} onChange={(e) => void handleLeadStatus(lead.id, e.target.value as LeadStatus)} style={{ ...fieldStyle, minHeight: 32, padding: "0.3rem 0.5rem" }}>
                    {LEAD_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

