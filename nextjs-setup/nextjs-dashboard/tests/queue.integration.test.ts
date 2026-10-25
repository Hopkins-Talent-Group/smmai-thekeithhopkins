import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { after, before, beforeEach, test } from "node:test";
import Redis from "ioredis";
import crypto from "node:crypto";
import {
  ackPublishJob, closeQueueRedisConnection, dequeuePublishJob, enqueuePublishJob, getQuarantineLength,
  getQueueKeyLayout, markPublishDispatched, QUEUE_KEYS,
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
const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

before(async () => {
  await redis.connect();
  const info = await redis.info("server");
  assert.ok(parseRedisMajorVersion(info) >= 7, "Redis 7.0+ is required");
  const policy = await redis.config("GET", "maxmemory-policy");
  assert.equal(policy[1], "noeviction", "integration Redis must use noeviction");
});

beforeEach(async () => {
  // Each invariant owns an isolated Redis database state.
  await redis.flushdb();
});

after(async () => {
  await closeQueueRedisConnection();
  await redis.quit();
});

test("redis_version_parser_rejects_pre_7", () => {
  assert.equal(parseRedisMajorVersion("# Server\nredis_version:6.2.0\n"), 6);
  assert.equal(parseRedisMajorVersion("# Server\nredis_version:7.0.0\n"), 7);
  assert.throws(() => parseRedisMajorVersion("garbage"), /Unable to parse/);
});

test("queue_keys_share_q_publish_tag", () => {
  const layout = getQueueKeyLayout();
  assert.equal(layout.tag, tag);
  assert.ok(layout.keys.length > 0);
  assert.ok(layout.keys.every((key) => key.includes(tag)), "all queue keys must carry {q:publish}");
});

test("stale_ack_rejected_and_counted", async () => {
  const id = newId("stale");
  await enqueuePublishJob(eventFor(id));
  const generation1 = await dequeuePublishJob();
  assert.equal(generation1.generation, 1);
  await ackPublishJob(id, generation1.generation!);
  await enqueuePublishJob(eventFor(id));
  const generation2 = await dequeuePublishJob();
  assert.equal(generation2.generation, 2);
  await assert.rejects(() => ackPublishJob(id, generation1.generation!, "stale-ref"), /stale_or_invalid_ack/);
  assert.equal(await redis.hget(`${tag}:metrics`, "stale_fence_rejections"), "1");
  await ackPublishJob(id, generation2.generation!);
});

test("db_success_recovers_without_republish", async () => {
  const id = newId("db-recovered");
  await enqueuePublishJob(eventFor(id));
  const claimed = await dequeuePublishJob();
  await markPublishDispatched(id, claimed.generation!, "c".repeat(64), crypto.randomUUID());
  await wait(1100);
  const evidenceLookups: string[] = [];
  const recovered = await reconcileExpiredLeases(100, async (jobId) => {
    evidenceLookups.push(jobId);
    return jobId === id ? "db-persisted-ref" : null;
  });
  assert.deepEqual(evidenceLookups, [id]);
  assert.equal(recovered.acknowledged, 1);
  assert.equal(await redis.hget(jobKey(id), "state"), "acked");
  assert.equal(await redis.hget(jobKey(id), "external_id"), "db-persisted-ref");
  assert.equal(await redis.zscore(QUEUE_KEYS.pending, id), null, "recovered success is not republished");
  assert.equal(await redis.zscore(QUEUE_KEYS.quarantine, id), null);
});

test("marker_survives_expired_lease", async () => {
  const id = newId("ambiguous");
  await enqueuePublishJob(eventFor(id));
  const claimed = await dequeuePublishJob();
  await markPublishDispatched(id, claimed.generation!, "a".repeat(64), crypto.randomUUID());
  const markerBefore = await redis.hget(jobKey(id), "marker");
  assert.ok(markerBefore, "dispatch marker is persisted before lease expiry");
  await wait(1100);
  const swept = await reconcileExpiredLeases(100);
  assert.equal(swept.quarantined, 1);
  assert.equal(await getQuarantineLength(), 1);
  const markerAfter = JSON.parse((await redis.hget(jobKey(id), "marker"))!);
  const originalMarker = JSON.parse(markerBefore);
  assert.equal(markerAfter.status, "quarantined");
  assert.equal(markerAfter.content_hash, originalMarker.content_hash, "quarantine preserves content hash evidence");
  assert.equal(markerAfter.dispatch_attempt_id, originalMarker.dispatch_attempt_id, "quarantine preserves dispatch attempt evidence");
  await assert.rejects(() => ackPublishJob(id, claimed.generation!, "stale-after-quarantine"), /stale_or_invalid_ack/);
  await enqueuePublishJob(eventFor(id));
  assert.equal(await redis.zscore(QUEUE_KEYS.pending, id), null, "quarantined IDs cannot be silently re-enqueued");
});

test("generation_survives_ack_and_reuse", async () => {
  const id = newId("generation");
  await enqueuePublishJob(eventFor(id));
  const first = await dequeuePublishJob();
  assert.equal(first.generation, 1);
  await ackPublishJob(id, first.generation!);
  assert.equal(await redis.hget(jobKey(id), "generation"), "1", "generation high-water mark survives acknowledgement");

  await enqueuePublishJob(eventFor(id));
  const second = await dequeuePublishJob();
  assert.equal(second.generation, 2);
  await markPublishDispatched(id, second.generation!, "b".repeat(64), crypto.randomUUID());
  await ackPublishJob(id, second.generation!);
  assert.equal(await redis.hget(jobKey(id), "generation"), "2");

  await enqueuePublishJob(eventFor(id));
  const third = await dequeuePublishJob();
  assert.equal(third.generation, 3, "reused job ID advances beyond acknowledged generation");
  assert.equal(JSON.parse((await redis.hget(jobKey(id), "marker:2"))!).status, "success", "generation 2 dispatch history survives acknowledgement");
  await ackPublishJob(id, third.generation!);
});

test("missing_redis_url_hard_fails", () => {
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `await import(${JSON.stringify(pathToFileURL(fileURLToPath(import.meta.url)).href)})`], {
    encoding: "utf8",
    env: { ...process.env, QUEUE_IT: "1", REDIS_URL: "" },
    timeout: 10_000,
  });
  assert.notEqual(child.status, 0, "suite must exit nonzero when REDIS_URL is absent");
  assert.match(
    child.stderr,
    /REDIS_URL is required for queue integration tests/,
    "child must fail for the missing-REDIS_URL precondition, not a broken subprocess harness",
  );
});

