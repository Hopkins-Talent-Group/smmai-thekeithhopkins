"use client";

import React, { useCallback, useEffect, useState } from "react";
import AutomationStatusCard from "@/components/crm/AutomationStatusCard";

interface SettingsState {
  dryRun: boolean;
  aiProvider: string;
  moderateEnabled: boolean;
  autoPublish: boolean;
}

/**
 * Phase 2 workspace settings hub.
 * Server-authoritative reads/writes against /api/settings + /api/crm/status;
 * the DRY_RUN toggle requires explicit confirmation because it gates live
 * provider publishing.
 */
export default function SettingsHub() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDryRun, setConfirmDryRun] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [automationRes, statusRes] = await Promise.all([
        fetch("/api/settings?category=automation", { cache: "no-store" }),
        fetch("/api/crm/status", { cache: "no-store" }),
      ]);
      const automation = await automationRes.json();
      const status = await statusRes.json().catch(() => ({}));
      if (!automationRes.ok) throw new Error(automation.error || "Unable to load settings.");
      const persisted = typeof status.dryRun === "boolean" ? status.dryRun : automation.dryRun !== false;
      setSettings({
        dryRun: persisted,
        aiProvider: automation.aiProvider ?? "stub",
        moderateEnabled: automation.moderateEnabled !== false,
        autoPublish: automation.autoPublish === true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);



  async function save(patch: Partial<SettingsState>) {
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "automation", data: patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
      setNotice("Settings saved.");
      setConfirmDryRun(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <AutomationStatusCard />
      <section className="card" aria-labelledby="settings-hub" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
        <div>
          <h2 id="settings-hub" style={{ margin: 0, fontSize: "var(--text-lg)" }}>Workspace configuration</h2>
          <p style={{ margin: "0.5rem 0 0", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
            Server-authoritative controls. The DRY-RUN toggle gates live provider publishing across LinkedIn, X, and Meta.
          </p>
        </div>
        {notice && <div role="status" style={{ padding: "0.55rem 0.7rem", borderRadius: "var(--radius-small)", background: "var(--surface)", border: "1px solid var(--line)", fontSize: "var(--text-xs)" }}>{notice}</div>}
        {error && <div role="alert" style={{ padding: "0.55rem 0.7rem", borderRadius: "var(--radius-small)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", fontSize: "var(--text-xs)" }}>{error}</div>}
        {loading || !settings ? (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--text-sm)" }}>Loading settings…</p>
        ) : (
          <>
            <label style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", fontSize: "var(--text-sm)" }}>
              <input type="checkbox" checked={settings.dryRun} onChange={(e) => (e.target.checked ? void save({ dryRun: true }) : setConfirmDryRun(true))} />
              <span><strong>DRY-RUN mode</strong><br /><span style={{ color: "var(--muted)", fontSize: "var(--text-xs)" }}>When on, publishing is simulated — no provider receives live requests. Turning it off arms live posting.</span></span>
            </label>
            {confirmDryRun && (
              <div role="alertdialog" aria-label="Confirm disabling dry-run" style={{ border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)", borderRadius: "var(--radius-small)", padding: "0.9rem" }}>
                <p style={{ margin: "0 0 0.6rem", fontSize: "var(--text-sm)" }}><strong>Disable DRY-RUN?</strong> Approved drafts will publish to live provider accounts.</p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button type="button" className="btn secondary" disabled={saving} style={{ padding: "0.5rem 0.8rem", fontSize: "var(--text-xs)" }} onClick={() => setConfirmDryRun(false)}>Keep dry-run on</button>
                  <button type="button" className="btn primary" disabled={saving} style={{ padding: "0.5rem 0.8rem", fontSize: "var(--text-xs)" }} onClick={() => void save({ dryRun: false })}>Disable — go live</button>
                </div>
              </div>
            )}
            <label style={{ display: "grid", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
              AI provider
              <select value={settings.aiProvider} onChange={(e) => void save({ aiProvider: e.target.value })} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-small)", color: "var(--text)", padding: "0.5rem 0.6rem", maxWidth: 320 }}>
                <option value="stub">Stub (safe default)</option>
                <option value="openrouter">OpenRouter</option>
                <option value="nvidia">NVIDIA</option>
              </select>
            </label>
          </>
        )}
      </section>
    </div>
  );
}
