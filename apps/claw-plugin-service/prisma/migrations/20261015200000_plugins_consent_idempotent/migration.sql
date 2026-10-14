-- Additive: one open consent card per identical question.
-- pending_key is set only while a request is PENDING and is unique, so the same tool + target +
-- arguments + conversation can never have two open cards (a model re-emitting a call with a new
-- call id used to create duplicates). It is cleared when the request is answered or lapses.

ALTER TABLE "plugin_consent_requests" ADD COLUMN IF NOT EXISTS "pending_key" TEXT;

-- Duplicates that already exist: keep the oldest pending row of each identical question.
DELETE FROM "plugin_consent_requests" AS r
USING (
    SELECT "id",
           row_number() OVER (PARTITION BY k ORDER BY "created_at", "id") AS rn
    FROM (
        SELECT "id", "created_at",
               encode(sha256(convert_to(concat_ws('|', "user_id", "tool_name", coalesce("install_id", ''), coalesce("server_id", ''), "args_hash", coalesce("conversation_id", '')), 'UTF8')), 'hex') AS k
        FROM "plugin_consent_requests"
        WHERE "status" = 'PENDING'
    ) AS keyed
) AS ranked
WHERE r."id" = ranked."id" AND ranked.rn > 1;

UPDATE "plugin_consent_requests"
SET "pending_key" = encode(sha256(convert_to(concat_ws('|', "user_id", "tool_name", coalesce("install_id", ''), coalesce("server_id", ''), "args_hash", coalesce("conversation_id", '')), 'UTF8')), 'hex')
WHERE "status" = 'PENDING';

CREATE UNIQUE INDEX IF NOT EXISTS "plugin_consent_requests_pending_key_key" ON "plugin_consent_requests"("pending_key");
