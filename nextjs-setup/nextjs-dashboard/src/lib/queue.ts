import Redis from "ioredis";

let redis: Redis | undefined;
let versionChecked = false;
const QUEUE_TAG = "{q:publish}";
export const QUEUE_KEYS = {
  pending: `${QUEUE_TAG}:pending`,
  processing: `${QUEUE_TAG}:processing`,
  dlq: `${QUEUE_TAG}:dlq`,
  quarantine: `${QUEUE_TAG}:quarantine`,
  jobPrefix: `${QUEUE_TAG}:job:`,
} as const;
const MAX_ATTEMPTS = 5;
const DEFAULT_LEASE_MS = Math.max(1000, Number(process.env.QUEUE_LEASE_MS || 30_000));
const BACKOFF_BASE_MS = Math.max(10, Number(process.env.QUEUE_BACKOFF_BASE_MS || 1000));

export type PublishJobEvent = {
  type: "publish.requested";
  version: 1;
  jobId: string;
  workflowId: string;
  workspaceId: string;
  socialAccountId: string;
  contentRevisionId: string;
  idempotencyKey: string;
};
export type ClaimedPublishJob = { jobId: string; event: PublishJobEvent | null; generation?: number; attempt?: number };
export type QueueState = "pending" | "processing" | "dlq" | "quarantine" | "acked";

export const parseRedisMajorVersion = (info: string): number => {
  const match = info.match(/^redis_version:(\d+)\./m);
  if (!match) throw new Error("Unable to parse redis_version from Redis INFO server");
  return Number(match[1]);
};

const getRedis = (): Redis => {
  if (redis) return redis;
  const connectionString = process.env.REDIS_URL;
  if (!connectionString) throw new Error("REDIS_URL is not configured");
  redis = new Redis(connectionString, {
    lazyConnect: true, connectTimeout: 1500, enableOfflineQueue: false,
    maxRetriesPerRequest: 1, retryStrategy: () => null,
  });
  redis.on("error", () => {});
  return redis;
};

const ensureConnected = async (): Promise<void> => {
  const client = getRedis();
  if (client.status === "wait" || client.status === "close" || client.status === "end") await client.connect();
  if (!versionChecked) {
    const major = parseRedisMajorVersion(await client.info("server"));
    if (major < 7) throw new Error(`Redis 7.0+ is required for durable queue scripts; detected Redis major version ${major}. Upgrade Redis before starting the publishing worker.`);
    const config = await client.config("GET", "maxmemory-policy");
    if (config[1] !== "noeviction") throw new Error(`Durable publish queue requires maxmemory-policy noeviction; detected ${config[1] || "unknown"}.`);
    versionChecked = true;
  }
};

