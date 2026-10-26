import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import prisma from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";
import { enqueuePublishJob } from "@/lib/queue";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const APP_SECRET = process.env.META_APP_SECRET;

function verifyMetaSignature(body: string, header: string) {
  if (!APP_SECRET || !header?.startsWith("sha256=")) return false;
  const provided = header.slice(7);
  const expected = crypto.createHmac("sha256", APP_SECRET).update(body, "utf8").digest("hex");
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));
}

function eventId(body: string) {
  return crypto.createHash("sha256").update(body, "utf8").digest("hex");
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 120, windowSeconds: 60, scope: "webhook:meta" });
  if (!limit.allowed) return rateLimitResponse(limit);

  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 1024 * 1024) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const body = JSON.parse(raw) as Record<string, unknown>;
    const signature = request.headers.get("x-hub-signature-256") || "";
    if (!verifyMetaSignature(raw, signature)) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });

    const id = eventId(raw);
    const existing = await ((prisma as any).webhookEvent as any).findUnique({ where: { platform_eventId: { platform: "meta", eventId: id } } });
    if (existing) return NextResponse.json({ status: "duplicate", eventId: id }, { status: 200 });

    const entry = Array.isArray(body.entry) ? body.entry[0] as Record<string, unknown> | undefined : undefined;
    const changes = entry && Array.isArray(entry.changes) ? entry.changes[0] as Record<string, unknown> | undefined : undefined;
    const value = changes?.value as Record<string, unknown> | undefined;

    await ((prisma as any).webhookEvent as any).create({
      data: {
        platform: "meta",
        eventId: id,
        status: typeof value?.status === "string" ? value.status : null,
        postId: typeof value?.id === "string" ? value.id : null,
        receivedAt: new Date(),
        rawPayload: raw,
      },
    });

    await enqueuePublishJob({
      type: "publish.requested",
      version: 1,
      jobId: `webhook_${id}`,
      workflowId: "meta_webhook",
      workspaceId: "ws_default",
      socialAccountId: "meta",
      contentRevisionId: typeof value?.id === "string" ? value.id : "",
      idempotencyKey: id,
    });

    return NextResponse.json({ status: "received", eventId: id }, { status: 200 });
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "PAYLOAD_TOO_LARGE";
    return NextResponse.json({ error: tooLarge ? "Payload too large" : "Failed to process webhook" }, { status: tooLarge ? 413 : 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (VERIFY_TOKEN && searchParams.get("mode") === "subscribe" && searchParams.get("token") === VERIFY_TOKEN) {
    return NextResponse.json({ challenge: searchParams.get("challenge") }, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}
