import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import type { Platform, Prisma } from "@/generated/prisma/client";
import { verifySession } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";
import { clientIpHash, requestIdFromHeaders, writeAuditEvent } from "@/lib/audit";
import { encryptSecret } from "@/lib/secrets";
import { normalizePlatform } from "@/lib/platforms";

/**
 * Phase 2 provider integration helpers.
 *
 * Implements the OAuth account lifecycle from
 * docs/architecture/phase2-integration-contract.md without coupling routes
 * to provider SDKs: encrypted credential storage, single-use workspace-bound
 * state, capability discovery persistence, and disconnect semantics that
 * invalidate queued work for the revoked account.
 */

export const PHASE2_PROVIDERS = ["linkedin", "x"] as const;
export type Phase2Provider = (typeof PHASE2_PROVIDERS)[number];

const CONNECTABLE_PLATFORMS = ["meta", "facebook", "instagram", "linkedin", "x"] as const;

function oauthStateSecret() {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret) throw new Error("OAUTH_STATE_SECRET is required for provider OAuth");
  return secret;
}

function statePayload(state: string) {
  const [body, signature] = state.split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", oauthStateSecret()).update(body).digest("base64url");
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      workspaceId: string;
      userId: string;
      platform: string;
      nonce: string;
      issuedAt: number;
    };
  } catch {
    return null;
  }
}

