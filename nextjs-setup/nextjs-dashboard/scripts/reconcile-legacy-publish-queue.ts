import Redis from "ioredis";
import { enqueuePublishJob, type PublishJobEvent, QUEUE_KEYS } from "../src/lib/queue";

const LEGACY_PENDING = "smmai:queue:publish";
const LEGACY_PAYLOAD_PREFIX = `${LEGACY_PENDING}:`;
const APPLY = process.argv.includes("--apply");
const REQUEUE_ORPHANS = process.argv.includes("--requeue-orphans");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = Math.max(1, Math.min(500, Number(LIMIT_ARG?.split("=")[1] || 100)));

function isPublishEvent(value: unknown): value is PublishJobEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return event.type === "publish.requested" && event.version === 1 &&
    ["jobId", "workflowId", "workspaceId", "socialAccountId", "contentRevisionId", "idempotencyKey"]
      .every((key) => typeof event[key] === "string" && (event[key] as string).length > 0);
}

async function main() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required; refusing to inspect an implicit/default Redis instance.");
  const redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
  redis.on("error", () => {});
  try {
    await redis.connect();
    const versionInfo = await redis.info("server");
    const major = Number(versionInfo.match(/^redis_version:(\d+)\./m)?.[1] || 0);
    if (major < 7) throw new Error(`Redis 7.0+ required, found major version ${major || "unknown"}`);
    const policy = await redis.config("GET", "maxmemory-policy");
    if (policy[1] !== "noeviction") throw new Error(`maxmemory-policy noeviction required, found ${policy[1] || "unknown"}`);

    const pendingIds = await redis.zrange(LEGACY_PENDING, "0", String(LIMIT - 1));
    const pendingSet = new Set(pendingIds);
    const candidates = new Set(pendingIds);
    let cursor = "0";
    let scanned = 0;
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", `${LEGACY_PAYLOAD_PREFIX}*`, "COUNT", "100");
      cursor = next;
      for (const key of keys) {
        const id = key.slice(LEGACY_PAYLOAD_PREFIX.length);
        if (id && candidates.size < LIMIT) candidates.add(id);
      }
      scanned += keys.length;
    } while (cursor !== "0" && candidates.size < LIMIT);

    const report: Array<Record<string, unknown>> = [];
    for (const id of candidates) {
      const legacyKey = LEGACY_PAYLOAD_PREFIX + id;
      const raw = await redis.get(legacyKey);
      if (!raw) {
        report.push({ job_id: id, classification: "missing_legacy_payload", action: "manual_review" });
        continue;
      }
      let event: unknown;
      try { event = JSON.parse(raw); } catch {
        report.push({ job_id: id, classification: "corrupt_legacy_payload", action: "manual_review" });
        continue;
      }
      if (!isPublishEvent(event) || event.jobId !== id) {
        report.push({ job_id: id, classification: "invalid_or_mismatched_payload", action: "manual_review" });
        continue;
      }
      if (!pendingSet.has(id)) {
        const classification = "legacy_orphan_payload";
        if (!APPLY || !REQUEUE_ORPHANS) {
          report.push({ job_id: id, classification, action: "report_only; requires --apply --requeue-orphans and duplicate-risk review" });
          continue;
        }
      }
      if (!APPLY) {
        report.push({ job_id: id, classification: pendingSet.has(id) ? "legacy_pending" : "legacy_orphan_payload", action: "dry_run_would_enqueue" });
        continue;
      }
      // New enqueue is guarded atomically against pending, processing, DLQ,
      // quarantine and an existing payload. Keep legacy evidence until verified.
      await enqueuePublishJob(event);
      const newPayload = await redis.hget(`${QUEUE_KEYS.jobPrefix}${id}`, "payload");
      const state = await redis.hget(`${QUEUE_KEYS.jobPrefix}${id}`, "state");
      if (newPayload !== raw || state !== "pending") {
        report.push({ job_id: id, classification: "new_queue_conflict", action: "legacy_evidence_retained" });
        continue;
      }
      await redis.zrem(LEGACY_PENDING, id);
      await redis.del(legacyKey);
      report.push({ job_id: id, classification: pendingSet.has(id) ? "legacy_pending" : "legacy_orphan_payload", action: "migrated" });
    }
    console.log(JSON.stringify({
      mode: APPLY ? "apply" : "dry-run",
      orphanRequeueEnabled: APPLY && REQUEUE_ORPHANS,
      limit: LIMIT, legacyPendingCount: pendingIds.length, legacyPayloadKeysScanned: scanned,
      result: report,
    }, null, 2));
    if (report.some((row) => ["corrupt_legacy_payload", "invalid_or_mismatched_payload", "new_queue_conflict"].includes(String(row.classification)))) {
      process.exitCode = 2;
    }
  } finally {
    await redis.quit();
  }
}

main().catch((error) => {
  console.error("Legacy publish queue reconciliation failed:", error);
  process.exitCode = 1;
});
