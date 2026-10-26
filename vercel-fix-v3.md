# v3.0 — PostgreSQL + Neon Database Integration

This replaces the in-memory stores in the CRM with a real PostgreSQL database hosted on Neon, using Prisma as the ORM. It's the foundation for persistence, multi-instance consistency, and a path to production.

---

## 🎯 What v3.0 solves

| v2.x limitation | v3.0 fix |
|---|---|
| In-memory data resets on cold start | Data persists in PostgreSQL |
| Separate route files hold separate arrays | Single shared database |
| No queryable history | Full SQL query capability |
| No data relationships | Foreign keys between clients, drafts, jobs |
| Can't scale past one serverless instance | Neon handles connection pooling |

---

## 📋 Prerequisites

1. **Neon account** — sign up at [neon.tech](https://neon.tech) (free tier available)
2. **Node.js 18+** installed locally
3. **Vercel project** already connected (from v1/v2)
4. **Existing codebase** with the CRM components from v1/v2

---

## 🗄️ Step 1 — Create the Neon project

1. Log in to the Neon Console
2. Click **New Project**
3. Choose a region close to your Vercel deployment (e.g., `us-east-2` for Washington D.C.)
4. Name it something like `smma-crm`
5. Click **Create Project**

Once created, click the **Connect** button. You'll see two connection strings:

| Type | Hostname contains | Use for |
|---|---|---|
| **Pooled** | `-pooler` | Application queries (API routes, server components) |
| **Direct** | no `-pooler` | Migrations, introspection, admin tasks |

Copy both. You'll need them in the next step.

> **Why two strings?** Serverless functions open many short-lived connections. The pooled string routes through PgBouncer, which reuses connections efficiently. Migrations need a direct session connection, which the pooler doesn't provide.

---

## 🔐 Step 2 — Environment variables

Create `.env.local` in `nextjs-setup/nextjs-dashboard/`:

```ini
# Pooled connection — for the app
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require"

# Direct connection — for Prisma CLI (migrations, db push)
DIRECT_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require"
```

Replace the placeholders with the actual values from the Neon Console.

**Important:** Add `.env.local` to `.gitignore` if it isn't already. Never commit connection strings.

For **Vercel**, add the same two variables in **Project Settings → Environment Variables**. Do this for Production, Preview, and Development.

---

## 📦 Step 3 — Install Prisma

From `nextjs-setup/nextjs-dashboard/`:

```bash
pnpm add @prisma/client @prisma/adapter-neon @neondatabase/serverless
pnpm add -D prisma tsx
```

| Package | Purpose |
|---|---|
| `@prisma/client` | Generated type-safe database client |
| `@prisma/adapter-neon` | Routes Prisma queries over WebSockets for serverless |
| `@neondatabase/serverless` | Neon's HTTP/WebSocket driver |
| `prisma` (dev) | CLI for migrations and generation |
| `tsx` (dev) | Runs TypeScript seed scripts |

---

## 🏗️ Step 4 — Prisma schema

Create `prisma/schema.prisma` inside `nextjs-setup/nextjs-dashboard/`:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ------------------------------------------------------------------
// Enums
// ------------------------------------------------------------------

enum ClientStatus {
  PROSPECT
  ACTIVE
  PAUSED
  CHURNED
}

enum DraftStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
  SCHEDULED
  PUBLISHED
}

enum JobStatus {
  PENDING
  SUCCEEDED
  FAILED
}

// ------------------------------------------------------------------
// Models
// ------------------------------------------------------------------

