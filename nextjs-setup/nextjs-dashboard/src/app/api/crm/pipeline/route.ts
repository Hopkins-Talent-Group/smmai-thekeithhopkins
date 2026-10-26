import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse, readJsonWithLimit, requireSameOrigin } from "@/lib/security";

// Placeholder sales stages per crm-plan-v2.md §7.2 (§10 decision 3: replace
// with the team's actual process). A stage named "won"/"lost" also sets the
// opportunity's terminal status; every other stage keeps it OPEN.
const DEFAULT_STAGES = [
  { name: "New", position: 1, probability: 10 },
  { name: "Qualified", position: 2, probability: 30 },
  { name: "Proposal", position: 3, probability: 60 },
  { name: "Won", position: 4, probability: 100 },
  { name: "Lost", position: 5, probability: 0 },
];

const LEAD_STATUSES = ["NEW", "QUALIFIED", "WORKING", "CONVERTED", "LOST"] as const;

type PipelineWithStages = {
  id: string;
  name: string;
  stages: Array<{ id: string; name: string; position: number; probability: number }>;
};

async function ensurePipeline(workspaceId: string): Promise<PipelineWithStages> {
  const include = { stages: { orderBy: { position: "asc" as const } } };
  const existing = await prisma.pipeline.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    include,
  });
  if (existing) return existing;

  try {
    return await prisma.pipeline.create({
      data: {
        workspaceId,
        name: "Default pipeline",
        isDefault: true,
        stages: { create: DEFAULT_STAGES },
      },
      include,
    });
  } catch {
    // A concurrent first request created it; re-read instead of failing.
    const raced = await prisma.pipeline.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      include,
    });
    if (!raced) throw new Error("Pipeline could not be loaded");
    return raced;
  }
}

function amountNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusForStage(stageName: string): "OPEN" | "WON" | "LOST" {
  const key = stageName.trim().toLowerCase();
  if (key === "won") return "WON";
  if (key === "lost") return "LOST";
  return "OPEN";
}

export async function GET(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 120, scope: "crm:pipeline:read" });
  if (!limit.allowed) return rateLimitResponse(limit);

  const session = await verifySession(request);
  if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const workspaceId = session.payload.workspaceId;

  const pipeline = await ensurePipeline(workspaceId);
  const [opportunities, leads] = await Promise.all([
    prisma.opportunity.findMany({
      where: { workspaceId },
      include: { lead: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lead.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } }),
  ]);

  const stages = pipeline.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    position: stage.position,
    probability: stage.probability,
    opportunities: opportunities
      .filter((opp) => opp.stageId === stage.id)
      .map((opp) => ({
        id: opp.id,
        title: opp.title,
        amount: amountNumber(opp.amount),
        status: opp.status,
        expectedCloseAt: opp.expectedCloseAt ? opp.expectedCloseAt.toISOString() : null,
        lead: opp.lead,
        createdAt: opp.createdAt.toISOString(),
      })),
  }));

  const open = opportunities.filter((opp) => opp.status === "OPEN");
  return NextResponse.json({
    pipeline: { id: pipeline.id, name: pipeline.name },
    stages,
    leads: leads.map((lead) => ({
      id: lead.id,
      title: lead.title,
      status: lead.status,
      source: lead.source,
      value: amountNumber(lead.value),
      createdAt: lead.createdAt.toISOString(),
    })),
    counts: {
      openOpportunities: open.length,
      openValue: open.reduce((sum, opp) => sum + (amountNumber(opp.amount) ?? 0), 0),
      leads: leads.length,
    },
  });
}

