import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");

  const session = await verifySession(request);
  if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const workspaceId = session.payload.workspaceId;

  let where: any = {};

  if (workspaceId) {
    where.workspaceId = workspaceId;
  }

  if (platform && platform !== "all") {
    where.platform = platform;
  }

  const drafts = await prisma.contentDraft.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Transform into inbox item format
  const items = [
    ...drafts.map((d: any) => ({
      id: d.id,
      type: "draft",
      topic: d.topic,
      platform: d.platform || "meta",
      status: d.status,
      createdAt: d.createdAt,
    })),

  ];

  const total = items.length;
  const unread = items.filter((i: any) => i.status !== "published").length;

  return NextResponse.json({
    items,
    total,
    unread,
    platform,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, topic, platform } = body;

    const session = await verifySession(request);
    if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const workspaceId = session.payload.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (type === "draft") {
      const draft = await prisma.contentDraft.create({
        data: {
          topic,
          platform: platform || "meta",
          status: "draft",
          workspaceId,
          text: "",
          hashtags: [],
          createdAt: new Date().toISOString(),
          author: "Marketing Team",
        },
      });

      return NextResponse.json({ success: true, draft }, { status: 201 });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to create engagement item" }, { status: 500 });
  }
}