model BrandProfile {
  id                  String   @id @default(cuid())
  name                String
  audience            String
  voice               String
  prohibitedTopics    String[]
  requiredDisclosures String[]
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model Client {
  id             String       @id @default(cuid())
  name           String
  company        String
  email          String       @unique
  phone          String?
  website        String?
  industry       String?
  status         ClientStatus @default(PROSPECT)
  approved       Boolean      @default(false)
  revenue        Float        @default(0)
  accountManager String?
  tags           String[]
  notes          String?
  postCount      Int          @default(0)
  lastPostAt     DateTime?
  lastActivity   DateTime     @default(now())
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  drafts         ContentDraft[]

  @@index([status])
  @@index([company])
}

model ContentDraft {
  id              String      @id @default(cuid())
  topic           String
  platform        String
  text            String
  hashtags        String[]
  status          DraftStatus @default(DRAFT)
  metadata        Json?
  engagementScore Int?
  author          String?
  scheduledAt     DateTime?
  publishedAt     DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  clientId        String?
  client          Client?     @relation(fields: [clientId], references: [id], onDelete: SetNull)

  jobs            PublishJob[]

  @@index([status])
  @@index([clientId])
  @@index([platform])
}

model PublishJob {
  id          String    @id @default(cuid())
  draftId     String
  draft       ContentDraft @relation(fields: [draftId], references: [id], onDelete: Cascade)
  platform    String
  status      JobStatus @default(PENDING)
  error       String?
  createdAt   DateTime  @default(now())
  completedAt DateTime?

  @@index([draftId])
  @@index([status])
}
```

> **Note on `directUrl`:** Prisma Migrate needs a direct connection. Adding `directUrl = env("DIRECT_URL")` lets migrations use the non-pooled string while queries use the pooled one.

---

## ⚙️ Step 5 — Prisma client singleton

Create `src/lib/prisma.ts`:

```ts
import { PrismaClient } from "@/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

The singleton pattern prevents connection exhaustion during hot reload in development. In production, each serverless instance creates one client and reuses it.

---

## 🗃️ Step 6 — Run the first migration

From `nextjs-setup/nextjs-dashboard/`:

```bash
npx prisma migrate dev --name init
```

This does three things:

1. Creates SQL migration files in `prisma/migrations/`
2. Applies them to your Neon database
3. Generates the Prisma Client into `src/generated/prisma/`

You should see output like:

```
✔ Generated Prisma Client
The following migration(s) have been created and applied:
migrations/
  └─ 20250227120000_init/
    └─ migration.sql
```

Commit the migration files:

```bash
git add prisma/migrations prisma/schema.prisma
git commit -m "v3.0: add Prisma schema and initial migration"
```

---

## 🌱 Step 7 — Seed script

Create `prisma/seed.ts`:

```ts
import { PrismaClient } from "../src/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaNeon({
  connectionString: process.env.DIRECT_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Brand profile
  await prisma.brandProfile.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "",
      audience: "",
      voice: "",
      prohibitedTopics: [],
      requiredDisclosures: [],
    },
  });

  // Clients
  const clients = [
    {
      id: "cl-001",
      name: "Ada Reyes",
      company: "Acme Corp",
      email: "ada@acme.com",
      phone: "+1-555-0101",
      website: "https://acme.com",
      industry: "SaaS",
      status: "ACTIVE" as const,
      approved: true,
      revenue: 12500,
      accountManager: "Mia Chen",
      tags: ["enterprise", "retainer"],
      notes: "Quarterly review scheduled for March.",
      postCount: 42,
      lastPostAt: new Date("2024-01-15T10:00:00Z"),
    },
    {
      id: "cl-002",
      name: "Ben Okafor",
      company: "Northwind Labs",
      email: "ben@northwind.io",
      phone: "+1-555-0114",
      website: "https://northwind.io",
      industry: "Healthtech",
      status: "PROSPECT" as const,
      approved: false,
      revenue: 0,
      accountManager: "Diego Santos",
      tags: ["inbound", "trial"],
      notes: "Requested pricing sheet.",
      postCount: 0,
    },
    {
      id: "cl-003",
      name: "Cara Lin",
      company: "Lumen & Co",
      email: "cara@lumen.co",
      phone: "+1-555-0188",
      website: "https://lumen.co",
      industry: "Retail",
      status: "PAUSED" as const,
      approved: true,
      revenue: 4800,
      accountManager: "Mia Chen",
      tags: ["smb"],
      notes: "Paused billing pending budget review.",
      postCount: 17,
      lastPostAt: new Date("2023-11-09T08:15:00Z"),
    },
  ];

  for (const c of clients) {
    await prisma.client.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }

  // Drafts
  await prisma.contentDraft.upsert({
    where: { id: "draft-001" },
    update: {},
    create: {
      id: "draft-001",
      topic: "Welcome to SMMAI",
      platform: "meta",
      text: "Get started with social media management automation.",
      hashtags: ["#content", "#automation"],
      status: "PUBLISHED" as const,
      metadata: {},
      createdAt: new Date(),
      clientId: "cl-001",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Run it:

```bash
pnpm seed
```

---

## 🔄 Step 8 — Rewrite API routes

### `src/app/api/crm/clients/route.ts`

Replace the in-memory array with Prisma queries:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ClientStatus } from "@/generated/prisma";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search")?.trim();
  const includeStats = url.searchParams.get("stats") === "1";

  const where: Record<string, unknown> = {};

  if (status && Object.values(ClientStatus).includes(status as ClientStatus)) {
    where.status = status as ClientStatus;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { industry: { contains: search, mode: "insensitive" } },
    ];
  }

  const clients = await prisma.client.findMany({
    where,
    orderBy: { lastActivity: "desc" },
  });

  const body: Record<string, unknown> = { clients };

  if (includeStats) {
    const [total, active, prospects, churned, revenueAgg, postsAgg] =
      await Promise.all([
        prisma.client.count(),
        prisma.client.count({ where: { status: "ACTIVE" } }),
        prisma.client.count({ where: { status: "PROSPECT" } }),
        prisma.client.count({ where: { status: "CHURNED" } }),
        prisma.client.aggregate({ _sum: { revenue: true } }),
        prisma.client.aggregate({ _sum: { postCount: true } }),
      ]);

    body.stats = {
      total,
      active,
      prospects,
      churned,
      totalRevenue: revenueAgg._sum.revenue ?? 0,
      totalPosts: postsAgg._sum.postCount ?? 0,
    };
  }

  return NextResponse.json(body);
}

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
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

  const client = await prisma.client.create({
    data: {
      name: String(payload.name),
      company: String(payload.company),
      email: String(payload.email),
      phone: payload.phone ? String(payload.phone) : null,
      website: payload.website ? String(payload.website) : null,
      industry: payload.industry ? String(payload.industry) : null,
      status: (payload.status as ClientStatus) ?? "PROSPECT",
      approved: Boolean(payload.approved),
      revenue: Number(payload.revenue) || 0,
      accountManager: payload.accountManager
        ? String(payload.accountManager)
        : null,
      tags: Array.isArray(payload.tags) ? (payload.tags as string[]) : [],
      notes: payload.notes ? String(payload.notes) : null,
    },
  });

  return NextResponse.json({ client }, { status: 201 });
}
```

### `src/app/api/crm/clients/[id]/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ClientStatus } from "@/generated/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const client = await prisma.client.findUnique({ where: { id } });
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

  let patch: Record<string, unknown>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    patch.status &&
    !Object.values(ClientStatus).includes(patch.status as ClientStatus)
  ) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const client = await prisma.client.update({
      where: { id },
      data: patch,
    });
    return NextResponse.json({ client });
  } catch {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const client = await prisma.client.delete({ where: { id } });
    return NextResponse.json({ client });
  } catch {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
}
```

### `src/app/api/crm/drafts/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DraftStatus } from "@/generated/prisma";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const clientId = url.searchParams.get("clientId");

  const where: Record<string, unknown> = {};
  if (status) where.status = status as DraftStatus;
  if (clientId) where.clientId = clientId;

  const drafts = await prisma.contentDraft.findMany({
    where,
    include: { client: { select: { id: true, company: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ drafts });
}

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.topic || !payload.text || !payload.platform) {
    return NextResponse.json(
      { error: "topic, text, and platform are required" },
      { status: 400 }
    );
  }

  const draft = await prisma.contentDraft.create({
    data: {
      topic: String(payload.topic),
      platform: String(payload.platform),
      text: String(payload.text),
      hashtags: Array.isArray(payload.hashtags)
        ? (payload.hashtags as string[])
        : [],
      status: (payload.status as DraftStatus) ?? "DRAFT",
      metadata: payload.metadata as object | undefined,
      author: payload.author ? String(payload.author) : null,
      clientId: payload.clientId ? String(payload.clientId) : null,
    },
  });

  return NextResponse.json({ draft }, { status: 201 });
}
```

### `src/app/api/crm/brand/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const brand = await prisma.brandProfile.findFirst();
  return NextResponse.json({ brand });
}

