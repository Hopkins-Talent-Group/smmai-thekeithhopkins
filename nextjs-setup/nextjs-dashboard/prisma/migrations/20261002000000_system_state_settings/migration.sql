-- Phase 2: server-authoritative settings on the SystemState singleton.
-- SystemState was previously only ever applied via `prisma db push`, so this
-- migration is written defensively: create the table if it is missing and add
-- the new `settings` column if it is missing.
CREATE TABLE IF NOT EXISTS "SystemState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "wasmRanking" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemState_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SystemState" ADD COLUMN IF NOT EXISTS "settings" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "SystemState" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
