// Health check endpoint per vercel-fix-v4.md requirements
// Provides liveness, readiness, and integration health checks

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const check = searchParams.get("check");

  // Liveness check - is the process running?
  const liveness = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  // Readiness check - can the service reach dependencies?
  let readiness = { status: "unhealthy", checks: {} };
  try {
    await prisma.$queryRaw`SELECT 1`;
    readiness = {
      status: "ok",
      checks: { db: { status: "ok", detailed: "PostgreSQL connected" } },
    };
  } catch (error) {
    readiness = {
      status: "unhealthy",
      checks: { db: { status: "unhealthy", detailed: String(error) } },
    };
  }

  // Integration health - check webhook events table
  let integration = { status: "unhealthy", checks: {} };
  try {
    // Use raw query to avoid type issues with webhookEvent model
    await prisma.$queryRaw`SELECT 1 FROM "WebhookEvent" LIMIT 1`;
    integration = {
      status: "ok",
      checks: { webhookEvent: { status: "ok", detailed: "Webhook events table accessible" } },
    };
  } catch (error) {
    integration = {
      status: "unhealthy",
      checks: { webhookEvent: { status: "unhealthy", detailed: String(error) } },
    };
  }

  // Determine overall status
  const overall = readiness.status === "ok" && integration.status === "ok"
    ? "healthy"
    : "unhealthy";

  return NextResponse.json({
    liveness,
    readiness,
    integration,
    overall,
  });
}