export function createOAuthState(input: { workspaceId: string; userId: string; platform: string }) {
  const body = Buffer.from(
    JSON.stringify({ ...input, nonce: crypto.randomBytes(16).toString("hex"), issuedAt: Date.now() }),
    "utf8",
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", oauthStateSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function consumeOAuthState(state: string, workspaceId: string, maxAgeMs = 10 * 60 * 1000) {
  const payload = statePayload(state);
  if (!payload) return { ok: false as const, error: "OAuth state mismatch" };
  if (payload.workspaceId !== workspaceId) return { ok: false as const, error: "OAuth state workspace mismatch" };
  if (Date.now() - payload.issuedAt > maxAgeMs) return { ok: false as const, error: "OAuth state expired" };
  return { ok: true as const, payload };
}

export function resolveProvider(raw: string | undefined | null) {
  if (!raw) return null;
  try {
    const platform = normalizePlatform(raw);
    if (!(CONNECTABLE_PLATFORMS as readonly string[]).includes(platform)) return null;
    return platform;
  } catch {
    return null;
  }
}

export function providerConnectConfig(platform: string) {
  switch (platform) {
    case "linkedin":
      return {
        authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
        tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
        clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
        scopes: (process.env.LINKEDIN_SCOPES ?? "openid profile w_member_social").split(" ").filter(Boolean),
        supportsRefresh: true,
      };
    case "x":
      return {
        authorizeUrl: "https://twitter.com/i/oauth2/authorize",
        tokenUrl: "https://api.x.com/2/oauth2/token",
        clientId: process.env.X_CLIENT_ID ?? "",
        clientSecret: process.env.X_CLIENT_SECRET ?? "",
        scopes: (process.env.X_SCOPES ?? "tweet.read tweet.write users.read offline.access").split(" ").filter(Boolean),
        supportsRefresh: true,
      };
    case "meta":
    case "facebook":
    case "instagram":
      return {
        authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
        tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
        clientId: process.env.META_APP_ID ?? "",
        clientSecret: process.env.META_APP_SECRET ?? "",
        scopes: (process.env.META_SCOPES ?? "pages_manage_posts pages_read_engagement instagram_basic").split(" ").filter(Boolean),
        supportsRefresh: false,
      };
    default:
      return null;
  }
}


export async function persistConnection(input: {
  workspaceId: string;
  platform: string;
  externalAccountId: string;
  accountHandle: string;
  scopes: string[];
  accessToken: string;
  refreshToken?: string | null;
  expiresInSeconds?: number | null;
  capabilities?: Record<string, unknown>;
}) {
  const data: Prisma.IntegrationConnectionUncheckedCreateInput = {
    workspaceId: input.workspaceId,
    platform: input.platform.toUpperCase() as Platform,
    status: "CONNECTED",
    scopes: input.scopes,
    accessTokenCiphertext: encryptSecret(input.accessToken),
    refreshTokenCiphertext: input.refreshToken ? encryptSecret(input.refreshToken) : null,
    tokenExpiresAt: input.expiresInSeconds ? new Date(Date.now() + input.expiresInSeconds * 1000) : null,
    externalAccountId: input.externalAccountId,
    metadata: {
      accountHandle: input.accountHandle,
      capabilities: (input.capabilities ?? {}) as Prisma.InputJsonObject,
      connectedAt: new Date().toISOString(),
    },
    lastSyncedAt: new Date(),
    lastErrorAt: null,
  };
  const existing = await prisma.integrationConnection.findFirst({
    where: { workspaceId: input.workspaceId, platform: data.platform, externalAccountId: input.externalAccountId },
  });
  if (existing) {
    return prisma.integrationConnection.update({ where: { id: existing.id }, data });
  }
  return prisma.integrationConnection.create({ data });
}

export async function exchangeAuthorizationCode(input: { tokenUrl: string; clientId: string; clientSecret: string; code: string; redirectUri: string; codeVerifier?: string }) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
  });
  if (input.codeVerifier) body.set("code_verifier", input.codeVerifier);
  else body.set("client_secret", input.clientSecret);
  const res = await fetch(input.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: body.toString(),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = typeof data.error_description === "string" ? data.error_description : typeof data.error === "string" ? data.error : `Token exchange failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

interface ConnectionRow {
  id: string;
  platform: unknown;
  status: string;
  scopes: string[] | null;
  externalAccountId: string | null;
  tokenExpiresAt: Date | null;
  lastSyncedAt: Date | null;
  lastErrorAt: Date | null;
  updatedAt: Date | null;
  metadata: unknown;
}

export function publicConnectionShape(row: ConnectionRow) {
  const metadata = (row.metadata ?? {}) as Record<string, unknown> & { accountHandle?: string };
  const capabilities = (metadata.capabilities ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    platform: String(row.platform ?? "").toLowerCase(),
    status: row.status,
    scopes: row.scopes ?? [],
    externalAccountId: row.externalAccountId ?? null,
    accountHandle: metadata.accountHandle ?? null,
    capabilities,
    tokenExpiresAt: row.tokenExpiresAt ?? null,
    tokenExpired: row.tokenExpiresAt ? new Date(row.tokenExpiresAt).getTime() <= Date.now() : false,
    lastSyncedAt: row.lastSyncedAt ?? null,
    lastErrorAt: row.lastErrorAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}

export async function auditIntegrationEvent(
  request: NextRequest,
  session: { payload: { workspaceId: string; userId: string } },
  action: "account.connected" | "account.disconnected" | "account.refresh_failed",
  platform: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
) {
  await writeAuditEvent({
    workspaceId: session.payload.workspaceId,
    actorUserId: session.payload.userId,
    action,
    resourceType: "integration",
    resourceId: resourceId ?? platform,
    requestId: requestIdFromHeaders(request),
    ipHash: clientIpHash(request),
    metadata: { platform, ...(metadata ?? {}) },
  });
}

export function providerErrorResponse(error: unknown, fallback = "Provider request failed") {
  const message = error instanceof Error ? error.message : fallback;
  const lowered = message.toLowerCase();
  if (lowered.includes("workspace mismatch") || lowered.includes("state mismatch")) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (lowered.includes("expired")) return NextResponse.json({ error: message }, { status: 400 });
  if (lowered.includes("unauthorized") || lowered.includes("invalid_client")) {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  if (lowered.includes("forbidden") || lowered.includes("scope")) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  if (lowered.includes("rate") || lowered.includes("429")) {
    return NextResponse.json({ error: message }, { status: 429 });
  }
  return NextResponse.json({ error: message }, { status: 502 });
}

export async function guardIntegrationRoute(request: NextRequest, providerParam: string | undefined | null) {
  const limit = await checkRateLimit(request, { limit: 20, windowSeconds: 60, scope: "integrations:write" });
  if (!limit.allowed) return { error: rateLimitResponse(limit) as NextResponse };
  const session = await verifySession(request);
  if (!session.valid) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const platform = resolveProvider(providerParam);
  if (!platform) return { error: NextResponse.json({ error: "Unsupported provider" }, { status: 404 }) };
  return { session, platform };
}
