import Redis from "ioredis";

let redis: Redis | undefined;

/**
 * Server-only Redis accessor shared by queue consumers (routes/worker tooling).
 *
 * Configured to fail fast rather than buffer commands when Redis is
 * unreachable: `enableOfflineQueue: false` rejects commands issued before a
 * connection exists, and `retryStrategy: () => null` stops reconnecting after
 * the first failure so callers degrade immediately instead of hanging for the
 * default 20s command timeout.
 */
export const getRedisQueue = (): Redis | null => {
  if (redis) return redis;
  const connectionString = process.env.REDIS_URL;
  if (!connectionString) return null;
  redis = new Redis(connectionString, {
    lazyConnect: true,
    connectTimeout: 1500,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  redis.on("error", () => {
    // Connection failures are surfaced to callers through rejected commands;
    // swallow here so an unreachable Redis never becomes an unhandled error.
  });
  return redis;
};

/**
 * Run a Redis command with a hard timeout, returning `fallback` when Redis is
 * unset, unreachable, or slow. Keeps queue-dependent routes responsive so a
 * missing local Redis degrades the payload instead of hanging the request.
 */
export async function withQueue<T>(
  run: (client: Redis) => Promise<T>,
  fallback: T,
  timeoutMs = 2000,
): Promise<T> {
  const client = getRedisQueue();
  if (!client) return fallback;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (client.status === "wait" || client.status === "close" || client.status === "end") {
      await client.connect();
    }
    const result = await Promise.race([
      run(client),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Redis command timed out")), timeoutMs);
      }),
    ]);
    return result;
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