test("missing_legacy_payload_is_dead_lettered", async () => {
  const id = newId("missing");
  await redis.zadd(QUEUE_KEYS.pending, "0", id);
  const claimed = await dequeuePublishJob();
  assert.equal(claimed.jobId, id);
  assert.equal(claimed.event, null);
  assert.notEqual(await redis.zscore(QUEUE_KEYS.dlq, id), null);
});

test("expired_lease_sweep_is_bounded_and_idempotent", async () => {
  const ids = Array.from({ length: 105 }, (_, i) => `batch-${String(i).padStart(3, "0")}-${crypto.randomUUID()}`);
  for (const id of ids) await enqueuePublishJob(eventFor(id));
  for (const id of ids) {
    const claimed = await dequeuePublishJob();
    assert.ok(claimed.jobId);
    assert.ok(claimed.generation);
  }
  await wait(1100);
  const first = await reconcileExpiredLeases(500);
  assert.equal(first.inspected, 100);
  assert.equal(first.requeued, 100);
  const second = await reconcileExpiredLeases(500);
  assert.equal(second.inspected, 5);
  assert.equal(second.requeued, 5);
  const noOp = await reconcileExpiredLeases(500);
  assert.equal(noOp.inspected, 0);
});

test("blocking_event_loop", {
  skip: "Known limitation: blocking provider-call heartbeat is not asserted in PR1; worker_thread isolation remains an open decision.",
}, () => {
  assert.fail("intentionally skipped; see inline skip reason");
});
