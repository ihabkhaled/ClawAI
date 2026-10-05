-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'PUBLISHED', 'UNPUBLISHED', 'REVOKED');

-- CreateEnum
CREATE TYPE "RevisionReviewStatus" AS ENUM ('PENDING', 'READY_FOR_REVIEW', 'OWNER_APPROVED', 'STALE');

-- CreateTable
CREATE TABLE "thread_publications" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT,
    "slug" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "generation_job_id" TEXT,
    "source_snapshot" JSONB,
    "source_hash" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thread_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_publication_revisions" (
    "id" TEXT NOT NULL,
    "publication_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "content_hash" TEXT NOT NULL,
    "review_status" "RevisionReviewStatus" NOT NULL DEFAULT 'PENDING',
    "judge_score" INTEGER,
    "critic_score" INTEGER,
    "validated_at" TIMESTAMP(3),
    "owner_approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_publication_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "thread_publications_slug_key" ON "thread_publications"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "thread_publications_generation_job_id_key" ON "thread_publications"("generation_job_id");

-- CreateIndex
CREATE INDEX "thread_publications_owner_id_created_at_idx" ON "thread_publications"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "thread_publications_status_published_at_idx" ON "thread_publications"("status", "published_at");

-- CreateIndex
CREATE INDEX "thread_publication_revisions_publication_id_review_status_idx" ON "thread_publication_revisions"("publication_id", "review_status");

-- CreateIndex
CREATE UNIQUE INDEX "thread_publication_revisions_publication_id_revision_key" ON "thread_publication_revisions"("publication_id", "revision");

-- AddForeignKey
ALTER TABLE "thread_publication_revisions" ADD CONSTRAINT "thread_publication_revisions_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "thread_publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
