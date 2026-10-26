import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { hashSecret } from "@/lib/security";

export const AUTH_COOKIE_NAME = "smmai_session";

export interface SessionPayload {
  userId: string;
  email: string;
  role: "admin" | "manager" | "editor" | "viewer";
  workspaceId: string;
  iat?: number;
  exp?: number;
}

const roleMap = {
  ADMIN: "admin",
  MANAGER: "manager",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export async function verifySession(request: NextRequest): Promise<
  { valid: true; payload: SessionPayload } | { valid: false; reason: string }
> {
  const raw = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!raw || raw.length < 32) return { valid: false, reason: "No session cookie" };

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSecret(raw) } as any,
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return { valid: false, reason: "Invalid or expired session" };
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.userId },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return { valid: false, reason: "No workspace membership" };

  return {
    valid: true,
    payload: {
      userId: session.userId,
      email: session?.user?.email,
      role: roleMap[membership.role],
      workspaceId: membership.workspaceId,
      exp: Math.floor(session.expiresAt.getTime() / 1000),
    },
  };
}

export default verifySession;
