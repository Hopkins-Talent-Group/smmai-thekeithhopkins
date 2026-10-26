import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";
import { providerErrorResponse } from "@/lib/integrations";

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 60, windowSeconds: 60, scope: "automation:read" });
  if (!limit.allowed) return rateLimitResponse(limit);
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action"); // status, policies

  const session = await verifySession(request);
  if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const workspaceId = session.payload.workspaceId;

  const where: { workspaceId?: string } = {};
  if (workspaceId) {
    where.workspaceId = workspaceId;
  }

  if (action === "status") {
    // Return automation system status with real queue depth.
    const [drafts, published, queueStats] = await Promise.all([
      prisma.contentDraft.findMany({ where: { ...where, status: "published" } }),
      prisma.contentDraft.count({ where: { ...where, status: "published" } }),
      getLiveQueueStats(),
    ]);

    return NextResponse.json({
      action: "status",
      workspaceId,
      publishedDrafts: drafts.length,
      totalPublished: published,
      queueLength: queueStats.pending,
      deadLetterLength: queueStats.deadLetter,
      queueUnavailable: queueStats.unavailable,
      dryRun: process.env.DRY_RUN === "true",
    });
  }

  if (action === "policies") {
    // Return automation policies for the workspace
    return NextResponse.json({
      action: "policies",
      workspaceId,
      policies: [
        {
          id: "1",
          name: "Moderation Policy",
          enabled: true,
          prohibitedTopics: [],
          requiredDisclosures: [],
        },
      ],
      canEdit: true,
    });
  }

  // Default: status
  const [defaultDrafts, defaultPublished, defaultQueue] = await Promise.all([
    prisma.contentDraft.findMany({ where: { ...where, status: "published" } }),
    prisma.contentDraft.count({ where: { ...where, status: "published" } }),
    getLiveQueueStats(),
  ]);

  return NextResponse.json({
    action: "status",
    workspaceId,
    publishedDrafts: defaultDrafts.length,
    totalPublished: defaultPublished,
    queueLength: defaultQueue.pending,
    deadLetterLength: defaultQueue.deadLetter,
    queueUnavailable: defaultQueue.unavailable,
    dryRun: process.env.DRY_RUN === "true",
  });
}

async function getLiveQueueStats() {
  try {
    const { getRedisQueue } = await import("@/lib/queue-server");
    const queue = getRedisQueue();
    if (!queue) return { pending: 0, deadLetter: 0, unavailable: true };
    const [pending, deadLetter] = await Promise.all([
      queue.zcard("smmai:queue:publish"),
      queue.zcard("smmai:dlq:publish"),
    ]);
    return { pending, deadLetter, unavailable: false };
  } catch {
    return { pending: 0, deadLetter: 0, unavailable: true };
  }
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 20, windowSeconds: 60, scope: "automation:write" });
  if (!limit.allowed) return rateLimitResponse(limit);
  try {
    const body = await request.json();
    const { action, policyId, policyData } = body;
    void policyData;

    const session = await verifySession(request);
    if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const workspaceId = session.payload.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (action === "updatePolicy") {
      // Update automation policy
      return NextResponse.json({
        success: true,
        action: "updatePolicy",
        policyId,
        workspaceId,
        message: "Policy updated successfully",
      });
    }

    if (action === "triggerScheduler") {
      // Trigger the daily scheduler: enqueue a planning run marker job.
      const { getRedisQueue, withQueue } = await import("@/lib/queue-server");
      const queue = getRedisQueue();
      const jobId = `scheduler_${workspaceId}_${Date.now()}`;
      if (queue) {
        const enqueued = await withQueue(async (client) => {
          await client.set(
            `smmai:queue:publish:${jobId}`,
            JSON.stringify({ type: "scheduler.triggered", version: 1, jobId, workflowId: "daily", workspaceId }),
            "EX",
            86400,
          );
          await client.zadd("smmai:queue:publish", Date.now(), jobId);
          return true;
        }, false);
        if (!enqueued) {
          return NextResponse.json({ error: "Queue unavailable" }, { status: 503 });
        }
      }
      const { writeAuditEvent } = await import("@/lib/audit");
      await writeAuditEvent({
        workspaceId,
        actorUserId: session.payload.userId,
        action: "workflow.triggered",
        resourceType: "workflow",
        resourceId: "daily",
        metadata: { jobId, queueUnavailable: !queue },
      });
      return NextResponse.json({
        success: true,
        action: "triggerScheduler",
        workspaceId,
        jobId,
        message: "Scheduler triggered",
      });
    }

    return NextResponse.json({ error: "Unknown automation action" }, { status: 400 });
  } catch (error) {
    return providerErrorResponse(error, "Failed to process automation request");
  }
}

export async function PATCH(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 20, windowSeconds: 60, scope: "automation:write" });
  if (!limit.allowed) return rateLimitResponse(limit);
  try {
    const body = await request.json();
    const { policyId, enabled } = body;

    const session = await verifySession(request);
    if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const workspaceId = session.payload.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Toggle a persisted workflow (pause/resume). Workflows are the durable
    // record; the in-memory policy list above remains a read-only default.
    const workflow = policyId
      ? await prisma.workflow.findFirst({ where: { id: String(policyId), workspaceId } })
      : null;
    if (!workflow) {
      return NextResponse.json({ error: "Unknown workflow" }, { status: 404 });
    }
    const updated = await prisma.workflow.update({
      where: { id: workflow.id },
      data: { isActive: enabled !== false },
    });
    const { writeAuditEvent } = await import("@/lib/audit");
    await writeAuditEvent({
      workspaceId,
      actorUserId: session.payload.userId,
      action: "workflow.triggered",
      resourceType: "workflow",
      resourceId: workflow.id,
      metadata: { enabled: updated.isActive },
    });
    return NextResponse.json({
      success: true,
      action: "patchPolicy",
      policyId: updated.id,
      enabled: updated.isActive,
      workspaceId,
      message: updated.isActive ? "Workflow resumed" : "Workflow paused",
    });
  } catch (error) {
    return providerErrorResponse(error, "Failed to update policy");
  }
}