export async function PUT(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.brandProfile.findFirst();

  const brand = existing
    ? await prisma.brandProfile.update({
        where: { id: existing.id },
        data: payload,
      })
    : await prisma.brandProfile.create({
        data: {
          name: String(payload.name ?? ""),
          audience: String(payload.audience ?? ""),
          voice: String(payload.voice ?? ""),
          prohibitedTopics: Array.isArray(payload.prohibitedTopics)
            ? (payload.prohibitedTopics as string[])
            : [],
          requiredDisclosures: Array.isArray(payload.requiredDisclosures)
            ? (payload.requiredDisclosures as string[])
            : [],
        },
      });

  return NextResponse.json({ brand });
}
```

### `src/app/api/crm/publish/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { draftId, platform } = payload;
  if (!draftId || !platform) {
    return NextResponse.json(
      { error: "draftId and platform are required" },
      { status: 400 }
    );
  }

  const job = await prisma.publishJob.create({
    data: {
      draftId: String(draftId),
      platform: String(platform),
      status: "PENDING",
    },
  });

  // Simulate async publishing
  setTimeout(async () => {
    try {
      await prisma.publishJob.update({
        where: { id: job.id },
        data: { status: "SUCCEEDED", completedAt: new Date() },
      });
      await prisma.contentDraft.update({
        where: { id: String(draftId) },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
    } catch (err) {
      await prisma.publishJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : "Unknown error",
          completedAt: new Date(),
        },
      });
    }
  }, 5000);

  return NextResponse.json({ job }, { status: 201 });
}
```

---

## 🚀 Step 9 — Vercel deployment

### Build command

Vercel prunes dev dependencies during build, which removes `prisma` and breaks `prisma migrate deploy`. Fix this by moving `prisma` to `dependencies`:

```bash
pnpm add prisma
```

Then update the build command in `nextjs-setup/nextjs-dashboard/package.json`:

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

### Environment variables on Vercel

In **Project Settings → Environment Variables**, add:

| Name | Value | Environments |
|---|---|---|
| `DATABASE_URL` | Pooled Neon string | Production, Preview, Development |
| `DIRECT_URL` | Direct Neon string | Production, Preview, Development |

### Neon Vercel integration (optional but recommended)

Install the Neon integration from the Vercel Marketplace. It automatically:

- Injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED` into your project
- Creates a database branch for each preview deployment
- Cleans up branches when PRs close

