-- F095: the repository a coding-agent thread belongs to ({ name, remoteUrl?, branch? }, remote
-- normalised and credential-free). Nullable and additive: NULL for every existing thread.
ALTER TABLE "chat_threads" ADD COLUMN "repository_ref" JSONB;
