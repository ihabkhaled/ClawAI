-- OpenAI models served only by POST /v1/responses (the *-pro family, *-codex,
-- deep-research) answer 404 on /v1/chat/completions, the only endpoint
-- chat-service speaks. They were synced as CHAT and exposed, so pinning one fell
-- back to another model (ADR-151). Classify them TOOL and unexpose them so they
-- leave the chat picker and the router; the OpenAI adapter keeps them TOOL on
-- every later sync. Idempotent.
UPDATE "connector_models"
SET "kind" = 'TOOL', "exposure" = 'UNEXPOSED'
WHERE "provider" = 'OPENAI'
  AND "kind" = 'CHAT'
  AND (
    lower("model_key") ~ '(^|-)pro(-[0-9]{4}-[0-9]{2}-[0-9]{2})?$'
    OR lower("model_key") ~ '-codex(-|$)'
    OR lower("model_key") ~ 'deep-research'
  );
