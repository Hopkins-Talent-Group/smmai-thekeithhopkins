-- Backfill `WebhookEvent`, which the Prisma schema declares but no migration
-- creates. The table was evidently applied out-of-band (schema drift), leaving
-- webhook dedupe lookups failing at runtime. Written defensively: create only
-- if missing, and never touch an existing table.
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" TEXT,
    "postId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayload" TEXT NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WebhookEvent_eventId_idx" ON "WebhookEvent"("eventId");
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_platform_eventId_key" ON "WebhookEvent"("platform", "eventId");
