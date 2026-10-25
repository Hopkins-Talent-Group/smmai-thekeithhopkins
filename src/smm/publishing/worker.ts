import { PrismaClient } from "@prisma/client";
import {
  dequeuePublishJob, getQueueStats, addToDLQ, getDLQLength,
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
  try {
    const draft = await prisma.contentDraft.findUnique({ where: { id: contentRevisionId } });
    if (!draft) {
      await addToDLQ(jobId, `Draft ${contentRevisionId} not found`);
      return;
    }
    const brandRow = await prisma.brandProfile.findFirst({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
    const brand = new BrandProfile(brandRow?.name || "Default Brand", brandRow?.audience || "", brandRow?.voice || "");
    const moderation = moderationService.validate(draft, brand);
    if (!moderation.approved) {
      await prisma.contentDraft.update({ where: { id: contentRevisionId }, data: { status: "rejected" } });
      await addToDLQ(jobId, "Moderation failed: " + moderation.reasons.join(", "));
      return;
    }
    const adapter = resolveAdapter((draft as { platform?: string }).platform ?? "");
    if (!adapter) {
      await addToDLQ(jobId, `Unsupported platform for job ${jobId}`);
      return;
    }
    const dryRun = process.env.DRY_RUN !== "false";
    if (dryRun) {
      await prisma.contentDraft.update({ where: { id: contentRevisionId }, data: { status: "approved" } });
      await ackPublishJob(jobId, generation, "dry-run");
      console.log(JSON.stringify({ event: "publish_dry_run_ack", job_id: jobId, generation, attempt }));
      return;
    }

    const contentHash = crypto.createHash("sha256").update(JSON.stringify({
      contentRevisionId,
      content: (draft as { content?: unknown }).content ?? draft,
    })).digest("hex");
    const dispatchAttemptId = crypto.randomUUID();
    await markPublishDispatched(jobId, generation, contentHash, dispatchAttemptId);
    const publishResult = await adapter.publish(draft, { dry_run: false });

    if (!publishResult.success || !publishResult.external_id) {
      // The adapter result does not prove that the provider had no side effect.
      // Preserve the marker and quarantine rather than blindly retrying.
      await quarantinePublishJob(
        jobId, generation,
        publishResult.success
          ? "provider reported success without an external ID"
          : `provider outcome not proven side-effect-free: ${publishResult.message || "unknown error"}`,
      );
      console.error(JSON.stringify({
        event: "publish_quarantined", job_id: jobId, generation, attempt,
        dispatch_attempt_id: dispatchAttemptId, reason: publishResult.message || "ambiguous provider outcome",
      }));
      return;
    }

    // Persist authoritative DB success before clearing the queue marker.
    await prisma.contentDraft.update({ where: { id: contentRevisionId }, data: { status: "published" } });
    await ackPublishJob(jobId, generation, publishResult.external_id);
    console.log(JSON.stringify({ event: "publish_acknowledged", job_id: jobId, generation, external_id: publishResult.external_id }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(JSON.stringify({ event: "publish_worker_error", job_id: jobId, generation, attempt, message }));
    // If a dispatch marker was written, this operation is fenced and will be
    // quarantined. If no marker exists, DLQ is conservative; never auto-republish.
    try { await quarantinePublishJob(jobId, generation, message); }
    catch (fenceError) { console.error(JSON.stringify({ event: "publish_fence_rejected", job_id: jobId, generation, message: fenceError instanceof Error ? fenceError.message : String(fenceError) })); }
  }
}

async function publishWorkerLoop() {
  console.log("Publish worker started");
  while (true) {
    try {
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
