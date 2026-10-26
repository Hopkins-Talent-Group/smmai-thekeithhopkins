# v2 Fix — Client Records Management (CRM Clients Module)

This adds a full **client records module** to the existing CRM: list, search, filter, create, edit, delete, and view client details — wired into the existing dashboard section `"clients"` that already exists in `DashboardViewSection`.

Architecture stays consistent with v1:

- In-memory store behind API routes (same pattern as `drafts`, `brand`, `publish`)
- Types centralized in `src/lib/crm.ts`
- Client components under `src/components/crm/`
- No new dependencies

---

## 1. Extend `src/lib/crm.ts`

Add the client types and expand `Client` to cover records management. Replace the existing `Client` interface and `initialClients` with this block. Keep everything else (BrandProfile, ContentDraft, etc.) as-is.

```ts
// src/lib/crm.ts  →  ADD / REPLACE the Client section

export type ClientStatus = "prospect" | "active" | "paused" | "churned";

export interface Client {
  id: string;
  name: string;              // primary contact name
  company: string;           // client / org name
  email: string;
  phone?: string;
  website?: string;
  industry?: string;
  status: ClientStatus;
  approved: boolean;
  posts: {
    count: number;
    lastPost: string | null; // ISO string or null
  };
  revenue: number;           // lifetime revenue in USD
  accountManager?: string;
  tags: string[];
  notes?: string;
  lastActivity: string;      // ISO string
  createdAt: string;         // ISO string
  updatedAt: string;         // ISO string
}

export interface ClientStats {
  total: number;
  active: number;
  prospects: number;
  churned: number;
  totalRevenue: number;
  totalPosts: number;
}

export const CLIENT_STATUSES: ClientStatus[] = [
  "prospect",
  "active",
  "paused",
  "churned",
];

export const initialClients: Client[] = [
  {
    id: "cl-001",
    name: "Ada Reyes",
    company: "Acme Corp",
    email: "ada@acme.com",
    phone: "+1-555-0101",
    website: "https://acme.com",
    industry: "SaaS",
    status: "active",
    approved: true,
    posts: { count: 42, lastPost: "2024-01-15T10:00:00.000Z" },
    revenue: 12500,
    accountManager: "Mia Chen",
    tags: ["enterprise", "retainer"],
    notes: "Quarterly review scheduled for March.",
    lastActivity: "2024-01-15T10:00:00.000Z",
    createdAt: "2023-06-01T09:00:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z",
  },
  {
    id: "cl-002",
    name: "Ben Okafor",
    company: "Northwind Labs",
    email: "ben@northwind.io",
    phone: "+1-555-0114",
    website: "https://northwind.io",
    industry: "Healthtech",
    status: "prospect",
    approved: false,
    posts: { count: 0, lastPost: null },
    revenue: 0,
    accountManager: "Diego Santos",
    tags: ["inbound", "trial"],
    notes: "Requested pricing sheet.",
    lastActivity: "2024-02-02T14:30:00.000Z",
    createdAt: "2024-02-02T14:30:00.000Z",
    updatedAt: "2024-02-02T14:30:00.000Z",
  },
  {
    id: "cl-003",
    name: "Cara Lin",
    company: "Lumen & Co",
    email: "cara@lumen.co",
    phone: "+1-555-0188",
    website: "https://lumen.co",
    industry: "Retail",
    status: "paused",
    approved: true,
    posts: { count: 17, lastPost: "2023-11-09T08:15:00.000Z" },
    revenue: 4800,
    accountManager: "Mia Chen",
    tags: ["smb"],
    notes: "Paused billing pending budget review.",
    lastActivity: "2023-11-09T08:15:00.000Z",
    createdAt: "2023-03-12T11:20:00.000Z",
    updatedAt: "2023-11-09T08:15:00.000Z",
  },
];
```

---

## 2. API routes

### `src/app/api/crm/clients/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  Client,
  ClientStatus,
  CLIENT_STATUSES,
  initialClients,
} from "@/lib/crm";

// In-memory store (same pattern as drafts)
let clients: Client[] = [...initialClients];

