import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { hashSecret } from "@/lib/security";

export async function POST(request: NextRequest) {
  const raw = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (raw) {
    await prisma.session.deleteMany({ where: { tokenHash: hashSecret(raw) } } as any);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
