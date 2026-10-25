import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import Redis from "ioredis";
import crypto from "node:crypto";
import {
  ackPublishJob, closeQueueRedisConnection, dequeuePublishJob, enqueuePublishJob, getQuarantineLength,
  getQueueKeyLayout, getQueueLength, markPublishDispatched, QUEUE_KEYS,
  parseRedisMajorVersion, reconcileExpiredLeases, type PublishJobEvent,
} from "../src/lib/queue";

if (process.env.QUEUE_IT !== "1") throw new Error("Queue integration tests require QUEUE_IT=1; refusing to silently skip the real-Redis suite.");
if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required for queue integration tests; no in-memory fallback or skip is permitted.");

const redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
const tag = "{q:publish}";
const jobKey = (id: string) => `${tag}:job:${id}`;
const eventFor = (jobId: string): PublishJobEvent => ({
  type: "publish.requested", version: 1, jobId, workflowId: "wf-it",
  workspaceId: "ws-it", socialAccountId: "acct-it",
  contentRevisionId: "draft-it", idempotencyKey: `idem-${jobId}`,
});
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

before(async () => {
  await redis.connect();
  const info = await redis.info("server");
  assert.ok(parseRedisMajorVersion(info) >= 7, "Redis 7.0+ is required");
  const policy = await redis.config("GET", "maxmemory-policy");
  assert.equal(policy[1], "noeviction", "integration Redis must use noeviction");
  await redis.flushdb();
});
after(async () => { await closeQueueRedisConnection(); await redis.quit(); });

