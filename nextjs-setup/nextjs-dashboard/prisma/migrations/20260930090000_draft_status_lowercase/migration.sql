-- Rename DraftStatus values to lowercase to match the application contract
-- (src/lib/crm.ts DraftStatus) and all existing UI/API consumers.
-- Enum labels are stored ordinally, so existing rows are relabeled in place.
ALTER TYPE "DraftStatus" RENAME VALUE 'DRAFT' TO 'draft';
ALTER TYPE "DraftStatus" RENAME VALUE 'PENDING' TO 'pending';
ALTER TYPE "DraftStatus" RENAME VALUE 'APPROVED' TO 'approved';
ALTER TYPE "DraftStatus" RENAME VALUE 'REJECTED' TO 'rejected';
ALTER TYPE "DraftStatus" RENAME VALUE 'SCHEDULED' TO 'scheduled';
ALTER TYPE "DraftStatus" RENAME VALUE 'PUBLISHED' TO 'published';