const jobKey = (jobId: string) => `${QUEUE_KEYS.jobPrefix}${jobId}`;
const timeMsLua = "local t=redis.call('TIME'); return (tonumber(t[1])*1000)+math.floor(tonumber(t[2])/1000)";
const ENQUEUE_LUA = `
local id=ARGV[1]; local payload=ARGV[2]
local pending=KEYS[1]; local processing=KEYS[2]; local dlq=KEYS[3]; local quarantine=KEYS[4]; local job=KEYS[5]
if redis.call('ZSCORE',pending,id) or redis.call('ZSCORE',processing,id) or redis.call('ZSCORE',dlq,id) or redis.call('ZSCORE',quarantine,id) then return 0 end
if redis.call('HGET',job,'payload') then return 0 end
local oldgen=redis.call('HGET',job,'generation'); local oldstate=redis.call('HGET',job,'state')
if oldgen and oldstate~='acked' then return 0 end
local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
if oldgen then
 redis.call('HSET',job,'payload',payload,'attempts',0,'state','pending','marker','')
else
 redis.call('HSET',job,'payload',payload,'generation',0,'attempts',0,'state','pending','marker','')
end
redis.call('ZADD',pending,now,id)
return 1
`;
const CLAIM_LUA = `
local pending=KEYS[1]; local processing=KEYS[2]; local jobPrefix=ARGV[1]; local lease=tonumber(ARGV[2]); local maxAttempts=tonumber(ARGV[3])
local ids=redis.call('ZRANGE',pending,0,0)
if #ids==0 then return {} end
local id=ids[1]; local job=jobPrefix..id
if not redis.call('HGET',job,'payload') then
 redis.call('ZREM',pending,id); redis.call('ZADD',KEYS[3],0,id); return {id,'',-1,0}
end
local attempts=tonumber(redis.call('HGET',job,'attempts') or '0')
if attempts>=maxAttempts then
 local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
 redis.call('ZREM',pending,id); redis.call('ZADD',KEYS[3],now,id); redis.call('HSET',job,'state','dlq','last_error','max attempts reached')
 return {id,'',-1,attempts}
end
local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
local gen=redis.call('HINCRBY',job,'generation',1); attempts=redis.call('HINCRBY',job,'attempts',1)
redis.call('ZREM',pending,id); redis.call('ZADD',processing,now+lease,id)
redis.call('HSET',job,'state','processing','lease_until',now+lease,'claimed_at',now,'marker','')
return {id,redis.call('HGET',job,'payload'),gen,attempts}
`;
const MARK_DISPATCH_LUA = `
local job=KEYS[1]; local processing=KEYS[2]; local id=ARGV[1]; local gen=tonumber(ARGV[2]); local marker=ARGV[3]
if tonumber(redis.call('HGET',job,'generation') or '-1')~=gen or not redis.call('ZSCORE',processing,id) or redis.call('HGET',job,'state')~='processing' then return 0 end
local existing=redis.call('HGET',job,'marker')
if existing and existing~='' then return 0 end
local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
local decoded=cjson.decode(marker); decoded.prepared_at=now; decoded.status='dispatching'; decoded.attempt=tonumber(redis.call('HGET',job,'attempts') or '0')
redis.call('HSET',job,'marker',cjson.encode(decoded), 'marker:'..gen, cjson.encode(decoded), 'dispatch_started_at',now)
return 1
`;
const ACK_LUA = `
local job=KEYS[1]; local processing=KEYS[2]; local id=ARGV[1]; local gen=tonumber(ARGV[2]); local external=ARGV[3] or ''
if tonumber(redis.call('HGET',job,'generation') or '-1')~=gen then return -1 end
if redis.call('HGET',job,'state')~='processing' then return -2 end
local marker=redis.call('HGET',job,'marker')
if marker and marker~='' then local m=cjson.decode(marker); m.status='success'; m.external_id=external; redis.call('HSET',job,'marker:'..gen,cjson.encode(m),'marker','') end
redis.call('ZREM',processing,id); redis.call('HSET',job,'state','acked','external_id',external,'acked_at',redis.call('TIME')[1])
redis.call('HDEL',job,'payload','lease_until')
return 1
`;
const RETRY_LUA = `
local job=KEYS[1]; local processing=KEYS[2]; local pending=KEYS[3]; local id=ARGV[1]; local gen=tonumber(ARGV[2]); local reason=ARGV[3]; local delay=tonumber(ARGV[4]); local maxAttempts=tonumber(ARGV[5])
if tonumber(redis.call('HGET',job,'generation') or '-1')~=gen then return -1 end
if redis.call('HGET',job,'state')~='processing' then return -2 end
local marker=redis.call('HGET',job,'marker')
if marker and marker~='' then return -3 end
local attempts=tonumber(redis.call('HGET',job,'attempts') or '0')
local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
redis.call('ZREM',processing,id); redis.call('HSET',job,'last_error',reason,'lease_until',0)
if attempts>=maxAttempts then redis.call('ZADD',KEYS[4],now,id); redis.call('HSET',job,'state','dlq'); return 2 end
redis.call('HSET',job,'state','pending'); redis.call('ZADD',pending,now+delay,id); return 1
`;
const QUARANTINE_LUA = `
local job=KEYS[1]; local processing=KEYS[2]; local quarantine=KEYS[3]; local id=ARGV[1]; local gen=tonumber(ARGV[2]); local reason=ARGV[3]
if tonumber(redis.call('HGET',job,'generation') or '-1')~=gen then return -1 end
if redis.call('HGET',job,'state')~='processing' then return -2 end
local marker=redis.call('HGET',job,'marker')
if marker and marker~='' then local m=cjson.decode(marker); m.status='quarantined'; m.reason=reason; redis.call('HSET',job,'marker',cjson.encode(m)) end
local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
if marker and marker~='' then local m=cjson.decode(marker); m.status='quarantined'; m.reason=reason; redis.call('HSET',job,'marker:'..gen,cjson.encode(m),'marker',cjson.encode(m)) end
redis.call('ZREM',processing,id); redis.call('ZADD',quarantine,now,id); redis.call('HSET',job,'state','quarantine','last_error',reason); return 1
`;

export const enqueuePublishJob = async (event: PublishJobEvent): Promise<string> => {
  await ensureConnected();
  await getRedis().eval(ENQUEUE_LUA, 5, QUEUE_KEYS.pending, QUEUE_KEYS.processing, QUEUE_KEYS.dlq, QUEUE_KEYS.quarantine, jobKey(event.jobId), event.jobId, JSON.stringify(event));
  return event.jobId;
};

