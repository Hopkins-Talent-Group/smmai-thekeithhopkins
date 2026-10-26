import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 120, scope: "crm:overview:read" });
  if (!limit.allowed) return rateLimitResponse(limit);

  const session = await verifySession(request);
  if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const workspaceId = session.payload.workspaceId;

  const [
    clients,
    leads,
    openOpportunities,
    pendingApprovals,
    scheduledJobs,
    failedJobs,
    connectedAccounts,
    recentActivities,
  ] = await Promise.all([
    prisma.client.count({ where: { workspaceId } }),
    prisma.lead.count({ where: { workspaceId, status: { notIn: ["CONVERTED", "LOST"] } } }),
    prisma.opportunity.count({ where: { workspaceId, status: "OPEN" } }),
    prisma.contentDraft.count({ where: { workspaceId, status: "pending" } }),
    prisma.publishJob.count({ where: { workspaceId, status: { in: ["PENDING", "RUNNING"] } } }),
    prisma.publishJob.count({ where: { workspaceId, status: "FAILED" } }),
    prisma.socialAccount.count({ where: { workspaceId, isActive: true } }),
    prisma.activity.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, subject: true, type: true },
    }),
  ]);

  return NextResponse.json({
    metrics: {
      clients,
      leads,
      openOpportunities,
      pendingApprovals,
      scheduledJobs,
      failedJobs,
      connectedAccounts,
    },
    recentActivities,
  });
}
