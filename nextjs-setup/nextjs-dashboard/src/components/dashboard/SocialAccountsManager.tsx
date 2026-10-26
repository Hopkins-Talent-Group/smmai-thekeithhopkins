"use client";

import React, { useCallback, useEffect, useState } from "react";

interface Connection {
  id: string;
  platform: string;
  status: string;
  scopes: string[];
  externalAccountId: string | null;
  accountHandle: string | null;
  capabilities: Record<string, unknown>;
  tokenExpiresAt: string | null;
  tokenExpired: boolean;
  lastSyncedAt: string | null;
  lastErrorAt: string | null;
  updatedAt: string | null;
}


const STATUS_STYLES: Record<string, { border: string; background: string; color: string }> = {
  CONNECTED: { border: "rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.12)", color: "var(--primary)" },
  DEGRADED: { border: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.12)", color: "var(--accent)" },
  REAUTH_REQUIRED: { border: "rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.12)", color: "#f87171" },
  DISCONNECTED: { border: "var(--line)", background: "var(--surface)", color: "var(--muted)" },
  CONNECTING: { border: "var(--line)", background: "var(--surface)", color: "var(--muted)" },
};

function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.DISCONNECTED;
}

const PROVIDERS = [
  { platform: "linkedin", label: "LinkedIn", hint: "Organization or personal account · posts and articles" },
  { platform: "x", label: "X", hint: "Bearer-token OAuth 2.0 · posts with optional media" },
  { platform: "meta", label: "Meta", hint: "Facebook Pages + Instagram · existing adapter" },
];

