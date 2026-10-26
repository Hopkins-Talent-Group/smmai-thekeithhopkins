import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";
import { providerErrorResponse } from "@/lib/integrations";

/**
 * Phase 2 automation hub data.
 * GET /api/automation/hub — real queue depth from Redis, recent publish jobs
 * with draft context, and dead-letter visibility (replaces hardcoded stubs).
 */
export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 60, windowSeconds: 60, scope: "automation:read" });
  if (!limit.allowed) return rateLimitResponse(limit);
  try {
    const session = await verifySession(request);
    if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const workspaceId = session.payload.workspaceId;

    const { getRedisQueue, withQueue } = await import("@/lib/queue-server");
    const queue = getRedisQueue();
    const fallback = { pending: 0, deadLetter: 0, unavailable: true };
    const stats = queue
      ? await withQueue(
          async (client) => ({
            pending: await client.zcard("smmai:queue:publish"),
            deadLetter: await client.zcard("smmai:dlq:publish"),
            unavailable: false,
          }),
          fallback,
        )
      : fallback;
    const { pending, deadLetter, unavailable: queueUnavailable } = stats;

    const jobs = await prisma.publishJob.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { draft: { select: { topic: true, status: true } } },
    });

    const counts = await prisma.publishJob.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: { _all: true },
    });
    const byStatus: Record<string, number> = {};
    for (const row of counts) {
      byStatus[row.status] = row._count._all;
    }

    const workflows = await prisma.workflow.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      queue: { pending, deadLetter, unavailable: queueUnavailable },
      byStatus,
      jobs: jobs.map((job) => ({
        id: job.id,
        draftId: job.draftId,
        draftTopic: job.draft?.topic ?? job.draftId,
        platform: job.platform,
        status: job.status,
        error: job.error,
        externalPostId: job.externalPostId,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
      workflows: workflows.map((w) => ({
        id: w.id,
        name: w.name,
        isActive: w.isActive,
        updatedAt: w.updatedAt.toISOString(),
      })),
      dryRun: process.env.DRY_RUN !== "false",
    });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
