-- Models whose id says they only work on a provider's non-chat API (xAI multi-agent:
-- /v1/responses only, HTTP 400 on chat completions) are not chat models. Kind TOOL
-- keeps them out of the catalog, the picker and routing; exposure goes back to
-- UNEXPOSED so no admin screen still lists one as live. Idempotent.
UPDATE "connector_models"
SET "kind" = 'TOOL', "exposure" = 'UNEXPOSED'
WHERE "model_key" ~* '(^|[-_./])multi-agent([-_./]|$)'
  AND ("kind" <> 'TOOL' OR "exposure" <> 'UNEXPOSED');
