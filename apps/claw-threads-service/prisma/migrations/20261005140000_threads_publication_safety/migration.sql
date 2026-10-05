CREATE TYPE "PublicationSafetyStatus" AS ENUM ('APPROVED', 'REVIEW_REQUIRED');

ALTER TABLE "thread_publication_revisions"
ADD COLUMN "safety_status" "PublicationSafetyStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
ADD COLUMN "safety_reasons" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "index_eligible" BOOLEAN NOT NULL DEFAULT false;
