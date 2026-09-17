-- Cross-thread context becomes the default.
--
-- Two separate changes, deliberately both:
--   1. New threads default to ON.
--   2. Existing threads are switched ON.
--
-- (2) is a data change to a privacy-affecting setting, made at the product
-- owner's explicit direction. Without it the feature would only ever apply to
-- threads created after this deploy, which is not what "context across all my
-- chats" means to a user who already has a hundred of them.
--
-- The privacy boundary does not move. Retrieval filters on userId in both
-- queries it makes, so a thread with this ON can reach that user's other
-- conversations and no one else's. Per-thread opt-out still works: anyone who
-- turns it back off stays off, because nothing here runs again.
ALTER TABLE "chat_threads" ALTER COLUMN "use_cross_thread_context" SET DEFAULT true;

UPDATE "chat_threads" SET "use_cross_thread_context" = true WHERE "use_cross_thread_context" = false;