function nowISO() {
  return new Date().toISOString();
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search")?.toLowerCase().trim();
  const includeStats = url.searchParams.get("stats") === "1";

  let result = [...clients];

  if (status && CLIENT_STATUSES.includes(status as ClientStatus)) {
    result = result.filter((c) => c.status === status);
  }

  if (search) {
    result = result.filter((c) =>
      [c.name, c.company, c.email, c.industry ?? "", ...c.tags]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }

  // newest activity first
  result.sort((a, b) => (a.lastActivity < b.lastActivity ? 1 : -1));

  const body: Record<string, unknown> = { clients: result };
  if (includeStats) {
    body.stats = {
      total: clients.length,
      active: clients.filter((c) => c.status === "active").length,
      prospects: clients.filter((c) => c.status === "prospect").length,
      churned: clients.filter((c) => c.status === "churned").length,
      totalRevenue: clients.reduce((sum, c) => sum + c.revenue, 0),
      totalPosts: clients.reduce((sum, c) => sum + c.posts.count, 0),
    };
  }

  return NextResponse.json(body);
}

export async function POST(req: NextRequest) {
  let payload: Partial<Client>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.name || !payload.email || !payload.company) {
    return NextResponse.json(
      { error: "name, email, and company are required" },
      { status: 400 }
    );
  }

  const status: ClientStatus = CLIENT_STATUSES.includes(
    payload.status as ClientStatus
  )
    ? (payload.status as ClientStatus)
    : "prospect";

  const ts = nowISO();
  const client: Client = {
    id: `cl-${Date.now().toString(36)}`,
    name: payload.name.trim(),
    company: payload.company.trim(),
    email: payload.email.trim(),
    phone: payload.phone?.trim() || undefined,
    website: payload.website?.trim() || undefined,
    industry: payload.industry?.trim() || undefined,
    status,
    approved: payload.approved ?? false,
    posts: payload.posts ?? { count: 0, lastPost: null },
    revenue: typeof payload.revenue === "number" ? payload.revenue : 0,
    accountManager: payload.accountManager?.trim() || undefined,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    notes: payload.notes?.trim() || undefined,
    lastActivity: ts,
    createdAt: ts,
    updatedAt: ts,
  };

  clients = [client, ...clients];
  return NextResponse.json({ client }, { status: 201 });
}

// Used by tests / dev reset
export async function DELETE() {
  clients = [...initialClients];
  return NextResponse.json({ ok: true });
}
```

### `src/app/api/crm/clients/[id]/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { Client, ClientStatus, CLIENT_STATUSES, initialClients } from "@/lib/crm";

let clients: Client[] = [...initialClients];

