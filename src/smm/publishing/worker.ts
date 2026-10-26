import { PrismaClient } from "@prisma/client";
import {
  dequeuePublishJob, getQueueStats, addToDLQ, getDLQLength, reconcileExpiredLeases,
  markPublishDispatched, ackPublishJob, quarantinePublishJob,
} from "@/lib/queue";
import { MetaAdapter, LinkedInAdapter, TwitterAdapter } from "@/integrations/adapters";
import { ModerationService } from "@/moderation/policy";
import { BrandProfile } from "@/domain/models";
import crypto from "crypto";

const prisma = new PrismaClient({
  log: process.env.NODE_ENV !== "production" ? ["query", "error", "warn"] : ["error"],
});
const moderationService = new ModerationService();
const adapters = {
  meta: new MetaAdapter(),
  linkedin: new LinkedInAdapter(),
  x: new TwitterAdapter(),
  twitter: new TwitterAdapter(),
} as const;
type ProviderKey = keyof typeof adapters;
function resolveAdapter(platform: string) {
  const key = platform.trim().toLowerCase();
  const canonical = (key === "twitter" ? "x" : key) as ProviderKey;
  return adapters[canonical] ?? null;
}

async function processPublishJob(
  claimed: Awaited<ReturnType<typeof dequeuePublishJob>>
): Promise<void> {
  const { jobId, event, generation, attempt } = claimed;
  if (!event || generation === undefined) return;
  const { workspaceId, contentRevisionId } = event;
  let dispatchAttemptId: string | undefined;
  let dispatchStarted = false;
  let dbSuccessPersisted = false;
  let persistedExternalId: string | undefined;
  try {
    const draft = await prisma.contentDraft.findUnique({ where: { id: contentRevisionId } });
    if (!draft) {
      const reason = `Draft ${contentRevisionId} not found`;
      await prisma.publishJob.update({ where: { id: jobId }, data: { status: "FAILED", error: reason, completedAt: new Date() } });
      await addToDLQ(jobId, reason, generation);
      return;
    }
    const brandRow = await prisma.brandProfile.findFirst({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
    const brand = new BrandProfile(brandRow?.name || "Default Brand", brandRow?.audience || "", brandRow?.voice || "");
    const moderation = moderationService.validate(draft, brand);
    if (!moderation.approved) {
      const reason = "Moderation failed: " + moderation.reasons.join(", ");
      await prisma.$transaction([
        prisma.contentDraft.update({ where: { id: contentRevisionId }, data: { status: "rejected" } }),
        prisma.publishJob.update({ where: { id: jobId }, data: { status: "FAILED", error: reason, completedAt: new Date() } }),
      ]);
      await addToDLQ(jobId, reason, generation);
      return;
    }
    const adapter = resolveAdapter((draft as { platform?: string }).platform ?? "");
    if (!adapter) {
      const reason = `Unsupported platform for job ${jobId}`;
      await prisma.publishJob.update({ where: { id: jobId }, data: { status: "FAILED", error: reason, completedAt: new Date() } });
      await addToDLQ(jobId, reason, generation);
      return;
    }
    const dryRun = process.env.DRY_RUN !== "false";
    if (dryRun) {
      await prisma.$transaction([
        prisma.publishJob.update({ where: { id: jobId }, data: { status: "CANCELLED", error: "dry-run: publish not sent", completedAt: new Date() } }),
        prisma.contentDraft.update({ where: { id: contentRevisionId }, data: { status: "approved" } }),
      ]);
      await ackPublishJob(jobId, generation, "dry-run");
      console.log(JSON.stringify({ event: "publish_dry_run_ack", job_id: jobId, generation, attempt }));
      return;
    }

    const contentHash = crypto.createHash("sha256").update(JSON.stringify({
      contentRevisionId,
      content: (draft as { content?: unknown }).content ?? draft,
    })).digest("hex");
    dispatchAttemptId = crypto.randomUUID();
    await markPublishDispatched(jobId, generation, contentHash, dispatchAttemptId);
    dispatchStarted = true;
    await prisma.publishJob.update({ where: { id: jobId }, data: { status: "RUNNING", error: null } });
    const publishResult = await adapter.publish(draft, { dry_run: false });

    if (!publishResult.success || !publishResult.external_id) {
      // The adapter result does not prove that the provider had no side effect.
      // Preserve the marker and quarantine rather than blindly retrying.
      const quarantineReason = publishResult.success
        ? "provider reported success without an external ID"
        : "provider outcome not proven side-effect-free: " + (publishResult.message || "unknown error");
      await prisma.publishJob.update({ where: { id: jobId }, data: { status: "RUNNING", error: "QUARANTINED: " + quarantineReason } });
      await quarantinePublishJob(jobId, generation, quarantineReason);
      console.error(JSON.stringify({
        event: "publish_quarantined", job_id: jobId, generation, attempt,
        dispatch_attempt_id: dispatchAttemptId, reason: publishResult.message || "ambiguous provider outcome",
      }));
      return;
    }

    // Persist the authoritative external ID and draft status atomically before
    // clearing the queue marker. The DB is the recovery source if ack fails.
    persistedExternalId = publishResult.external_id;
    await prisma.$transaction([
      prisma.publishJob.update({
        where: { id: jobId },
        data: { status: "SUCCEEDED", externalPostId: publishResult.external_id, completedAt: new Date(), error: null },
      }),
      prisma.contentDraft.update({ where: { id: contentRevisionId }, data: { status: "published", publishedAt: new Date() } }),
    ]);
    dbSuccessPersisted = true;
    await ackPublishJob(jobId, generation, publishResult.external_id);
    console.log(JSON.stringify({ event: "publish_acknowledged", job_id: jobId, generation, external_id: publishResult.external_id }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(JSON.stringify({ event: "publish_worker_error", job_id: jobId, generation, attempt, message }));
    if (dbSuccessPersisted && persistedExternalId) {
      // A DB success is authoritative. Retry only the fenced acknowledgement;
      // never call the provider again or downgrade the persisted success.
      try { await ackPublishJob(jobId, generation, persistedExternalId); }
      catch (ackError) {
        console.error(JSON.stringify({ event: "publish_db_success_ack_pending_reconciliation", job_id: jobId, generation, external_id: persistedExternalId, message: ackError instanceof Error ? ackError.message : String(ackError) }));
      }
      return;
    }
    if (dispatchStarted) {
      try {
        await prisma.publishJob.update({ where: { id: jobId }, data: { status: "RUNNING", error: "QUARANTINED: " + message } });
      } catch (dbError) {
        console.error(JSON.stringify({ event: "publish_quarantine_db_update_failed", job_id: jobId, generation, message: dbError instanceof Error ? dbError.message : String(dbError) }));
      }
      try { await quarantinePublishJob(jobId, generation, message); }
      catch (fenceError) { console.error(JSON.stringify({ event: "publish_fence_rejected", job_id: jobId, generation, message: fenceError instanceof Error ? fenceError.message : String(fenceError) })); }
    } else {
      try {
        await addToDLQ(jobId, message, generation);
        await prisma.publishJob.update({ where: { id: jobId }, data: { status: "FAILED", error: message, completedAt: new Date() } });
      } catch (dlqError) {
        console.error(JSON.stringify({ event: "publish_dlq_rejected", job_id: jobId, generation, message: dlqError instanceof Error ? dlqError.message : String(dlqError) }));
      }
    }
  }
}

async function publishWorkerLoop() {
  console.log("Publish worker started");
  while (true) {
    try {
      await reconcileExpiredLeases(100, async (jobId) => {
        const persisted = await prisma.publishJob.findUnique({
          where: { id: jobId },
          select: { status: true, externalPostId: true },
        });
        return persisted?.status === "SUCCEEDED" && persisted.externalPostId
          ? persisted.externalPostId
          : null;
      });
      const claimed = await dequeuePublishJob();
      if (claimed.event) await processPublishJob(claimed);
      else await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("Publish worker loop error:", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
void getQueueStats;
void getDLQLength;
publishWorkerLoop().catch((err) => {
  console.error("Fatal publish worker error:", err);
  process.exit(1);
});
export {};