export default function SocialAccountsManager() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/accounts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load connected accounts.");
      setConnections(Array.isArray(data.connections) ? data.connections : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load connected accounts.");
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  // Surface OAuth redirect results (?oauth=connected|error&platform=) once.
  useEffect(() => {
    Promise.resolve().then(() => {
      const params = new URLSearchParams(window.location.search);
      const result = params.get("oauth");
      if (!result) return;
      const platform = params.get("platform") ?? params.get("error") ?? "";
      setNotice(result === "connected" ? `${platform || "Provider"} connected successfully.` : `OAuth failed: ${platform || "unknown error"}.`);
      params.delete("oauth");
      params.delete("platform");
      params.delete("error");
      const clean = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState(null, "", clean);
      return load();
    });
  }, [load]);

  async function startConnect(platform: string) {
    setBusy(`connect:${platform}`);
    setNotice("");
    setError("");
    try {
      const res = await fetch(`/api/integrations/${platform}/connect`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Unable to start ${platform} OAuth.`);
      window.location.assign(data.authorizeUrl as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start OAuth.");
      setBusy(null);
    }
  }

  async function disconnect(platform: string, connectionId?: string) {
    if (!window.confirm(`Disconnect ${platform}? Queued jobs for this account will be cancelled.`)) return;
    setBusy(`disconnect:${connectionId ?? platform}`);
    setNotice("");
    try {
      const res = await fetch(`/api/integrations/${platform}/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connectionId ? { connectionId } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Disconnect failed.");
      setNotice(`Disconnected. Invalidated ${(data.invalidatedJobs ?? []).length} queued job(s).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed.");
    } finally {
      setBusy(null);
    }
  }

  async function refresh(connectionId: string) {
    setBusy(`refresh:${connectionId}`);
    try {
      const res = await fetch(`/api/accounts/${connectionId}/refresh`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refresh failed.");
      setNotice(data.reauthRequired ? `${data.provider} token expired — re-authentication required.` : `${data.provider} account health refreshed.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed.");
    } finally {
      setBusy(null);
    }
  }

  const byPlatform = new Map(connections.map((c) => [c.platform, c] as const));

  return (
    <section aria-labelledby="accounts-heading" style={{ display: "grid", gap: "1rem" }}>
      <div className="card" style={{ padding: "1rem 1.25rem" }}>
        <h2 id="accounts-heading" style={{ margin: 0, fontSize: "var(--text-md)" }}>Connected social accounts</h2>
        <p style={{ margin: "0.4rem 0 0", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
          OAuth tokens are exchanged server-side and stored encrypted — they are never returned to the browser. Actions for a platform are disabled until its capability discovery succeeds.
        </p>
        {notice && <div role="status" style={{ marginTop: "0.7rem", padding: "0.55rem 0.7rem", borderRadius: "var(--radius-small)", background: "var(--surface)", border: "1px solid var(--line)", fontSize: "var(--text-xs)" }}>{notice}</div>}
        {error && <div role="alert" style={{ marginTop: "0.7rem", padding: "0.55rem 0.7rem", borderRadius: "var(--radius-small)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", fontSize: "var(--text-xs)" }}>{error}</div>}
      </div>

      {loading ? (
        <div className="card" style={{ padding: "1.25rem", color: "var(--muted)", fontSize: "var(--text-sm)" }}>Loading connected accounts…</div>
      ) : (
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))" }}>
          {PROVIDERS.map(({ platform, label, hint }) => {
            const connection = byPlatform.get(platform);
            const style = statusStyle(connection?.status ?? "DISCONNECTED");
            const capabilities = Object.entries(connection?.capabilities ?? {});
            return (
              <article key={platform} className="card" style={{ padding: "1.1rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "var(--text-md)" }}>{label}</h3>
                    <p style={{ margin: "0.2rem 0 0", color: "var(--muted)", fontSize: "var(--text-xs)" }}>{hint}</p>
                  </div>
                  <span style={{ padding: "0.2rem 0.55rem", borderRadius: "var(--radius-small)", border: `1px solid ${style.border}`, background: style.background, color: style.color, fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)" }}>
                    {connection?.status ?? "NOT CONNECTED"}
                  </span>
                </div>
                {connection ? (
                  <dl style={{ margin: 0, display: "grid", gap: "0.3rem", fontSize: "var(--text-xs)", color: "var(--muted)" }}>
                    <div style={{ display: "flex", gap: "0.4rem" }}><dt>Account</dt><dd style={{ margin: 0, color: "var(--text)" }}>{connection.accountHandle ?? connection.externalAccountId ?? "—"}</dd></div>
                    <div style={{ display: "flex", gap: "0.4rem" }}><dt>Scopes</dt><dd style={{ margin: 0, color: "var(--text)" }}>{connection.scopes.join(" ") || "—"}</dd></div>
                    <div style={{ display: "flex", gap: "0.4rem" }}><dt>Token</dt><dd style={{ margin: 0, color: connection.tokenExpired ? "#f87171" : "var(--text)" }}>{connection.tokenExpiresAt ? (connection.tokenExpired ? "Expired — re-authentication required" : `Expires ${new Date(connection.tokenExpiresAt).toLocaleString()}`) : "No expiry recorded"}</dd></div>
                    {connection.lastErrorAt && <div style={{ display: "flex", gap: "0.4rem" }}><dt>Last error</dt><dd style={{ margin: 0 }}>{new Date(connection.lastErrorAt).toLocaleString()}</dd></div>}
                  </dl>
                ) : (
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--text-xs)" }}>No {label} account connected in this workspace yet.</p>
                )}
                {capabilities.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {capabilities.map(([name, enabled]) => (
                      <span key={name} style={{ padding: "0.15rem 0.45rem", borderRadius: "var(--radius-small)", border: "1px solid var(--line)", background: enabled ? "rgba(34,197,94,0.1)" : "var(--surface)", color: enabled ? "var(--text)" : "var(--muted)", fontSize: "var(--text-xs)" }}>
                        {name}: {enabled ? "on" : "off"}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "auto" }}>
                  {!connection || connection.status === "DISCONNECTED" ? (
                    <button type="button" className="btn primary" disabled={busy !== null} style={{ padding: "0.5rem 0.7rem", fontSize: "var(--text-xs)" }} onClick={() => void startConnect(platform)}>
                      {busy === `connect:${platform}` ? "Redirecting…" : `Connect ${label}`}
                    </button>
                  ) : (
                    <>
                      <button type="button" className="btn secondary" disabled={busy !== null} style={{ padding: "0.5rem 0.7rem", fontSize: "var(--text-xs)" }} onClick={() => void refresh(connection.id)}>
                        {busy === `refresh:${connection.id}` ? "Refreshing…" : "Refresh health"}
                      </button>
                      <button type="button" className="btn secondary" disabled={busy !== null} style={{ padding: "0.5rem 0.7rem", fontSize: "var(--text-xs)" }} onClick={() => void disconnect(platform, connection.id)}>
                        Disconnect
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

