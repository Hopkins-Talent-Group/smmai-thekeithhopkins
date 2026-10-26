import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

const WINDOW_SECONDS = 60;
const MAX_BODY_BYTES = 1024 * 1024;

const memoryBuckets = new Map<
  string,
  {
    count: number;
    resetAt: number;
  }
>();

let redis: Redis | null = null;

function redisClient() {
  const redisUrl = process.env.REDIS_URL?.trim();

  if (!redisUrl) return null;

  // Netlify can reuse a warm serverless instance after the Redis connection has
  // been closed. Never keep a terminal ioredis client around.
  if (redis && (redis.status === "end" || redis.status === "close")) {
    redis = null;
  }

  if (redis) return redis;

  redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  });

  redis.on("error", (error) => {
    console.error("[Redis] Rate limiter connection error:", error);
  });

  return redis;
}

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");

  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export type RateLimitPolicy = {
  limit: number;
  windowSeconds?: number;
  scope?: string;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  unavailable?: boolean;
};

export async function checkRateLimit(
  request: NextRequest,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const windowSeconds = policy.windowSeconds ?? WINDOW_SECONDS;
  const scope = policy.scope ?? request.nextUrl.pathname;
  const key = `smmai:rl:${scope}:${clientIp(request)}`;

  const client = redisClient();

  // Production intentionally fails closed if Redis is not configured.
  if (!client && process.env.NODE_ENV === "production") {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: 5,
      unavailable: true,
    };
  }

  if (client) {
    const consume = async (redisClient: Redis) => {
      if (redisClient.status === "wait") {
        await redisClient.connect();
      }

      const count = await redisClient.incr(key);

      if (count === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      return {
        allowed: count <= policy.limit,
        remaining: Math.max(0, policy.limit - count),
        retryAfter:
          count > policy.limit ? await redisClient.ttl(key) : 0,
      };
    };

    // Returns null when Redis is configured but could not serve the counter,
    // so the caller decides whether that is fatal (production) or should
    // degrade to the in-memory limiter (development).
    const attempt = async (): Promise<RateLimitResult | null> => {
      try {
        return await consume(client);
      } catch (error) {
        // A warm Netlify instance can retain an ioredis client after
        // the upstream Redis connection has been closed.
        console.error(
          "[Redis] Rate limiter unavailable; reconnecting:",
          error,
        );

        if (redis === client) {
          redis = null;
        }

        try {
          client.disconnect();
        } catch {
          // Ignore disconnect errors. The client is already unusable.
        }

        // Recreate the client and retry once.
        const retryClient = redisClient();

        if (!retryClient) {
          return null;
        }

        try {
          return await consume(retryClient);
        } catch (retryError) {
          console.error(
            "[Redis] Rate limiter reconnect failed:",
            retryError,
          );

          if (redis === retryClient) {
            redis = null;
          }

          try {
            retryClient.disconnect();
          } catch {
            // Ignore disconnect errors.
          }

          return null;
        }
      }
    };

    const result = await attempt();

    if (result) {
      return result;
    }

    // Redis is configured but unreachable. Production keeps failing closed;
    // development falls through to the in-memory limiter below so a missing
    // local Redis does not block every mutation.
    if (process.env.NODE_ENV === "production") {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: 5,
        unavailable: true,
      };
    }
  }

  // Development-only in-memory fallback.
  const now = Date.now();
  const current = memoryBuckets.get(key);

  if (!current || current.resetAt <= now) {
    memoryBuckets.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });

    return {
      allowed: true,
      remaining: policy.limit - 1,
      retryAfter: 0,
    };
  }

  current.count += 1;

  return {
    allowed: current.count <= policy.limit,
    remaining: Math.max(0, policy.limit - current.count),
    retryAfter: Math.ceil(
      (current.resetAt - now) / 1000,
    ),
  };
}

export function rateLimitResponse(result: RateLimitResult) {
  const status = result.unavailable ? 503 : 429;

  const message = result.unavailable
    ? "Rate limiting service unavailable"
    : "Too many requests";

  return new Response(
    JSON.stringify({
      error: message,
    }),
    {
      status,
      headers: {
        "content-type": "application/json",
        "retry-after": String(Math.max(1, result.retryAfter)),
      },
    },
  );
}

export function requireIdempotencyKey(request: NextRequest) {
  const value = request.headers
    .get("idempotency-key")
    ?.trim();

  if (
    !value ||
    value.length < 16 ||
    value.length > 128 ||
    !/^[A-Za-z0-9._:-]+$/.test(value)
  ) {
    return null;
  }

  return value;
}

export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (!origin) return true;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  // Accept the Next.js-resolved host (works locally and on most hosts).
  if (originHost === request.nextUrl.host) return true;

  // Trusted origins across all deployment environments.  Each env var covers a
  // specific stage so the same-origin gate stays strict without rejecting valid
  // same-site requests caused by reverse-proxy host mismatches on Netlify /
  // Vercel / local dev.
  //
  //   NEXT_PUBLIC_APP_URL       – primary / production origin
  //   NEXT_PUBLIC_APP_URL_LOCAL – local dev origin
  //   NEXT_PUBLIC_APP_URL_DEV   – dev / preview origin
  //   NEXT_PUBLIC_APP_URL_UAT   – UAT / staging origin
  const trustedUrls = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_APP_URL_LOCAL,
    process.env.NEXT_PUBLIC_APP_URL_DEV,
    process.env.NEXT_PUBLIC_APP_URL_UAT,
  ];

  for (const url of trustedUrls) {
    const trimmed = url?.trim();
    if (!trimmed) continue;
    try {
      if (originHost === new URL(trimmed).host) return true;
    } catch {
      // Malformed URL — skip and continue.
    }
  }

  return false;
}

export async function readJsonWithLimit<T = unknown>(
  request: NextRequest,
): Promise<T> {
  const contentLength = Number(
    request.headers.get("content-length") ?? 0,
  );

  if (contentLength > MAX_BODY_BYTES) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }

  const raw = await request.text();

  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    throw new Error("PAYLOAD_TOO_LARGE");
  }

  return JSON.parse(raw) as T;
}

export function hashSecret(value: string) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

export function setSecurityHeaders(response: NextResponse) {
  response.headers.set(
    "X-Content-Type-Options",
    "nosniff",
  );

  response.headers.set(
    "X-Frame-Options",
    "DENY",
  );

  response.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );

  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  response.headers.set(
    "Cross-Origin-Opener-Policy",
    "same-origin",
  );

  response.headers.set(
    "Cross-Origin-Resource-Policy",
    "same-origin",
  );

  return response;
}