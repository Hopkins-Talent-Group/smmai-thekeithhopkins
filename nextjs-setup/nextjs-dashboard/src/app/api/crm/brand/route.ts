import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse, readJsonWithLimit, requireSameOrigin } from "@/lib/security";

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 60, scope: "crm:brand:read" });
  if (!limit.allowed) return rateLimitResponse(limit);
  const session = await verifySession(request);
  if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const workspaceId = session.payload.workspaceId;

  const brand = await prisma.brandProfile.findFirst({
    where: workspaceId ? { workspaceId } : {},
  });

  return NextResponse.json({ brand });
}

export async function PUT(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 30, scope: "crm:brand:write" });
  if (!limit.allowed) return rateLimitResponse(limit);
  if (!requireSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    const body = await readJsonWithLimit(request);
    const session = await verifySession(request);
    if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const workspaceId = session.payload.workspaceId;

    // RBAC: verify or create brand within workspace
    let existing;
    if (workspaceId) {
      existing = await prisma.brandProfile.findFirst({
        where: { workspaceId },
      });
    } else {
      existing = await prisma.brandProfile.findFirst();
    }

    const brand = existing
      ? await prisma.brandProfile.update({
          where: { id: existing.id },
          data: body as any,
        })
      : await prisma.brandProfile.create({
          data: {
            ...(body as any),
            workspaceId,
          },
        });

    return NextResponse.json({ brand });
  } catch {
    return NextResponse.json({ error: "Failed to update brand profile" }, { status: 500 });
  }
}