test("real Redis: parser, queue hash-tag contract, generation fencing, and expired-lease classification", async () => {
  assert.equal(parseRedisMajorVersion("# Server\nredis_version:7.2.4\n"), 7);
  assert.equal(parseRedisMajorVersion("# Server\nredis_version:6.2.14\n"), 6);
  assert.throws(() => parseRedisMajorVersion("not redis info"), /Unable to parse/);
  const layout = getQueueKeyLayout();
  assert.equal(layout.tag, tag);
  assert.ok(layout.keys.every((key) => key.includes(tag)), "all queue keys must carry {q:publish}");
  assert.ok(layout.keys.every((key) => key.includes(tag)), "all keys touched by queue Lua scripts share the queue hash slot");

  const safeId = `safe-${crypto.randomUUID()}`;
  await enqueuePublishJob(eventFor(safeId));
  await enqueuePublishJob(eventFor(safeId));
  assert.equal(await getQueueLength(), 1, "duplicate enqueue is guarded atomically");
  const first = await dequeuePublishJob();
  assert.equal(first.jobId, safeId);
  assert.equal(first.generation, 1);
  assert.equal(first.attempt, 1);
  assert.equal(first.event?.jobId, safeId);
  await wait(1100);
  const swept = await reconcileExpiredLeases(100);
  assert.equal(swept.requeued, 1);
  assert.equal(await redis.hget(jobKey(safeId), "attempts"), "1", "sweeper must not increment attempts");
  assert.equal(await getQueueLength(), 1);
  const second = await dequeuePublishJob();
  assert.equal(second.generation, 2);
  assert.equal(second.attempt, 2);
  await markPublishDispatched(safeId, second.generation!, "b".repeat(64), crypto.randomUUID());
  await ackPublishJob(safeId, second.generation!, "provider-ref-it");
  const history = JSON.parse((await redis.hget(jobKey(safeId), "marker:2"))!);
  assert.equal(history.status, "success");
  assert.equal(history.external_id, "provider-ref-it");
  await assert.rejects(() => ackPublishJob(safeId, first.generation!, "stale-ref"), /stale_or_invalid_ack/);
  assert.equal(await redis.hget(`${tag}:metrics`, "stale_fence_rejections"), "1", "stale rejection increments the metric counter");
  assert.equal(await redis.hget(jobKey(safeId), "generation"), "2", "generation high-water mark survives acknowledgement");

  // Reusing an acknowledged ID must preserve generation and dispatch history.
  await enqueuePublishJob(eventFor(safeId));
  const third = await dequeuePublishJob();
  assert.equal(third.generation, 3);
  assert.equal(third.attempt, 1);
  assert.equal(JSON.parse((await redis.hget(jobKey(safeId), "marker:2"))!).status, "success");
  await ackPublishJob(safeId, third.generation!);

  const ambiguousId = `ambiguous-${crypto.randomUUID()}`;
  await enqueuePublishJob(eventFor(ambiguousId));
  const ambiguous = await dequeuePublishJob();
  assert.equal(ambiguous.generation, 1);
  const hash = "a".repeat(64);
  await markPublishDispatched(ambiguousId, ambiguous.generation!, hash, crypto.randomUUID());
  const markerRaw = await redis.hget(jobKey(ambiguousId), "marker");
  assert.ok(markerRaw, "dispatch marker is durable in the job hash");
  const marker = JSON.parse(markerRaw);
  assert.equal(marker.content_hash, hash);
  assert.equal(typeof marker.prepared_at, "number");
  await wait(1100);
  const ambiguousSweep = await reconcileExpiredLeases(100);
  assert.equal(ambiguousSweep.quarantined, 1, "expired lease with marker is quarantined, never requeued");
  assert.equal(await getQuarantineLength(), 1);
  await assert.rejects(() => ackPublishJob(ambiguousId, ambiguous.generation!, "stale-after-quarantine"), /stale_or_invalid_ack/);
  assert.ok(await redis.hget(jobKey(ambiguousId), "marker"), "quarantine retains dispatch evidence");
  await enqueuePublishJob(eventFor(ambiguousId));
  assert.equal(await redis.zscore(QUEUE_KEYS.pending, ambiguousId), null, "quarantined IDs cannot be silently re-enqueued");

  // A persisted DB success plus external ID resolves an expired marker by
  // fenced acknowledgement; the provider is not called again.
  const recoveredId = "db-recovered-" + crypto.randomUUID();
  await enqueuePublishJob(eventFor(recoveredId));
  const recoveredClaim = await dequeuePublishJob();
  await markPublishDispatched(recoveredId, recoveredClaim.generation!, "c".repeat(64), crypto.randomUUID());
  await wait(1100);
  const recovered = await reconcileExpiredLeases(100, async (id) => id === recoveredId ? "db-persisted-ref" : null);
  assert.equal(recovered.acknowledged, 1);
  assert.equal(await redis.hget(jobKey(recoveredId), "state"), "acked");
  assert.equal(await redis.hget(jobKey(recoveredId), "external_id"), "db-persisted-ref");
  assert.equal(await redis.zscore(QUEUE_KEYS.quarantine, recoveredId), null);

  // Missing legacy payload is classified into DLQ rather than silently lost.
  const missingId = `missing-${crypto.randomUUID()}`;
  await redis.zadd(QUEUE_KEYS.pending, "0", missingId);
  const missing = await dequeuePublishJob();
  assert.equal(missing.jobId, missingId);
  assert.equal(missing.event, null);
  assert.notEqual(await redis.zscore(QUEUE_KEYS.dlq, missingId), null);

  // A 500-job sweep request is clamped to 100 per pass and remains idempotent.
  const batchIds = Array.from({ length: 105 }, (_, i) => `batch-${String(i).padStart(3, "0")}-${crypto.randomUUID()}`);
  for (const id of batchIds) await enqueuePublishJob(eventFor(id));
  for (const id of batchIds) {
    const claimed = await dequeuePublishJob();
    assert.equal(claimed.jobId, id);
    assert.ok(claimed.generation);
  }
  await wait(1100);
  const firstBatch = await reconcileExpiredLeases(500);
  assert.equal(firstBatch.inspected, 100);
  assert.equal(firstBatch.requeued, 100);
  const secondBatch = await reconcileExpiredLeases(500);
  assert.equal(secondBatch.inspected, 5);
  assert.equal(secondBatch.requeued, 5);
  const noOpBatch = await reconcileExpiredLeases(500);
  assert.equal(noOpBatch.inspected, 0);
});

test("blocking-event-loop heartbeat / worker_thread follow-up", {
  skip: "Known limitation: blocking provider-call heartbeat is not asserted in PR1; worker_thread isolation remains an open decision.",
}, () => {
  assert.fail("intentionally skipped; see inline skip reason");
});
