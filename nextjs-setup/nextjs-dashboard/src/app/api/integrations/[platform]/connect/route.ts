import { NextResponse, type NextRequest } from "next/server";
import {
  createOAuthState,
  guardIntegrationRoute,
  providerConnectConfig,
  providerErrorResponse,
} from "@/lib/integrations";

export async function GET(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  try {
    const { platform } = await params;
    const guard = await guardIntegrationRoute(request, platform);
    if ("error" in guard) return guard.error;
    const { session, platform: provider } = guard;

    const config = providerConnectConfig(provider);
    if (!config || !config.clientId) {
      return NextResponse.json({ error: `${provider} OAuth is not configured` }, { status: 503 });
    }

    const state = createOAuthState({
      workspaceId: session.payload.workspaceId,
      userId: session.payload.userId,
      platform: provider,
    });
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
    const redirectUri = `${appUrl}/api/integrations/${provider}/callback`;
    const authorize = new URL(config.authorizeUrl);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("client_id", config.clientId);
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("scope", config.scopes.join(" "));
    authorize.searchParams.set("state", state);

    return NextResponse.json({ authorizeUrl: authorize.toString(), state, redirectUri });
  } catch (error) {
    return providerErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  // Allow the UI to start OAuth with a POST as well (same-origin browser flow).
  return GET(request, { params });
}
