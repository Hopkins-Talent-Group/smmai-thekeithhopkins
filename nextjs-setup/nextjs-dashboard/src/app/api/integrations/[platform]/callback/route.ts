import { NextResponse, type NextRequest } from "next/server";
import {
  auditIntegrationEvent,
  consumeOAuthState,
  exchangeAuthorizationCode,
  guardIntegrationRoute,
  persistConnection,
  providerConnectConfig,
  providerErrorResponse,
} from "@/lib/integrations";

function dashboardUrl(request: NextRequest, params: URLSearchParams) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  return `${appUrl}/dashboard?section=accounts&${params.toString()}`;
}

function redirectResult(request: NextRequest, params: URLSearchParams) {
  return NextResponse.redirect(dashboardUrl(request, params), { status: 302 });
}

function normalizeTokenResponse(data: Record<string, unknown>) {
  const accessToken = typeof data.access_token === "string" ? data.access_token : "";
  const refreshToken = typeof data.refresh_token === "string" ? data.refresh_token : null;
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : null;
  const accountId =
    typeof data.account_id === "string"
      ? data.account_id
      : typeof (data.user as Record<string, unknown> | undefined)?.id === "string"
        ? String((data.user as Record<string, unknown>).id)
        : typeof data.member_id === "string"
          ? data.member_id
          : `oauth_${Date.now()}`;
  const handle =
    typeof data.account_handle === "string"
      ? data.account_handle
      : typeof data.screen_name === "string"
        ? data.screen_name
        : accountId;
  if (!accessToken) throw new Error("Provider did not return an access token");
  return { accessToken, refreshToken, expiresIn, accountId, handle };
}

/**
 * Phase 2 OAuth callback.
 * GET /api/integrations/{platform}/callback?code=&state=
 * Verifies single-use workspace-bound state, performs the server-side code
 * exchange, encrypts tokens at rest, and persists normalized metadata.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const fail = (error: string) => redirectResult(request, new URLSearchParams({ oauth: "error", error }));
  try {
    const { platform } = await params;
    const guard = await guardIntegrationRoute(request, platform);
    if ("error" in guard) return guard.error;
    const { session, platform: provider } = guard;

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code") ?? "";
    const state = searchParams.get("state") ?? "";
    if (searchParams.get("error")) return fail(String(searchParams.get("error_description") ?? searchParams.get("error")));
    if (!code || !state) return fail("Missing OAuth code or state");

    const consumed = consumeOAuthState(state, session.payload.workspaceId);
    if (!consumed.ok) return fail(consumed.error);
    if (consumed.payload.platform !== provider) return fail("OAuth state platform mismatch");

    const config = providerConnectConfig(provider);
    if (!config || !config.clientId || !config.clientSecret) {
      return fail(`${provider} OAuth is not configured`);
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
    const redirectUri = `${appUrl}/api/integrations/${provider}/callback`;
    const tokens = await exchangeAuthorizationCode({
      tokenUrl: config.tokenUrl,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      code,
      redirectUri,
    });
    const normalized = normalizeTokenResponse(tokens as Record<string, unknown>);

    const connection = await persistConnection({
      workspaceId: session.payload.workspaceId,
      platform: provider,
      externalAccountId: normalized.accountId,
      accountHandle: normalized.handle,
      scopes: config.scopes,
      accessToken: normalized.accessToken,
      refreshToken: normalized.refreshToken,
      expiresInSeconds: normalized.expiresIn,
      capabilities: { platform: provider, publish: true, media: true, scheduling: true, analytics: true, webhooks: true },
    });

    await auditIntegrationEvent(request, session, "account.connected", provider, connection.id, {
      externalAccountId: normalized.accountId,
      scopes: config.scopes,
    });

    return redirectResult(request, new URLSearchParams({ oauth: "connected", platform: provider }));
  } catch (error) {
    return providerErrorResponse(error);
  }
}
