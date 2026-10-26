"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Client,
  ClientStatus,
  CLIENT_STATUSES,
} from "@/lib/crm";

type Props = {
  initial?: Partial<Client>;
  onSaved: (client: Client) => void;
  onCancel: () => void;
};

const empty: Partial<Client> = {
  name: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  industry: "",
  status: "PROSPECT",
  approved: false,
  revenue: 0,
  accountManager: "",
  tags: [],
  notes: "",
};

export default function ClientForm({ initial, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<Partial<Client>>({ ...empty, ...initial });
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(initial?.id);

  const dialogRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const STEPS = ["Company", "Primary contact", "Status and value", "Notes", "Review and finish"] as const;
  // Steps 1 (Company) and 2 (Primary contact) are optional: skippable via Continue/Skip,
  // and empty values are valid at submit time.
  const [step, setStep] = useState(0);

  function moveFocusToStepTop() {
    stepHeadingRef.current?.focus();
  }

  function goNext() {
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
    moveFocusToStepTop();
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
    moveFocusToStepTop();
  }

  function handleNext() {
    setError(null);
    goNext();
  }

  function handleSkip() {
    setError(null);
    goNext();
  }

  // Lock background scroll while the modal is open; remember what had focus.
  // onCancel is stable (ClientsTable passes a memoised close handler).
  useEffect(() => {
    const previous = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onCancel]);


  function update<K extends keyof Client>(key: K, value: Client[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Keep keyboard focus inside the dialog while it is open.
  function keepFocusInside(event: React.KeyboardEvent) {
    if (event.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>("input, select, textarea, button:not([disabled])")
    ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const companyName = (form.company ?? "").trim();
    const fallbackName = companyName || "Primary Contact";
    const sanitizedCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, "") || "client";
    const fallbackEmail = `contact@${sanitizedCompany}.local`;

    const finalName = (form.name ?? "").trim() || fallbackName;
    const finalEmail = (form.email ?? "").trim() || fallbackEmail;

    const tags = tagsInput
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);

    const payload = {
      ...form,
      name: finalName,
      email: finalEmail,
      tags,
    };

    try {
      const url = isEdit
        ? `/api/crm/clients/${initial!.id}`
        : "/api/crm/clients";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved(data.client as Client);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 42,
    padding: "0.6rem 0.75rem",
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius-small)",
    color: "var(--text)",
    font: "inherit",
    fontSize: "var(--text-sm)",
  };

  const hintStyle: React.CSSProperties = {
    fontSize: "var(--text-xs)",
    color: "var(--muted)",
    fontWeight: "normal",
    marginLeft: 6,
  };

  const labelStyle: React.CSSProperties = {
    display: "grid",
    gap: "0.35rem",
    fontSize: "var(--text-xs)",
    color: "var(--muted)",
    fontWeight: "var(--weight-semibold)",
  };

  const twoCol: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
    gap: "0.9rem",
  };

  const sectionHeading: React.CSSProperties = {
    margin: 0,
    fontSize: "var(--text-sm)",
    color: "var(--text)",
    fontWeight: "var(--weight-bold)",
  };

  const sectionBody: React.CSSProperties = {
    display: "grid",
    gap: "0.9rem",
    borderTop: "1px solid var(--line)",
    paddingTop: "1.25rem",
  };

  const optionalTag = (
    <span style={{ fontWeight: "var(--weight-normal)", color: "var(--muted)", fontSize: "var(--text-xs)" }}>
      (optional — skippable)
    </span>
  );

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        padding: "1rem",
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,0.65)",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-form-title"
        onKeyDown={keepFocusInside}
        className="card"
        style={{
          width: "min(100%, 640px)",
          height: "min(90vh, 620px)",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem",
          background: "var(--panel)",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div style={{ flexShrink: 0, display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", marginBottom: "0.25rem" }}>
          <div>
            <span className="eyebrow">Client</span>
            <h3 id="client-form-title" style={{ margin: "0.2rem 0 0", fontSize: "var(--text-lg)" }}>
              {isEdit ? "Edit client" : "New client"}
            </h3>
            <p style={{ margin: "0.4rem 0 0", color: "var(--muted)", fontSize: "var(--text-sm)" }}>
              {isEdit
                ? "Update the record. Nothing saves until you choose Save changes."
                : "Add a company and its primary contact — both are optional."}
            </p>
            <ol aria-label="Form progress" style={{ listStyle: "none", padding: 0, margin: "0.85rem 0 0", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {STEPS.map((label, index) => {
                const done = index < step;
                const current = index === step;
                return (
                  <li key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <button
                      type="button"
                      disabled={index > step}
                      onClick={() => {
                        setError(null);
                        setStep(index);
                        moveFocusToStepTop();
                      }}
                      aria-current={current ? "step" : undefined}
                      aria-label={`Step ${index + 1} of ${STEPS.length}: ${label}${done ? " (completed)" : current ? " (current)" : ""}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.25rem 0.55rem 0.25rem 0.3rem",
                        border: "1px solid",
                        borderColor: current ? "rgba(5,150,105,0.45)" : "var(--line)",
                        borderRadius: 999,
                        background: current ? "var(--primary-light)" : done ? "var(--surface)" : "transparent",
                        color: current || done ? "var(--text)" : "var(--muted)",
                        fontSize: "var(--text-xs)",
                        fontWeight: "var(--weight-semibold)",
                        cursor: index > step ? "not-allowed" : "pointer",
                        opacity: index > step ? 0.6 : 1,
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 11,
                          lineHeight: 1,
                          background: done ? "var(--primary)" : current ? "var(--primary)" : "var(--surface)",
                          color: done || current ? "var(--bg)" : "var(--muted)",
                          border: "1px solid",
                          borderColor: done || current ? "var(--primary)" : "var(--line)",
                        }}
                      >
                        {done ? "✓" : index + 1}
                      </span>
                      {label}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          <button
            type="button"
            aria-label="Close client dialog"
            onClick={onCancel}
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-small)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: "1.1rem",
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <h4
          ref={stepHeadingRef}
          tabIndex={-1}
          style={{ ...sectionHeading, flexShrink: 0, margin: "0.75rem 0 0", outline: "none" }}
        >
          <span className="eyebrow">Step {step + 1} of {STEPS.length}</span>
          <span style={{ display: "block", marginTop: "0.15rem" }}>{STEPS[step]}</span>
        </h4>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: "1 1 auto",
            minHeight: 0,
            marginTop: "0.75rem",
          }}
        >
          <div
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              overflowX: "auto",
              paddingRight: "0.25rem",
              paddingBottom: "0.5rem",
            }}
          >

          {step === 0 && (
          <section aria-label="Company" style={{ display: "grid", gap: "0.9rem" }}>
            <h4 style={sectionHeading}>Company {optionalTag}</h4>
            <div style={twoCol}>
              <label style={labelStyle}>Company
                <input style={inputStyle} value={form.company ?? ""} onChange={(e) => update("company", e.target.value)} maxLength={160} />
              </label>
              <label style={labelStyle}>Industry
                <input style={inputStyle} value={form.industry ?? ""} onChange={(e) => update("industry", e.target.value)} placeholder="SaaS" maxLength={120} />
              </label>
            </div>
          </section>
          )}

          {step === 1 && (
          <section aria-label="Primary contact" style={sectionBody}>
            <h4 style={sectionHeading}>Primary contact {optionalTag}</h4>
            <div style={twoCol}>
              <label style={labelStyle}>Contact name
                <input style={inputStyle} value={form.name ?? ""} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Jane Doe" maxLength={160} />
              </label>
              <label style={labelStyle}>Email
                <input style={inputStyle} type="email" value={form.email ?? ""} onChange={(e) => update("email", e.target.value)} placeholder="jane@example.com" maxLength={254} />
              </label>
            </div>
            <div style={twoCol}>
              <label style={labelStyle}>Phone
                <input style={inputStyle} type="tel" autoComplete="tel" value={form.phone ?? ""} onChange={(e) => update("phone", e.target.value)} maxLength={40} />
              </label>
              <label style={labelStyle}>Tags
                <input style={inputStyle} value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="enterprise, retainer" maxLength={300} />
              </label>
            </div>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--muted)" }}>Separate tags with commas.</p>
          </section>
          )}

          {step === 2 && (
          <section aria-label="Status and value" style={sectionBody}>
            <h4 style={sectionHeading}>Status and value</h4>
            <div style={twoCol}>
              <label style={labelStyle}>Status
                <select style={inputStyle} value={form.status ?? "PROSPECT"} onChange={(e) => update("status", e.target.value as ClientStatus)}>
                  {CLIENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>Revenue (USD)
                <input style={inputStyle} type="number" min={0} step="0.01" value={form.revenue ?? 0} onChange={(e) => update("revenue", Number(e.target.value))} />
              </label>
            </div>
          </section>
          )}

          {step === 3 && (
          <section aria-label="Notes" style={sectionBody}>
            <h4 style={sectionHeading}>Notes</h4>
            <label style={labelStyle}>Internal notes
              <textarea style={{ ...inputStyle, minHeight: 84, resize: "vertical" }} value={form.notes ?? ""} onChange={(e) => update("notes", e.target.value)} placeholder="Context the next person should know." maxLength={2000} />
            </label>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "var(--text-sm)", color: "var(--text)" }}>
              <input type="checkbox" checked={Boolean(form.approved)} onChange={(e) => update("approved", e.target.checked)} style={{ width: 17, height: 17, accentColor: "var(--primary)" }} />
              Approved for posting
              <span style={hintStyle}>Unlocks this client in the publishing flow.</span>
            </label>
          </section>
          )}

          {step === 4 && (
          <section aria-label="Review" style={sectionBody}>
            <h4 style={sectionHeading}>Review</h4>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--muted)" }}>
              Check the details below. Choose Back to change anything, or confirm to {isEdit ? "save the changes" : "create the client"}.
            </p>
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "0.65rem 1.25rem" }}>
              {[
                ["Company", (form.company ?? "").trim() || "Not set"],
                ["Industry", (form.industry ?? "").trim() || "Not set"],
                ["Contact name", (form.name ?? "").trim() || "Not set"],
                ["Email", (form.email ?? "").trim() || "Not set"],
                ["Phone", (form.phone ?? "").trim() || "Not set"],
                ["Status", form.status ?? "PROSPECT"],
                ["Revenue", `$${Number(form.revenue ?? 0).toLocaleString()}`],
                ["Approved", form.approved ? "Yes" : "No"],
                ["Tags", tagsInput.trim() || "None"],
                ["Notes", (form.notes ?? "").trim() || "None"],
              ].map(([term, value]) => (
                <div key={term} style={{ display: "grid", gap: "0.2rem", borderTop: "1px solid var(--line)", paddingTop: "0.55rem" }}>
                  <dt style={{ fontSize: "var(--text-xs)", color: "var(--muted)", fontWeight: "var(--weight-semibold)" }}>{term}</dt>
                  <dd style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text)", wordBreak: "break-word" }}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          )}

          </div>

          {error && (
            <div role="alert" style={{ color: "#f87171", fontSize: "var(--text-sm)", marginTop: "0.5rem", flexShrink: 0 }}>
              {error}
            </div>
          )}

          <div style={{ flexShrink: 0, display: "flex", flexWrap: "wrap", gap: "0.6rem", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: "0.9rem", marginTop: "0.5rem" }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted)" }}>Step {step + 1} of {STEPS.length}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", justifyContent: "flex-end" }}>
              {step === 0 ? (
                <button type="button" className="btn secondary" onClick={onCancel} style={{ padding: "0.6rem 1rem" }}>
                  Cancel
                </button>
              ) : (
                <button type="button" className="btn secondary" onClick={goBack} style={{ padding: "0.6rem 1rem" }}>
                  Back
                </button>
              )}
              {(step === 0 || step === 1) && (
                <button type="button" className="btn secondary" onClick={handleSkip} style={{ padding: "0.6rem 1rem" }}>
                  Skip
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" className="btn primary" onClick={handleNext} style={{ padding: "0.6rem 1.1rem" }}>
                  Continue
                </button>
              ) : (
                <button type="submit" className="btn primary" disabled={saving} style={{ padding: "0.6rem 1.1rem", opacity: saving ? 0.65 : 1 }}>
                  {saving ? "Saving…" : isEdit ? "Save changes" : "Create client"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}