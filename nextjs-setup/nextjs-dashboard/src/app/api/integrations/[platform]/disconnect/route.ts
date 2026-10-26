import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { readJsonWithLimit } from "@/lib/security";
import { auditIntegrationEvent, guardIntegrationRoute, providerErrorResponse } from "@/lib/integrations";

/**
 * Phase 2 disconnect.
 * POST /api/integrations/{platform}/disconnect
 * Removes active credentials and invalidates queued work for the account
 * (contract step 9) so a revoked provider can never publish stale jobs.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  try {
    const { platform } = await params;
    const guard = await guardIntegrationRoute(request, platform);
    if (!guard || "error" in guard) return guard.error;
    const { session, platform: provider } = guard;

    let body: { connectionId?: unknown } = {};
    try {
      body = await readJsonWithLimit<{ connectionId?: unknown }>(request);
    } catch {
      body = {};
    }
    const connectionId = typeof body.connectionId === "string" ? body.connectionId : null;

    const rows = await prisma.integrationConnection.findMany({
      where: {
        workspaceId: session.payload.workspaceId,
        platform: provider.toUpperCase() as never,
        ...(connectionId ? { id: connectionId } : {}),
      },
    });
    if (rows.length === 0) return NextResponse.json({ error: `No connected ${provider} account` }, { status: 404 });

    const { getRedisQueue, withQueue } = await import("@/lib/queue-server");
    const queue = getRedisQueue();
    const invalidated: string[] = [];

    for (const row of rows) {
      await prisma.integrationConnection.update({
        where: { id: row.id },
        data: {
          status: "DISCONNECTED",
          accessTokenCiphertext: null,
          refreshTokenCiphertext: null,
          tokenExpiresAt: null,
          lastErrorAt: new Date(),
        },
      });

      // Invalidate queued work for the revoked account (contract step 9).
      const queued = await prisma.publishJob.findMany({
        where: {
          workspaceId: session.payload.workspaceId,
          platform: { in: [provider, provider.toUpperCase()] },
          status: { in: ["PENDING", "RUNNING"] },
        },
        select: { id: true },
      });
      for (const job of queued) {
        await prisma.publishJob.update({
          where: { id: job.id },
          data: { status: "CANCELLED", error: `${provider} account disconnected; queued work invalidated` },
        });
        if (queue) {
          await withQueue(async (client) => {
            await client.del(`smmai:queue:publish:${job.id}`);
            await client.zrem("smmai:queue:publish", job.id);
          }, null);
        }
        invalidated.push(job.id);
      }

      await auditIntegrationEvent(request, session, "account.disconnected", provider, row.id, {
        externalAccountId: row.externalAccountId,
        invalidatedJobs: invalidated.length,
      });
    }

    return NextResponse.json({ disconnected: rows.map((row: { id: string }) => row.id), invalidatedJobs: invalidated });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
