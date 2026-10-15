-- A reader suggestion the owner accepted and then published into the Thread becomes APPLIED.
-- Additive: no existing row changes, nothing is rewritten.
ALTER TYPE "PublicationChangeRequestStatus" ADD VALUE IF NOT EXISTS 'APPLIED';

-- Counting one person's pending suggestions on one Thread (the per-person cap) stays an index lookup.
CREATE INDEX IF NOT EXISTS "thread_publication_change_requests_publication_id_requester_id_status_idx"
  ON "thread_publication_change_requests" ("publication_id", "requester_id", "status");
