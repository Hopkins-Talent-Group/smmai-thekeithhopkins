import React from "react";
import { DraftStatus } from "@/lib/crm";

interface StatusPillProps { status: DraftStatus; }

const config: Record<DraftStatus, { label: string; bg: string; color: string; border: string }> = {
  draft: { label: "Draft", bg: "var(--surface)", color: "var(--muted)", border: "var(--line)" },
  pending: { label: "Pending review", bg: "rgba(245,158,11,0.12)", color: "var(--accent)", border: "rgba(245,158,11,0.3)" },
  approved: { label: "Approved", bg: "var(--primary-light)", color: "var(--primary)", border: "rgba(5,150,105,0.35)" },
  rejected: { label: "Rejected", bg: "rgba(239,68,68,0.1)", color: "#f87171", border: "rgba(239,68,68,0.3)" },
  scheduled: { label: "Queued", bg: "rgba(245,158,11,0.1)", color: "var(--accent)", border: "rgba(245,158,11,0.3)" },
  published: { label: "Published", bg: "rgba(5,150,105,0.1)", color: "var(--primary)", border: "rgba(5,150,105,0.3)" },
};

export default function StatusPill({ status }: StatusPillProps) {
  const current = config[status] || config.draft;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", minHeight: 24, padding: "0.2rem 0.55rem", borderRadius: "var(--radius-small)", background: current.bg, color: current.color, border: "1px solid " + current.border, fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)", whiteSpace: "nowrap" }}>
      <span aria-hidden style={{ width: 5, height: 5, borderRadius: "50%", background: current.color }} />
      {current.label}
    </span>
  );
}