With preview branching, each pull request gets its own isolated copy of production data, so you can test schema changes safely.

---

## ✅ Step 10 — Verification

### Local

```bash
cd nextjs-setup/nextjs-dashboard

# Generate client
npx prisma generate

# Apply migrations
npx prisma migrate dev

# Seed data
pnpm seed

# Build
pnpm build

# Dev server
pnpm dev
```

Test the API routes:

```bash
# List clients
curl http://localhost:YOUR_PORT/api/crm/clients

# With stats
curl "http://localhost:YOUR_PORT/api/crm/clients?stats=1"

# Filter by status
curl "http://localhost:YOUR_PORT/api/crm/clients?status=ACTIVE"

# Search
curl "http://localhost:YOUR_PORT/api/crm/clients?search=lumen"

# Create
curl -X POST http://localhost:YOUR_PORT/api/crm/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","company":"Test Co","email":"test@test.com"}'

# Update
curl -X PATCH http://localhost:YOUR_PORT/api/crm/clients/cl-001 \
  -H "Content-Type: application/json" \
  -d '{"status":"PAUSED"}'

# Delete
curl -X DELETE http://localhost:YOUR_PORT/api/crm/clients/cl-002
```

### Production

After deploying to Vercel:

1. Check the build log for `prisma migrate deploy` success
2. Visit `/dashboard` and switch to **Clients**
3. Verify seed data appears
4. Create a client, refresh the page — data should persist
5. Check Neon Console → **Tables** to see the data

---

## 🐛 Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `Can't resolve '@/generated/prisma'` | Client not generated | Run `npx prisma generate` |
| `P1001: Can't reach database server` | Wrong connection string | Check `DATABASE_URL` in `.env.local` |
| `prepared statement "s0" already exists` | PgBouncer + Prisma | Use `?pgbouncer=true` in `DATABASE_URL` |
| `prisma migrate deploy` hangs | Pooled connection | Ensure `DIRECT_URL` is set and `directUrl` is in schema |
| `Environment variable not found: DIRECT_URL` | Vercel env var missing | Add `DIRECT_URL` in Vercel settings |
| `PrismaClientInitializationError` | Missing adapter | Ensure `PrismaNeon` adapter is used |

---

## 📁 Files changed

| File | Change |
|---|---|
| `prisma/schema.prisma` | **New** — database schema |
| `prisma/seed.ts` | **New** — seed script |
| `src/lib/prisma.ts` | **New** — client singleton |
| `src/app/api/crm/clients/route.ts` | Rewritten to use Prisma |
| `src/app/api/crm/clients/[id]/route.ts` | Rewritten to use Prisma |
| `src/app/api/crm/drafts/route.ts` | Rewritten to use Prisma |
| `src/app/api/crm/brand/route.ts` | Rewritten to use Prisma |
| `src/app/api/crm/publish/route.ts` | Rewritten to use Prisma |
| `package.json` | Added `prisma generate && prisma migrate deploy` to build |
| `.gitignore` | Ensure `.env.local` is ignored |

---

## 🏁 What v3.0 delivers

- **Persistence** — data survives restarts and cold starts
- **Single source of truth** — all API routes query the same database
- **Type safety** — Prisma generates TypeScript types from the schema
- **Relationships** — clients own drafts; drafts own publish jobs
- **Scalability** — Neon handles connection pooling for serverless
- **Preview isolation** — optional Neon integration branches the DB per PR
- **Migration path** — `prisma migrate deploy` runs automatically on every Vercel build

Once v3.0 is deployed, the CRM has a real backend. Future versions can add auth, audit logs, and derived metrics without changing the data layer.