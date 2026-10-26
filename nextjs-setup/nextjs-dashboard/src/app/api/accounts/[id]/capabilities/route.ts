import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";
import { providerErrorResponse, publicConnectionShape, resolveProvider } from "@/lib/integrations";

/**
 * Phase 2 account capability discovery.
 * GET /api/accounts/[id]/capabilities — exposes persisted capabilities so the
 * UI can disable actions before a provider call (contract step 5).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = await checkRateLimit(request, { limit: 120, windowSeconds: 60, scope: "integrations:read" });
  if (!limit.allowed) return rateLimitResponse(limit);
  try {
    const session = await verifySession(request);
    if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { id } = await params;
    const row = await prisma.integrationConnection.findUnique({ where: { id } });
    if (!row || row.workspaceId !== session.payload.workspaceId) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    const platform = resolveProvider(String(row.platform ?? "").toLowerCase()) ?? String(row.platform).toLowerCase();
    const metadata = (row.metadata ?? {}) as unknown as { capabilities?: Record<string, unknown> };
    return NextResponse.json({
      account: publicConnectionShape(row),
      capabilities: metadata.capabilities ?? { platform, publish: true, media: true, scheduling: true, analytics: true, webhooks: true },
    });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
