import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";
import { clientIpHash, requestIdFromHeaders, writeAuditEvent } from "@/lib/audit";
import { getRedisQueue } from "@/lib/queue-server";

/**
 * Phase 2 LinkedIn/X webhook ingestion.
 * POST /api/webhooks/{linkedin|x}
 * Verifies the provider signature (or shared verification token), deduplicates
 * deliveries via WebhookEvent, normalizes the event, and emits audit + queue
 * handoff records. Unknown/signless deliveries are rejected, never stored.
 */

const SIGNATURE_HEADERS: Record<string, string[]> = {
  linkedin: ["x-linkedin-signature", "x-hub-signature-256"],
  x: ["x-twitter-signature", "x-hub-signature-256"],
};

function expectedSignature(secret: string, raw: string) {
  return crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex");
}

function verifySignature(platform: string, raw: string, request: NextRequest) {
  const secret =
    platform === "linkedin" ? process.env.LINKEDIN_WEBHOOK_SECRET : process.env.X_WEBHOOK_SECRET;
  const headers = SIGNATURE_HEADERS[platform] ?? [];
  const provided = headers.map((name) => request.headers.get(name) ?? "").find(Boolean) ?? "";
  // Providers that use a shared verification token instead of HMAC.
  const token =
    platform === "linkedin" ? process.env.LINKEDIN_VERIFY_TOKEN : process.env.X_VERIFY_TOKEN;
  if (token && provided && provided === token) return true;
  if (!secret || !provided) return false;
  const value = provided.startsWith("sha256=") ? provided.slice("sha256=".length) : provided;
  const expected = expectedSignature(secret, raw);
  if (value.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(value, "utf8"), Buffer.from(expected, "utf8"));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const provider = platform.toLowerCase();
  if (provider !== "linkedin" && provider !== "x") {
    return NextResponse.json({ error: "Unsupported webhook provider" }, { status: 404 });
  }

  const limit = await checkRateLimit(request, { limit: 120, windowSeconds: 60, scope: `webhook:${provider}` });
  if (!limit.allowed) return rateLimitResponse(limit);

  const requestId = requestIdFromHeaders(request);
  const clientIp = clientIpHash(request);
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 1024 * 1024) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    if (!verifySignature(provider, raw, request)) {
      await writeAuditEvent({
        action: "webhook.rejected",
        resourceType: "webhook",
        resourceId: provider,
        requestId,
        ipHash: clientIp,
        metadata: { platform: provider, reason: "invalid signature" },
      });
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const body = JSON.parse(raw) as Record<string, unknown>;
    const eventId =
      typeof body.id === "string"
        ? body.id
        : typeof body.event_id === "string"
          ? body.event_id
          : crypto.createHash("sha256").update(raw, "utf8").digest("hex");
    const existing = await prisma.webhookEvent.findUnique({
      where: { platform_eventId: { platform: provider, eventId } },
    });
    if (existing) return NextResponse.json({ status: "duplicate", eventId }, { status: 200 });

    const status = typeof body.status === "string" ? body.status : typeof body.type === "string" ? body.type : null;
    const postId =
      typeof body.post_id === "string"
        ? body.post_id
        : typeof (body.data as Record<string, unknown> | undefined)?.id === "string"
          ? String((body.data as Record<string, unknown>).id)
          : null;
    await prisma.webhookEvent.create({
      data: { platform: provider, eventId, status, postId, receivedAt: new Date(), rawPayload: raw },
    });

    await writeAuditEvent({
      action: "webhook.received",
      resourceType: "webhook",
      resourceId: eventId,
      requestId,
      ipHash: clientIp,
      metadata: { platform: provider, status, postId },
    });

    const queue = getRedisQueue();
    if (queue && postId) {
      try {
        const jobId = `webhook_${provider}_${eventId}`;
        await queue.set(
          `smmai:queue:publish:${jobId}`,
          JSON.stringify({ type: "webhook.received", version: 1, jobId, platform: provider, postId, eventId }),
          "EX",
          604800,
        );
        await queue.zadd("smmai:queue:publish", Date.now(), jobId);
      } catch {
        // Queue unavailable — the persisted WebhookEvent is the source of truth.
      }
    }

    return NextResponse.json({ status: "received", eventId }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