export const dequeuePublishJob = async (): Promise<ClaimedPublishJob> => {
  await ensureConnected();
  const result = await getRedis().eval(CLAIM_LUA, 3, QUEUE_KEYS.pending, QUEUE_KEYS.processing, QUEUE_KEYS.dlq, QUEUE_KEYS.jobPrefix, DEFAULT_LEASE_MS, MAX_ATTEMPTS) as Array<string | number>;
  if (!result || result.length === 0) return { jobId: "", event: null };
  const [jobId, raw, generation, attempt] = result;
  if (!raw || Number(generation) < 0) return { jobId: String(jobId), event: null };
  try { return { jobId: String(jobId), event: JSON.parse(String(raw)) as PublishJobEvent, generation: Number(generation), attempt: Number(attempt) }; }
  catch { await addToDLQ(String(jobId), "corrupt payload"); return { jobId: String(jobId), event: null }; }
};

const recordFenceRejection = async (jobId: string, suppliedGen: number, operation: string, reason: string): Promise<void> => {
  const client = getRedis();
  const key = jobKey(jobId);
  const [currentGen, state] = await client.hmget(key, "generation", "state");
  await client.hincrby(`${QUEUE_TAG}:metrics`, "stale_fence_rejections", 1);
  console.error(JSON.stringify({
    event: "queue_stale_fence_rejected", job_id: jobId, supplied_gen: suppliedGen,
    current_gen: currentGen === null ? null : Number(currentGen), operation,
    queue_state: state || "missing", worker_id: process.env.WORKER_ID || "unknown",
    reason, timestamp: new Date().toISOString(),
  }));
};

export const markPublishDispatched = async (jobId: string, generation: number, contentHash: string, dispatchAttemptId: string): Promise<void> => {
  await ensureConnected();
  const marker = JSON.stringify({ job_id: jobId, generation, dispatch_attempt_id: dispatchAttemptId, content_hash: contentHash, attempt: 0, provider_result: null });
  const result = Number(await getRedis().eval(MARK_DISPATCH_LUA, 2, jobKey(jobId), QUEUE_KEYS.processing, jobId, generation, marker));
  if (result !== 1) { await recordFenceRejection(jobId, generation, "mark_dispatch", "generation_or_lease_mismatch"); throw new Error(`stale_or_invalid_dispatch_marker job_id=${jobId} supplied_gen=${generation}`); }
};
export const ackPublishJob = async (jobId: string, generation: number, externalId = ""): Promise<void> => {
  await ensureConnected();
  const result = Number(await getRedis().eval(ACK_LUA, 2, jobKey(jobId), QUEUE_KEYS.processing, jobId, generation, externalId));
  if (result !== 1) { await recordFenceRejection(jobId, generation, "ack", `fenced_result_${result}`); throw new Error(`stale_or_invalid_ack job_id=${jobId} supplied_gen=${generation} result=${result}`); }
};
export const retryPublishJob = async (jobId: string, generation: number, reason: string): Promise<void> => {
  await ensureConnected();
  const delay = Math.min(300_000, BACKOFF_BASE_MS * 2 ** Math.max(0, generation - 1));
  const result = Number(await getRedis().eval(RETRY_LUA, 4, jobKey(jobId), QUEUE_KEYS.processing, QUEUE_KEYS.pending, QUEUE_KEYS.dlq, jobId, generation, reason, delay, MAX_ATTEMPTS));
  if (result < 0) { await recordFenceRejection(jobId, generation, "retry", `fenced_result_${result}`); throw new Error(`retry_rejected job_id=${jobId} supplied_gen=${generation} result=${result}`); }
};
export const quarantinePublishJob = async (jobId: string, generation: number, reason: string): Promise<void> => {
  await ensureConnected();
  const result = Number(await getRedis().eval(QUARANTINE_LUA, 3, jobKey(jobId), QUEUE_KEYS.processing, QUEUE_KEYS.quarantine, jobId, generation, reason));
  if (result !== 1) { await recordFenceRejection(jobId, generation, "quarantine", `fenced_result_${result}`); throw new Error(`quarantine_rejected job_id=${jobId} supplied_gen=${generation} result=${result}`); }
};
const DLQ_LUA = `
local job=KEYS[1]; local pending=KEYS[2]; local processing=KEYS[3]; local dlq=KEYS[4]
local id=ARGV[1]; local reason=ARGV[2]; local expected=ARGV[3]
if expected and expected~='' then
  if tonumber(redis.call('HGET',job,'generation') or '-1')~=tonumber(expected) then return -1 end
  if redis.call('HGET',job,'state')~='processing' then return -2 end
  local marker=redis.call('HGET',job,'marker')
  if marker and marker~='' then return -3 end
end
local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000)
redis.call('ZREM',pending,id); redis.call('ZREM',processing,id); redis.call('ZADD',dlq,now,id)
redis.call('HSET',job,'state','dlq','last_error',reason); redis.call('HDEL',job,'lease_until')
return 1
`;
export const addToDLQ = async (jobId: string, reason: string, generation?: number): Promise<void> => {
  await ensureConnected();
  const result = Number(await getRedis().eval(DLQ_LUA, 4, jobKey(jobId), QUEUE_KEYS.pending, QUEUE_KEYS.processing, QUEUE_KEYS.dlq, jobId, reason, generation === undefined ? "" : String(generation)));
  if (result !== 1) throw new Error(`dlq_rejected job_id=${jobId} supplied_gen=${generation ?? "legacy"} result=${result}`);
};
export const getQueueLength = async (): Promise<number> => { await ensureConnected(); return getRedis().zcard(QUEUE_KEYS.pending); };
export const getDLQLength = async (): Promise<number> => { await ensureConnected(); return getRedis().zcard(QUEUE_KEYS.dlq); };
export const getQuarantineLength = async (): Promise<number> => { await ensureConnected(); return getRedis().zcard(QUEUE_KEYS.quarantine); };
export const getQueueStats = async (): Promise<{ pending: number; failed: number }> => ({ pending: await getQueueLength(), failed: await getDLQLength() });

