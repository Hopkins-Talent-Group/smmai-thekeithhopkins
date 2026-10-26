import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { toClientDTO } from "@/lib/crm";

const ClientStatus = ["PROSPECT", "ACTIVE", "PAUSED", "CHURNED"] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  return NextResponse.json({ client: toClientDTO(client) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let patch: Record<string, unknown>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    patch.status &&
    !Object.values(ClientStatus).includes(patch.status as any)
  ) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const rawClient = await prisma.client.update({
      where: { id },
      data: patch,
    });
    return NextResponse.json({ client: toClientDTO(rawClient) });
  } catch {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
}