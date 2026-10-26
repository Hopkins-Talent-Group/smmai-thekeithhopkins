import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";
import { providerErrorResponse } from "@/lib/integrations";

const ALLOWED_ACTIONS = new Set([
  "draft.approved", "draft.rejected", "draft.published", "draft.simulated",
  "account.connected", "account.disconnected", "account.refresh_failed",
  "job.queued", "job.failed", "job.dead_lettered",
  "settings.changed", "auth.login", "auth.logout",
  "apikey.created", "apikey.revoked", "workflow.triggered",
  "webhook.received", "webhook.rejected",
]);

/**
 * Phase 2 audit reader.
 * GET /api/audit?action=&resourceType=&take=&cursor=
 * The AuditLog model previously had zero writers; writers land in this same
 * change (see lib/audit.ts + publish/integrations routes).
 */
export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 120, windowSeconds: 60, scope: "audit:read" });
  if (!limit.allowed) return rateLimitResponse(limit);
  try {
    const session = await verifySession(request);
    if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const resourceType = searchParams.get("resourceType");
    const take = Math.min(Math.max(Number(searchParams.get("take") ?? 50) || 50, 1), 200);
    const cursor = searchParams.get("cursor");

    const events = await prisma.auditLog.findMany({
      where: {
        workspaceId: session.payload.workspaceId,
        ...(action && ALLOWED_ACTIONS.has(action) ? { action } : {}),
        ...(resourceType ? { resourceType } : {}),
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      select: { id: true, action: true, resourceType: true, resourceId: true, actorUserId: true, requestId: true, metadata: true, createdAt: true },
    });

    const hasMore = events.length > take;
    const page = hasMore ? events.slice(0, take) : events;
    return NextResponse.json({
      events: page,
      nextCursor: hasMore ? page[page.length - 1].createdAt : null,
      actions: [...ALLOWED_ACTIONS],
    });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
