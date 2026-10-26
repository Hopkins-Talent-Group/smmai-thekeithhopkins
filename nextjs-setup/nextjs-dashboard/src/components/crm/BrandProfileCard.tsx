"use client";

import React, { useEffect, useState } from "react";
import { BrandProfile, initialBrandProfile } from "@/lib/crm";

export default function BrandProfileCard() {
  const [profile, setProfile] = useState<BrandProfile>(initialBrandProfile);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/crm/brand", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load brand profile.");
        if (data.brand || data.profile) setProfile(data.brand || data.profile);
      })
      .catch((error) => setNotice(error instanceof Error ? error.message : "Unable to load brand profile."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setNotice("");
    try {
      const res = await fetch("/api/crm/brand", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save brand profile.");
      if (data.brand) setProfile(data.brand);
      setEditing(false);
      setNotice("Brand guardrails saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save brand profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card" style={{ padding: "1.5rem", color: "var(--muted)" }}>Loading brand guardrails…</div>;

  return (
    <section className="card" aria-labelledby="brand-heading" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1.25rem" }}>
        <div><span className="eyebrow">Brand & safety</span><h2 id="brand-heading" style={{ margin: 0, fontSize: "var(--text-lg)" }}>{profile.name || "Workspace brand profile"}</h2></div>
        <button type="button" className="btn secondary" disabled={saving} style={{ padding: "0.5rem 0.75rem", fontSize: "var(--text-xs)" }} onClick={() => editing ? void handleSave() : setEditing(true)}>{saving ? "Saving…" : editing ? "Save guardrails" : "Edit guardrails"}</button>
      </div>

      {notice && <div role="status" style={{ marginBottom: "1rem", padding: "0.6rem 0.75rem", border: "1px solid var(--line)", borderRadius: "var(--radius-small)", background: "var(--surface)", color: "var(--text)", fontSize: "var(--text-xs)" }}>{notice}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "1rem" }}>
        <Field label="Brand name" value={profile.name} editing={editing} onChange={(name) => setProfile({ ...profile, name })} />
        <Field label="Target audience" value={profile.audience} editing={editing} onChange={(audience) => setProfile({ ...profile, audience })} />
        <Field label="Brand voice" value={profile.voice} editing={editing} onChange={(voice) => setProfile({ ...profile, voice })} />
        <TagList label="Prohibited topics" values={profile.prohibitedTopics} tone="danger" />
        <TagList label="Required disclosures" values={profile.requiredDisclosures} tone="primary" />
      </div>
    </section>
  );
}

function Field({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange: (value: string) => void }) {
  return (
    <div style={{ padding: "0.85rem", border: "1px solid var(--line)", borderRadius: "var(--radius-medium)", background: "var(--surface)" }}>
      <label style={{ display: "block", color: "var(--muted)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", marginBottom: "0.35rem" }}>{label}</label>
      {editing ? <input value={value} onChange={(event) => onChange(event.target.value)} style={{ width: "100%", minHeight: 38, padding: "0.5rem", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius-small)", color: "var(--text)", font: "inherit", fontSize: "var(--text-sm)" }} /> : <p style={{ margin: 0, color: value ? "var(--text)" : "var(--muted)", fontSize: "var(--text-sm)" }}>{value || "Not configured"}</p>}
    </div>
  );
}

function TagList({ label, values, tone }: { label: string; values: string[]; tone: "danger" | "primary" }) {
  return (
    <div style={{ padding: "0.85rem", border: "1px solid var(--line)", borderRadius: "var(--radius-medium)", background: "var(--surface)" }}>
      <span style={{ display: "block", color: "var(--muted)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", marginBottom: "0.45rem" }}>{label}</span>
      {values.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>{values.map((value) => <span key={value} style={{ padding: "0.2rem 0.45rem", borderRadius: "var(--radius-small)", background: tone === "primary" ? "var(--primary-light)" : "rgba(239,68,68,0.1)", color: tone === "primary" ? "var(--primary)" : "#f87171", fontSize: "var(--text-xs)" }}>{value}</span>)}</div> : <span style={{ color: "var(--muted)", fontSize: "var(--text-xs)" }}>None configured</span>}
    </div>
  );
}
