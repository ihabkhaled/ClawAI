CREATE TYPE "PublicationCommentStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'DELETED');
CREATE TYPE "PublicationReactionValue" AS ENUM ('LIKE', 'DISLIKE');
CREATE TYPE "PublicationChangeRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE "PublicationReportReason" AS ENUM (
  'SPAM', 'ABUSE', 'PRIVATE_INFORMATION', 'UNSAFE_CONTENT', 'OTHER'
);
CREATE TYPE "PublicationReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

CREATE TABLE "thread_publication_comments" (
  "id" TEXT NOT NULL,
  "publication_id" TEXT NOT NULL,
  "author_id" TEXT,
  "content" VARCHAR(5000) NOT NULL,
  "status" "PublicationCommentStatus" NOT NULL DEFAULT 'VISIBLE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "thread_publication_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "thread_publication_comments_publication_id_fkey"
    FOREIGN KEY ("publication_id") REFERENCES "thread_publications"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "thread_publication_reactions" (
  "id" TEXT NOT NULL,
  "publication_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "value" "PublicationReactionValue" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "thread_publication_reactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "thread_publication_reactions_publication_id_fkey"
    FOREIGN KEY ("publication_id") REFERENCES "thread_publications"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "thread_publication_change_requests" (
  "id" TEXT NOT NULL,
  "publication_id" TEXT NOT NULL,
  "requester_id" TEXT,
  "suggestion" VARCHAR(5000) NOT NULL,
  "status" "PublicationChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
  "owner_response" VARCHAR(2000),
  "accepted_revision_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "thread_publication_change_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "thread_publication_change_requests_publication_id_fkey"
    FOREIGN KEY ("publication_id") REFERENCES "thread_publications"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "thread_publication_reports" (
  "id" TEXT NOT NULL,
  "publication_id" TEXT NOT NULL,
  "comment_id" TEXT,
  "reporter_id" TEXT,
  "reason" "PublicationReportReason" NOT NULL,
  "details" VARCHAR(1000),
  "status" "PublicationReportStatus" NOT NULL DEFAULT 'OPEN',
  "moderated_by" TEXT,
  "moderated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "thread_publication_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "thread_publication_reports_publication_id_fkey"
    FOREIGN KEY ("publication_id") REFERENCES "thread_publications"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "thread_publication_reports_comment_id_fkey"
    FOREIGN KEY ("comment_id") REFERENCES "thread_publication_comments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "thread_publication_reactions_publication_id_user_id_key"
  ON "thread_publication_reactions"("publication_id", "user_id");
CREATE INDEX "thread_publication_comments_publication_id_status_created_at_idx"
  ON "thread_publication_comments"("publication_id", "status", "created_at");
CREATE INDEX "thread_publication_comments_author_id_created_at_idx"
  ON "thread_publication_comments"("author_id", "created_at");
CREATE INDEX "thread_publication_reactions_publication_id_value_idx"
  ON "thread_publication_reactions"("publication_id", "value");
CREATE INDEX "thread_publication_change_requests_publication_id_status_created_at_idx"
  ON "thread_publication_change_requests"("publication_id", "status", "created_at");
CREATE INDEX "thread_publication_change_requests_requester_id_created_at_idx"
  ON "thread_publication_change_requests"("requester_id", "created_at");
CREATE INDEX "thread_publication_reports_status_created_at_idx"
  ON "thread_publication_reports"("status", "created_at");
CREATE INDEX "thread_publication_reports_publication_id_created_at_idx"
  ON "thread_publication_reports"("publication_id", "created_at");
