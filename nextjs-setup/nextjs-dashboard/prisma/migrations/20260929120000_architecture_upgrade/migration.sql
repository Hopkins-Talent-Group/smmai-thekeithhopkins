ALTER TABLE "SocialAccount" RENAME COLUMN "accessToken" TO "accessTokenCiphertext";\nALTER TABLE "SocialAccount" RENAME COLUMN "refreshToken" TO "refreshTokenCiphertext";\n-- Architecture upgrade migration: CRM + audit + idempotency + integration lifecycle
ALTER TABLE "Session" RENAME COLUMN "token" TO "tokenHash";
ALTER INDEX "Session_token_key" RENAME TO "Session_tokenHash_key";
ALTER INDEX "Session_token_idx" RENAME TO "Session_tokenHash_idx";

CREATE TYPE "LeadStatus" AS ENUM ('NEW','QUALIFIED','WORKING','CONVERTED','LOST');
CREATE TYPE "ActivityType" AS ENUM ('NOTE','CALL','EMAIL','MEETING','TASK','SYSTEM');
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN','WON','LOST');
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTING','CONNECTED','DEGRADED','REAUTH_REQUIRED','DISCONNECTED');

CREATE TABLE "Contact" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "clientId" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "jobTitle" TEXT,
  "tags" TEXT[] NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Contact_workspaceId_idx" ON "Contact"("workspaceId");
CREATE INDEX "Contact_clientId_idx" ON "Contact"("clientId");
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "contactId" TEXT,
  "title" TEXT NOT NULL,
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "source" TEXT,
  "ownerUserId" TEXT,
  "value" DECIMAL(18,2),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Lead_workspaceId_status_idx" ON "Lead"("workspaceId","status");
CREATE INDEX "Lead_ownerUserId_idx" ON "Lead"("ownerUserId");

CREATE TABLE "Pipeline" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Pipeline_workspaceId_name_key" ON "Pipeline"("workspaceId","name");

CREATE TABLE "PipelineStage" (
  "id" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "probability" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PipelineStage_pipelineId_position_key" ON "PipelineStage"("pipelineId","position");

CREATE TABLE "Opportunity" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "leadId" TEXT,
  "pipelineId" TEXT NOT NULL,
  "stageId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DECIMAL(18,2),
  "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
  "expectedCloseAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Opportunity_workspaceId_status_idx" ON "Opportunity"("workspaceId","status");
CREATE INDEX "Opportunity_pipelineId_stageId_idx" ON "Opportunity"("pipelineId","stageId");

CREATE TABLE "Activity" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "contactId" TEXT,
  "type" "ActivityType" NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Activity_workspaceId_dueAt_idx" ON "Activity"("workspaceId","dueAt");
CREATE INDEX "Activity_contactId_createdAt_idx" ON "Activity"("contactId","createdAt");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "requestId" TEXT,
  "ipHash" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId","createdAt");
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType","resourceId");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId","createdAt");

CREATE TABLE "IdempotencyRecord" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "statusCode" INTEGER,
  "response" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IdempotencyRecord_workspaceId_key_key" ON "IdempotencyRecord"("workspaceId","key");
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

CREATE TABLE "IntegrationConnection" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "platform" "Platform" NOT NULL,
  "status" "IntegrationStatus" NOT NULL DEFAULT 'CONNECTING',
  "scopes" TEXT[] NOT NULL,
  "accessTokenCiphertext" TEXT,
  "refreshTokenCiphertext" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "externalAccountId" TEXT,
  "metadata" JSONB,
  "lastErrorAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IntegrationConnection_workspaceId_status_idx" ON "IntegrationConnection"("workspaceId","status");
CREATE INDEX "IntegrationConnection_platform_externalAccountId_idx" ON "IntegrationConnection"("platform","externalAccountId");

CREATE TABLE "AnalyticsSnapshot" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "socialAccountId" TEXT,
  "platform" "Platform" NOT NULL,
  "externalPostId" TEXT,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "engagements" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "shares" INTEGER NOT NULL DEFAULT 0,
  "saves" INTEGER NOT NULL DEFAULT 0,
  "followersGained" INTEGER NOT NULL DEFAULT 0,
  "watchTimeSeconds" INTEGER NOT NULL DEFAULT 0,
  "conversions" INTEGER NOT NULL DEFAULT 0,
  "rawMetrics" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AnalyticsSnapshot_workspaceId_platform_capturedAt_idx" ON "AnalyticsSnapshot"("workspaceId","platform","capturedAt");
CREATE INDEX "AnalyticsSnapshot_externalPostId_capturedAt_idx" ON "AnalyticsSnapshot"("externalPostId","capturedAt");

ALTER TABLE "Contact" ADD CONSTRAINT "Contact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