export const reconcileExpiredLeases = async (limit = 100, resolvePublished?: (jobId: string) => Promise<string | null>): Promise<{ inspected: number; requeued: number; quarantined: number; deadLettered: number; acknowledged: number }> => {
  await ensureConnected();
  const bounded = Math.max(1, Math.min(100, Math.floor(limit)));
  const now = Number(await getRedis().eval(timeMsLua, 0));
  const ids = await getRedis().zrangebyscore(QUEUE_KEYS.processing, "-inf", now, "LIMIT", 0, bounded);
  const result = { inspected: 0, requeued: 0, quarantined: 0, deadLettered: 0, acknowledged: 0 };
  for (const id of ids) {
    result.inspected++;
    const job = jobKey(id);
    const state = await getRedis().hmget(job, "payload", "generation", "attempts", "marker", "state");
    const [payload, genRaw, attemptsRaw, marker, stateRaw] = state;
    if (stateRaw !== "processing" || !genRaw || !attemptsRaw) continue;
    const generation = Number(genRaw);
    if (!payload) { await getRedis().zrem(QUEUE_KEYS.processing, id); await getRedis().zadd(QUEUE_KEYS.dlq, now, id); await getRedis().hset(job, "state", "dlq", "last_error", "missing payload during lease reconciliation"); result.deadLettered++; continue; }
    if (marker) {
      let authoritativeExternalId: string | null = null;
      if (resolvePublished) {
        try { authoritativeExternalId = await resolvePublished(id); }
        catch (error) { console.error(JSON.stringify({ event: "queue_db_reconciliation_error", job_id: id, generation, message: error instanceof Error ? error.message : String(error) })); }
      }
      if (authoritativeExternalId) {
        await ackPublishJob(id, generation, authoritativeExternalId);
        result.acknowledged++;
        continue;
      }
      await quarantinePublishJob(id, generation, "lease expired after provider dispatch marker; outcome requires reconciliation");
      result.quarantined++;
      continue;
    }
    await getRedis().zrem(QUEUE_KEYS.processing, id);
    if (Number(attemptsRaw) >= MAX_ATTEMPTS) { await getRedis().zadd(QUEUE_KEYS.dlq, now, id); await getRedis().hset(job, "state", "dlq", "last_error", "attempt limit reached during lease reconciliation"); result.deadLettered++; }
    else { await getRedis().hset(job, "state", "pending", "lease_until", 0); await getRedis().zadd(QUEUE_KEYS.pending, now, id); result.requeued++; }
  }
  return result;
};

export const getQueueKeyLayout = () => ({ tag: QUEUE_TAG, keys: Object.values(QUEUE_KEYS) });

/** Close the shared Redis client during controlled shutdown and integration-test teardown. */
export const closeQueueRedisConnection = async (): Promise<void> => {
  if (!redis) return;
  const client = redis;
  redis = undefined;
  versionChecked = false;
  if (client.status === "ready" || client.status === "connect" || client.status === "connecting") {
    await client.quit();
  } else {
    client.disconnect();
  }
};
