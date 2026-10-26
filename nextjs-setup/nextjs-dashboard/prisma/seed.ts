// Prisma seed data for local development
import bcrypt from "bcryptjs";
import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  const adminPasswordHash = await bcrypt.hash("admin", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@smmai.com" },
    update: { passwordHash: adminPasswordHash, role: "ADMIN" },
    create: { email: "admin@smmai.com", passwordHash: adminPasswordHash, role: "ADMIN", name: "SMM AI Admin" },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo" },
    update: { name: "SMM AI Demo Workspace" },
    create: { slug: "demo", name: "SMM AI Demo Workspace" },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: admin.id } },
    update: { role: "ADMIN" },
    create: { workspaceId: workspace.id, userId: admin.id, role: "ADMIN" },
  });

  await prisma.workspaceSettings.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: { workspaceId: workspace.id, timezone: "UTC", locale: "en-US", autoApprove: false, requireTwoStepApproval: true },
  });

  const clients = [
    { id: "cl-001", name: "Ada Reyes", company: "Acme Corp", email: "ada@acme.com", phone: "+1-555-0101", website: "https://acme.com", industry: "SaaS", status: "ACTIVE" as const, approved: true, revenue: 12500, accountManager: "Mia Chen", tags: ["enterprise","retainer"], notes: "Quarterly review scheduled.", postCount: 42 },
    { id: "cl-002", name: "Ben Okafor", company: "Northwind Labs", email: "ben@northwind.io", phone: "+1-555-0114", website: "https://northwind.io", industry: "Healthtech", status: "PROSPECT" as const, approved: false, revenue: 0, accountManager: "Diego Santos", tags: ["inbound","trial"], notes: "Requested pricing sheet.", postCount: 0 },
    { id: "cl-003", name: "Cara Lin", company: "Lumen & Co", email: "cara@lumen.co", phone: "+1-555-0188", website: "https://lumen.co", industry: "Retail", status: "PAUSED" as const, approved: true, revenue: 4800, accountManager: "Mia Chen", tags: ["smb"], notes: "Paused pending budget review.", postCount: 17 },
  ];
  for (const client of clients) await prisma.client.upsert({ where: { id: client.id }, update: { workspaceId: workspace.id }, create: { ...client, workspaceId: workspace.id } });

  await prisma.contentDraft.upsert({
    where: { id: "draft-001" },
    update: { workspaceId: workspace.id },
    create: {
      id: "draft-001",
      workspaceId: workspace.id,
      clientId: "cl-001",
      topic: "Welcome to SMM AI",
      platform: "meta",
      text: "Get started with social media management automation.",
      hashtags: ["#content", "#automation"],
      status: "approved",
      metadata: {},
    },
  });

  console.log("Seed complete.");
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => prisma.$disconnect());
