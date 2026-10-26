import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
const AUTH_COOKIE_NAME = "smmai_session";

const PUBLIC_PATHS = ["/", "/login", "/api/auth/login", "/api/auth/register", "/api/auth/reset-password"];
const PROTECTED_PREFIXES = ["/dashboard", "/api/crm/", "/api/publish/", "/api/accounts/", "/api/analytics/", "/api/settings/", "/api/automation", "/api/engagement"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  if (isPublic(pathname)) return response;

  const protectedPath = PROTECTED_PREFIXES.some((prefix) => pathname === prefix.replace(/\/$/, "") || pathname.startsWith(prefix));
  if (protectedPath && !request.cookies.has(AUTH_COOKIE_NAME)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401, headers: response.headers });
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
