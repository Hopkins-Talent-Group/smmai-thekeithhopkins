import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse, readJsonWithLimit, requireSameOrigin } from "@/lib/security";

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 120, scope: "analytics:read" });
  if (!limit.allowed) return rateLimitResponse(limit);
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // overview, content, accounts
  const platform = searchParams.get("platform");
  const timeframe = searchParams.get("timeframe") || "30d";

  const session = await verifySession(request);
  if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const workspaceId = session.payload.workspaceId;

  let where: any = {};

  if (workspaceId) {
    where.workspaceId = workspaceId;
  }

  if (platform && platform !== "all") {
    where.platform = platform;
  }

  let queryWhere: any = {};

  if (type === "overview") {
    // Aggregate draft status counts
    const [drafts, published] = await Promise.all([
      prisma.contentDraft.findMany({ where, take: 1000 }),
      prisma.contentDraft.count({ where: { ...where, status: "published" } }),
    ]);

    const statusCounts: Record<string, number> = {};
    ["draft", "pending", "approved", "rejected", "scheduled", "published"].forEach(
      (s) => (statusCounts[s] = drafts.filter((d: any) => d.status === s).length)
    );

    return NextResponse.json({
      type: "overview",
      workspaceId,
      drafts: drafts.length,
      published,
      statusCounts,
      timeframe,
    });
  }

  if (type === "content") {
    const drafts = await prisma.contentDraft.findMany({
      where: { ...where, status: "published" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      type: "content",
      items: drafts.map((d: any) => ({
        id: d.id,
        topic: d.topic,
        platform: d.platform,
        publishedAt: d.createdAt,
      })),
      timeframe,
    });
  }

  if (type === "accounts") {
    // Return connected social account summaries
    return NextResponse.json({
      type: "accounts",
      items: [],
      workspaceId,
      timeframe,
    });
  }

  // Default: overview
  const [drafts, published] = await Promise.all([
    prisma.contentDraft.findMany({ where, take: 1000 }),
    prisma.contentDraft.count({ where: { ...where, status: "published" } }),
  ]);

  const statusCounts: Record<string, number> = {};
  ["draft", "pending", "approved", "rejected", "scheduled", "published"].forEach(
    (s) => (statusCounts[s] = drafts.filter((d: any) => d.status === s).length)
  );

  return NextResponse.json({
    type: "overview",
    workspaceId,
    drafts: drafts.length,
    published,
    statusCounts,
    timeframe,
  });
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 10, scope: "analytics:sync" });
  if (!limit.allowed) return rateLimitResponse(limit);
  if (!requireSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    const body = await readJsonWithLimit(request) as { type?: string; data?: unknown; [k: string]: unknown };
    const { type, data } = body;

    const session = await verifySession(request);
    if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const workspaceId = session.payload.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (type === "sync") {
      // Trigger analytics sync job
      return NextResponse.json({
        success: true,
        message: "Analytics sync initiated",
        workspaceId,
      });
    }

    return NextResponse.json({ error: "Unknown analytics type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to process analytics request" }, { status: 500 });
  }
}