-- Where a conversation was started, and therefore who may see it.
--
-- Every row that already exists becomes WEB, which is where it has always
-- appeared. Nothing moves out of anyone's chat list as a result of this
-- migration; only threads the coding agent creates from here on are separated.
CREATE TYPE "ThreadOrigin" AS ENUM ('WEB', 'CODING_AGENT');

ALTER TABLE "chat_threads"
  ADD COLUMN "origin" "ThreadOrigin" NOT NULL DEFAULT 'WEB';

CREATE INDEX "chat_threads_user_id_origin_idx" ON "chat_threads" ("user_id", "origin");
