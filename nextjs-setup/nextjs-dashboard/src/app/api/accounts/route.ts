import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";
import { providerErrorResponse, publicConnectionShape } from "@/lib/integrations";
import { verifySession } from "@/lib/auth";

/**
 * Phase 2 account list.
 * GET /api/accounts — normalized connection health + capabilities.
 * Never returns access/refresh tokens (contract: responses expose account
 * health and capabilities only).
 */
export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 120, windowSeconds: 60, scope: "integrations:read" });
  if (!limit.allowed) return rateLimitResponse(limit);
  try {
    const { searchParams } = new URL(request.url);
    const session = await verifySession(request);
    if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const platform = searchParams.get("platform")?.toUpperCase();
    const rows = await prisma.integrationConnection.findMany({
      where: { workspaceId: session.payload.workspaceId, ...(platform ? { platform: platform as never } : {}) },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ connections: rows.map(publicConnectionShape) });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
