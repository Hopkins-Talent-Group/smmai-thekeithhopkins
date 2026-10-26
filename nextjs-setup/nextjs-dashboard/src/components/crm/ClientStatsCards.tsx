"use client";

import React from "react";
import { ClientStats } from "@/lib/crm";

export default function ClientStatsCards({ stats }: { stats: ClientStats }) {
  const cards = [
    { label: "Total clients", value: stats.total, accent: "var(--text)" },
    { label: "Active", value: stats.active, accent: "var(--primary)" },
    { label: "Prospects", value: stats.prospects, accent: "var(--accent)" },
    { label: "Revenue", value: `$${stats.totalRevenue.toLocaleString()}`, accent: "var(--primary)" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
        marginBottom: 16,
      }}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: "12px 14px",
            background: "var(--panel)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: c.accent }}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}