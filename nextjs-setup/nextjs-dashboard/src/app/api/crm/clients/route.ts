import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse, readJsonWithLimit, requireSameOrigin } from "@/lib/security";
import { toClientDTO } from "@/lib/crm";

const ClientStatus = ["PROSPECT", "ACTIVE", "PAUSED", "CHURNED"] as const;

export async function GET(req: NextRequest) {
  const limit = await checkRateLimit(req, { limit: 60, scope: "crm:clients:read" });
  if (!limit.allowed) return rateLimitResponse(limit);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search")?.trim();
  const includeStats = url.searchParams.get("stats") === "1";

  const session = await verifySession(req);
  if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const workspaceId = session.payload.workspaceId;

  const where: Record<string, unknown> = {};

  if (workspaceId) {
    where.workspaceId = workspaceId;
  }

  if (status && Object.values(ClientStatus).includes(status as any)) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { industry: { contains: search, mode: "insensitive" } },
    ];
  }

  const clients = (await prisma.client.findMany({
    where,
    orderBy: { lastActivity: "desc" },
  })).map(toClientDTO);

  const body: Record<string, unknown> = { clients };

  if (includeStats) {
    const [total, active, prospects, churned, revenueAgg, postsAgg] =
      await Promise.all([
        prisma.client.count({ where }),
        prisma.client.count({ where: { ...where, status: "ACTIVE" } }),
        prisma.client.count({ where: { ...where, status: "PROSPECT" } }),
        prisma.client.count({ where: { ...where, status: "CHURNED" } }),
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
  const limit = await checkRateLimit(req, { limit: 30, scope: "crm:clients:write" });
  if (!limit.allowed) return rateLimitResponse(limit);
  if (!requireSameOrigin(req)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  let payload: Record<string, unknown>;
  try {
    payload = await readJsonWithLimit(req);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.name || !payload.email || !payload.company) {
    return NextResponse.json(
      { error: "name, email, and company are required" },
      { status: 400 }
    );
  }

  const session = await verifySession(req);
  if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const workspaceId = session.payload.workspaceId;

  const client = await prisma.client.create({
    data: {
      name: String(payload.name),
      company: String(payload.company),
      email: String(payload.email),
      phone: payload.phone ? String(payload.phone) : null,
      website: payload.website ? String(payload.website) : null,
      industry: payload.industry ? String(payload.industry) : null,
      status: (payload.status as any) ?? "PROSPECT",
      approved: Boolean(payload.approved),
      revenue: Number(payload.revenue) || 0,
      accountManager: payload.accountManager
        ? String(payload.accountManager)
        : null,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      notes: payload.notes ? String(payload.notes) : null,
      workspaceId,
    },
  });

  return NextResponse.json({ client }, { status: 201 });
}

// Used by tests / dev reset
export async function DELETE() {
  // Reset would be handled by Prisma in v3
  return NextResponse.json({ ok: true });
}