export async function POST(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 60, scope: "crm:pipeline:write" });
  if (!limit.allowed) return rateLimitResponse(limit);
  if (!requireSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  const session = await verifySession(request);
  if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const workspaceId = session.payload.workspaceId;

  let payload: Record<string, unknown>;
  try {
    payload = await readJsonWithLimit(request);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (!title || title.length > 200) {
    return NextResponse.json({ error: "title is required (max 200 characters)" }, { status: 400 });
  }

  if (payload.type === "lead") {
    const status = typeof payload.status === "string" ? payload.status.toUpperCase() : "NEW";
    if (!LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
      return NextResponse.json({ error: "Invalid lead status" }, { status: 400 });
    }
    const lead = await prisma.lead.create({
      data: {
        workspaceId,
        title,
        status: status as "NEW" | "QUALIFIED" | "WORKING" | "CONVERTED" | "LOST",
        source: typeof payload.source === "string" && payload.source.trim() ? payload.source.trim().slice(0, 120) : null,
        value: typeof payload.value === "number" && Number.isFinite(payload.value) && payload.value >= 0 ? payload.value : null,
      },
    });
    return NextResponse.json(
      {
        lead: {
          id: lead.id,
          title: lead.title,
          status: lead.status,
          source: lead.source,
          value: amountNumber(lead.value),
          createdAt: lead.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  }

  const pipeline = await ensurePipeline(workspaceId);

  let stageId = typeof payload.stageId === "string" ? payload.stageId : "";
  if (stageId) {
    const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId }, include: { pipeline: true } });
    if (!stage || stage.pipeline.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Stage not found in your workspace" }, { status: 404 });
    }
  } else {
    stageId = pipeline.stages[0]?.id ?? "";
    if (!stageId) return NextResponse.json({ error: "Pipeline has no stages" }, { status: 409 });
  }

  let leadId: string | null = null;
  if (typeof payload.leadId === "string" && payload.leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: payload.leadId } });
    if (!lead || lead.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Lead not found in your workspace" }, { status: 404 });
    }
    leadId = lead.id;
  }

  let expectedCloseAt: Date | null = null;
  if (typeof payload.expectedCloseAt === "string" && payload.expectedCloseAt) {
    const parsed = new Date(payload.expectedCloseAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "expectedCloseAt must be a valid date" }, { status: 400 });
    }
    expectedCloseAt = parsed;
  }

  const targetStage = pipeline.stages.find((stage) => stage.id === stageId);
  const amount = typeof payload.amount === "number" && Number.isFinite(payload.amount) && payload.amount >= 0 ? payload.amount : null;

  const opportunity = await prisma.opportunity.create({
    data: {
      workspaceId,
      pipelineId: pipeline.id,
      stageId,
      leadId,
      title,
      amount,
      status: statusForStage(targetStage?.name ?? ""),
      expectedCloseAt,
    },
  });

  return NextResponse.json(
    {
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        amount: amountNumber(opportunity.amount),
        status: opportunity.status,
        stageId: opportunity.stageId,
        expectedCloseAt: opportunity.expectedCloseAt ? opportunity.expectedCloseAt.toISOString() : null,
      },
    },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const limit = await checkRateLimit(request, { limit: 120, scope: "crm:pipeline:write" });
  if (!limit.allowed) return rateLimitResponse(limit);
  if (!requireSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

  const session = await verifySession(request);
  if (!session.valid) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const workspaceId = session.payload.workspaceId;

  let payload: Record<string, unknown>;
  try {
    payload = await readJsonWithLimit(request);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof payload.id === "string" ? payload.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  if (payload.type === "lead") {
    const status = typeof payload.status === "string" ? payload.status.toUpperCase() : "";
    if (!LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
      return NextResponse.json({ error: "Invalid lead status" }, { status: 400 });
    }
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    const lead = await prisma.lead.update({
      where: { id },
      data: { status: status as "NEW" | "QUALIFIED" | "WORKING" | "CONVERTED" | "LOST" },
    });
    return NextResponse.json({ lead: { id: lead.id, status: lead.status } });
  }

  const stageId = typeof payload.stageId === "string" ? payload.stageId : "";
  if (!stageId) return NextResponse.json({ error: "stageId is required" }, { status: 400 });

  const existing = await prisma.opportunity.findUnique({ where: { id } });
  if (!existing || existing.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }
  const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId }, include: { pipeline: true } });
  if (!stage || stage.pipeline.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Stage not found in your workspace" }, { status: 404 });
  }
  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: { stageId, status: statusForStage(stage.name) },
  });
  return NextResponse.json({
    opportunity: {
      id: opportunity.id,
      stageId: opportunity.stageId,
      status: opportunity.status,
    },
  });
}



