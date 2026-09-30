-- Published artifacts (F025): a scrubbed text file the coding agent publishes
-- as a hosted, read-only page. Addressed publicly only by `public_id` (192
-- random bits); the owner lists and deletes by `id`.
CREATE TABLE "published_artifacts" (
    "id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "published_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "published_artifacts_public_id_key" ON "published_artifacts"("public_id");

CREATE INDEX "published_artifacts_user_id_created_at_idx" ON "published_artifacts"("user_id", "created_at");
