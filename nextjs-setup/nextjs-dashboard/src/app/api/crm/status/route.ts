import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { verifySession } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 60, windowSeconds: 60, scope: "status:read" });
  if (!limit.allowed) return rateLimitResponse(limit);
  const session = await verifySession(request);
  if (!session.valid) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const state = await prisma.systemState.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  const settings = (state.settings ?? undefined) as unknown as Record<string, unknown> | undefined;
  const dryRun = typeof settings?.dryRun === "boolean" ? settings.dryRun : (state?.dryRun ?? process.env.DRY_RUN !== "false");
  return NextResponse.json({ automationMode: null, dbHealth: true, dryRun, workspaceId: session.payload.workspaceId });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    const session = await verifySession(request);
    if (!session.valid) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (type === "dryRun") {
      const enabled = (body as { enabled?: unknown }).enabled;
      const next = typeof enabled === "boolean" ? enabled : true;
      const current = await prisma.systemState.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton", dryRun: true },
      });
      const currentSettings = (current.settings ?? undefined) as unknown as Record<string, unknown> | undefined;
      const merged = { ...(currentSettings ?? {}), dryRun: next };
      await prisma.systemState.update({
        where: { id: "singleton" },
        data: { dryRun: next, settings: merged as Prisma.InputJsonObject },
      });
      return NextResponse.json({ ok: true, dryRun: next });
    }
    if (type === "health") {
      return NextResponse.json({ healthy: true });
    }
    if (type === "wasmRanking") {
      await prisma.systemState.upsert({
        where: { id: "singleton" },
        update: { wasmRanking: true },
        create: { id: "singleton", wasmRanking: true },
      });
      return NextResponse.json({ ranking: true });
    }

    return NextResponse.json({ error: "Failed to update system state" }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Failed to update system state" }, { status: 500 });
  }
}
