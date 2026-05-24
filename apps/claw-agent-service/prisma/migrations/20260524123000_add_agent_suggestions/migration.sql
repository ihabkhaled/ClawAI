-- V2 Stream 05 — activity-driven suggestions.
--
-- AgentSuggestion rows are emitted by the AgentSuggestionManager when
-- a (userId, kind) pair crosses the occurrence threshold in the
-- rolling 7-day window. Frontend lists PENDING and lets users accept
-- (creating a Recipe) or dismiss them. EXPIRED rows are auto-swept
-- after 14 days untouched.

CREATE TYPE "AgentSuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED', 'EXPIRED');

CREATE TABLE "agent_suggestions" (
  "id"                  TEXT PRIMARY KEY,
  "userId"              TEXT NOT NULL,
  "kind"                TEXT NOT NULL,
  "summary"             TEXT NOT NULL,
  "occurrencesLast7d"   INTEGER NOT NULL,
  "sourceActivityIds"   JSONB NOT NULL,
  "suggestedRecipeDsl"  JSONB,
  "status"              "AgentSuggestionStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedAt"          TIMESTAMP(3),
  "reviewedByUserId"    TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "agent_suggestions_userId_kind_status_key"
  ON "agent_suggestions" ("userId", "kind", "status");

CREATE INDEX "agent_suggestions_userId_status_createdAt_idx"
  ON "agent_suggestions" ("userId", "status", "createdAt");
