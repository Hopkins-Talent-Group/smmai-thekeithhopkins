import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { auditIntegrationEvent, providerErrorResponse, resolveProvider } from "@/lib/integrations";
import { verifySession } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";

/**
 * Phase 2 account health refresh (contract: POST /api/accounts/{id}/refresh).
 * Re-validates stored credential metadata and flips expired tokens to
 * REAUTH_REQUIRED so capability-gated UI actions disable before any provider
 * call is attempted.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(request, { limit: 20, windowSeconds: 60, scope: "integrations:write" });
  if (!limit.allowed) return rateLimitResponse(limit);
  try {
    const session = await verifySession(request);
    if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { id } = await params;
    const row = await prisma.integrationConnection.findUnique({ where: { id } });
    if (!row || row.workspaceId !== session.payload.workspaceId) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const provider = resolveProvider(String(row.platform ?? "").toLowerCase()) ?? String(row.platform ?? "").toLowerCase();
    const metadata = (row.metadata ?? {}) as unknown as Record<string, unknown> & { capabilities?: Record<string, unknown> };
    const capabilities = metadata.capabilities ?? {};
    const expired = row.tokenExpiresAt ? new Date(row.tokenExpiresAt).getTime() <= Date.now() : false;
    const updated = await prisma.integrationConnection.update({
      where: { id: row.id },
      data: {
        lastSyncedAt: new Date(),
        status: expired ? "REAUTH_REQUIRED" : row.status,
        lastErrorAt: expired ? new Date() : null,
        metadata: { ...metadata, capabilities, refreshedAt: new Date().toISOString() } as Prisma.InputJsonObject,
      },
    });

    if (expired) {
      await auditIntegrationEvent(request, session, "account.refresh_failed", provider, row.id, {
        externalAccountId: row.externalAccountId,
        reason: "token expired; re-authentication required",
      });
    }

    return NextResponse.json({ refreshed: [updated.id], provider, reauthRequired: expired });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