function findIndex(id: string) {
  return clients.findIndex((c) => c.id === id);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = clients.find((c) => c.id === id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  return NextResponse.json({ client });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idx = findIndex(id);
  if (idx === -1) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  let patch: Partial<Client>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (patch.status && !CLIENT_STATUSES.includes(patch.status as ClientStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${CLIENT_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const current = clients[idx];
  const next: Client = {
    ...current,
    ...patch,
    id: current.id,             // never allow id change
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  };

  clients[idx] = next;
  return NextResponse.json({ client: next });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idx = findIndex(id);
  if (idx === -1) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  const [removed] = clients.splice(idx, 1);
  return NextResponse.json({ client: removed });
}
```

> ⚠️ **Note:** the two route files each hold their own in-memory array, so writes to `[id]` won't reflect in the list route in a multi-instance serverless deploy. For v2 prototype this is acceptable. A v3 step would move `clients` into a shared module (e.g. `src/lib/store.ts`) or a real DB. If you want shared-in-process storage now, extract the array into `src/lib/store.ts` and import it in both files.

---

## 3. Shared in-memory store (recommended for v2)

To avoid the split-store problem, extract the array once and import it everywhere:

```ts
// src/lib/store.ts
import { Client, initialClients } from "@/lib/crm";

export const clientStore: { clients: Client[] } = {
  clients: [...initialClients],
};
```

Then in both route files use `clientStore.clients` instead of a local `let clients`.

---

## 4. UI components

### `src/components/crm/ClientStatsCards.tsx`

```tsx
"use client";

import React from "react";
import { ClientStats } from "@/lib/crm";

export default function ClientStatsCards({ stats }: { stats: ClientStats }) {
  const cards = [
    { label: "Total clients", value: stats.total, accent: "#6366f1" },
    { label: "Active", value: stats.active, accent: "#10b981" },
    { label: "Prospects", value: stats.prospects, accent: "#f59e0b" },
    { label: "Revenue", value: `$${stats.totalRevenue.toLocaleString()}`, accent: "#0ea5e9" },
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
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "12px 14px",
            background: "#fff",
          }}
        >
          <div style={{ fontSize: 12, color: "#6b7280" }}>{c.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: c.accent }}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### `src/components/crm/ClientForm.tsx`

```tsx
"use client";

import React, { useState } from "react";
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
  status: "prospect",
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

  function update<K extends keyof Client>(key: K, value: Client[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = { ...form, tags };

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
    padding: "8px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 14,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    color: "#374151",
    marginBottom: 4,
    marginTop: 10,
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 16,
        background: "#fff",
      }}
    >
      <h3 style={{ margin: 0, marginBottom: 8 }}>
        {isEdit ? "Edit client" : "New client"}
      </h3>

      <label style={labelStyle}>Contact name *</label>
      <input
        style={inputStyle}
        value={form.name ?? ""}
        onChange={(e) => update("name", e.target.value)}
        required
      />

      <label style={labelStyle}>Company *</label>
      <input
        style={inputStyle}
        value={form.company ?? ""}
        onChange={(e) => update("company", e.target.value)}
        required
      />

      <label style={labelStyle}>Email *</label>
      <input
        type="email"
        style={inputStyle}
        value={form.email ?? ""}
        onChange={(e) => update("email", e.target.value)}
        required
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Phone</label>
          <input
            style={inputStyle}
            value={form.phone ?? ""}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Website</label>
          <input
            style={inputStyle}
            value={form.website ?? ""}
            onChange={(e) => update("website", e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Industry</label>
          <input
            style={inputStyle}
            value={form.industry ?? ""}
            onChange={(e) => update("industry", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Account manager</label>
          <input
            style={inputStyle}
            value={form.accountManager ?? ""}
            onChange={(e) => update("accountManager", e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Status</label>
          <select
            style={inputStyle}
            value={form.status ?? "prospect"}
            onChange={(e) => update("status", e.target.value as ClientStatus)}
          >
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Revenue (USD)</label>
          <input
            type="number"
            style={inputStyle}
            value={form.revenue ?? 0}
            onChange={(e) => update("revenue", Number(e.target.value))}
          />
        </div>
      </div>

      <label style={labelStyle}>Tags (comma separated)</label>
      <input
        style={inputStyle}
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
      />

      <label style={labelStyle}>Notes</label>
      <textarea
        style={{ ...inputStyle, minHeight: 70 }}
        value={form.notes ?? ""}
        onChange={(e) => update("notes", e.target.value)}
      />

      <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={Boolean(form.approved)}
          onChange={(e) => update("approved", e.target.checked)}
        />
        Approved for posting
      </label>

      {error && (
        <div style={{ color: "#b91c1c", fontSize: 13, marginTop: 10 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            background: "#111827",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 14px",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create client"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: "#fff",
            color: "#111827",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

### `src/components/crm/ClientsTable.tsx`

```tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Client, ClientStats, ClientStatus, CLIENT_STATUSES } from "@/lib/crm";
import ClientForm from "./ClientForm";
import ClientStatsCards from "./ClientStatsCards";

const statusColor: Record<ClientStatus, { bg: string; color: string }> = {
  prospect: { bg: "#fef3c7", color: "#92400e" },
  active:   { bg: "#d1fae5", color: "#065f46" },
  paused:   { bg: "#e0e7ff", color: "#3730a3" },
  churned:  { bg: "#fee2e2", color: "#991b1b" },
};

export default function ClientsTable() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all");
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/clients?stats=1");
      const data = await res.json();
      setClients(data.clients ?? []);
      setStats(data.stats ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <div>
      {stats && <ClientStatsCards stats={stats} />}

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Search name, company, email, tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 220,
            padding: "8px 10px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 14,
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ClientStatus | "all")
          }
          style={{
            padding: "8px 10px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
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
        <button
          onClick={() => setCreating(true)}
          style={{
            background: "#111827",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          + New client
        </button>
      </div>

      {(creating || editing) && (
        <div style={{ marginBottom: 16 }}>
          <ClientForm
            initial={editing ?? undefined}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSaved={() => {
              setCreating(false);
              setEditing(null);
              load();
            }}
          />
        </div>
      )}

      {loading ? (
        <div style={{ color: "#6b7280" }}>Loading clients…</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            border: "1px dashed #d1d5db",
            borderRadius: 10,
            padding: 24,
            textAlign: "center",
            color: "#6b7280",
          }}
        >
          No clients match the current filters.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", background: "#f9fafb" }}>
                <th style={th}>Company</th>
                <th style={th}>Contact</th>
                <th style={th}>Status</th>
                <th style={th}>Posts</th>
                <th style={th}>Revenue</th>
                <th style={th}>Manager</th>
                <th style={th}>Last activity</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid #eef2f7" }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{c.company}</div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>
                      {c.industry ?? "—"}
                    </div>
                  </td>
                  <td style={td}>
                    <div>{c.name}</div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>
                      {c.email}
                    </div>
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        background: statusColor[c.status].bg,
                        color: statusColor[c.status].color,
                        borderRadius: 999,
                        padding: "2px 10px",
                        fontSize: 12,
                        textTransform: "capitalize",
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td style={td}>{c.posts.count}</td>
                  <td style={td}>${c.revenue.toLocaleString()}</td>
                  <td style={td}>{c.accountManager ?? "—"}</td>
                  <td style={td}>
                    {new Date(c.lastActivity).toLocaleDateString()}
                  </td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => setEditing(c)}
                      style={linkBtn}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      style={{ ...linkBtn, color: "#b91c1c" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  borderBottom: "1px solid #e5e7eb",
};
const td: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "top",
};
const linkBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#2563eb",
  cursor: "pointer",
  fontSize: 13,
  padding: "2px 6px",
};
```

---

## 5. Wire into the dashboard

### `src/app/dashboard/page.tsx`

Add a `clients` branch inside your section switch. If you already render sections conditionally, extend the tree:

```tsx
import ClientsTable from "@/components/crm/ClientsTable";

// ...

{currentSection === "clients" && (
  <section style={{ padding: 24 }}>
    <h1 style={{ marginTop: 0 }}>Clients</h1>
    <p style={{ color: "#6b7280", marginTop: 4 }}>
      Manage customer records, statuses, and account assignments.
    </p>
    <ClientsTable />
  </section>
)}
```

### `src/components/layout/DashboardShell.tsx`

Ensure `clients` is in the sidebar nav. If `navItems` is typed as `{ id: DashboardViewSection; … }[]` (from the v1 fix), this entry just needs to exist:

```tsx
{ id: "clients", label: "Clients", icon: "👥", badge: "" },
```

`DashboardViewSection` in `src/lib/crm.ts` already includes `"clients"`, so no type change is needed.

---

## 6. Optional — link drafts to clients

If you want the client record to drive draft ownership, add an optional field to `ContentDraft`:

```ts
// src/lib/crm.ts
export interface ContentDraft {
  // ...existing fields
  clientId?: string;
}
```

Then in the drafts table (or `ContentDraftCard`) render the client company by looking it up. This is optional for v2 and can wait for v3 when the store is shared.

---

## 7. Local verification

```bash
cd ~/smma/nextjs-setup/nextjs-dashboard
pnpm build
```

You should see the new routes in the build output:

```
Route (app)                              Size
├ ƒ /api/crm/clients                     0 B
├ ƒ /api/crm/clients/[id]                0 B
├ ƒ /dashboard                           ...
```

No `Failed to type check.`

Then run the dev server and smoke-test manually:

```bash
pnpm dev
```

- `GET  http://localhost:YOUR_PORT/api/crm/clients` → `{ clients: [...] }`
- `GET  http://localhost:YOUR_PORT/api/crm/clients?stats=1` → includes `stats`
- `GET  http://localhost:YOUR_PORT/api/crm/clients?status=active` → filtered
- `GET  http://localhost:YOUR_PORT/api/crm/clients?search=lumen` → filtered
- `POST http://localhost:YOUR_PORT/api/crm/clients` with `{name, company, email}` → 201
- `PATCH http://localhost:YOUR_PORT/api/crm/clients/cl-001` with `{status:"paused"}` → updated
- `DELETE http://localhost:YOUR_PORT/api/crm/clients/cl-002` → removed
- Visit `/dashboard`, switch to **Clients**, exercise search/filter/create/edit/delete.

---

## 8. Commit and push

```bash
cd ~/smma
git add .
git commit -m "v2 CRM: client records management (list, create, edit, delete, stats)"
git push origin main
```

---

## 9. Deliverables summary

| Layer | Added |
|---|---|
| Types | `ClientStatus`, expanded `Client`, `ClientStats`, `CLIENT_STATUSES`, richer `initialClients` |
| API | `GET/POST/DELETE /api/crm/clients`, `GET/PATCH/DELETE /api/crm/clients/[id]` |
| Components | `ClientStatsCards`, `ClientForm`, `ClientsTable` |
| Dashboard | New `clients` section rendered from `ClientsTable` |
| Data model | Fields: company, contact, email, phone, website, industry, status, tags, revenue, account manager, notes, timestamps, posts summary |

---

## 10. Known limitations (carry into v3)

- In-memory store resets on cold start and isn't shared across serverless instances. Move to `src/lib/store.ts` (single module) or a real database in v3.
- No auth / role gating yet — every visitor can edit clients.
- No audit log of who changed what.
- `posts.count` and `revenue` are manual numbers, not derived from actual drafts/publish jobs.
- Deleting a client does not cascade to drafts or jobs.

These are natural v3 candidates once the client module is in place.