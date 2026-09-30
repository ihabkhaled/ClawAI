# ADR-138: A per-user prompt library in chat-service

- **Status:** Accepted
- **Date:** 2026-09-30
- **Deciders:** Product owner (request), engineering
- **Related:** gap R of `docs/14-risk-debt/chat-capability-audit-2026-09.md`,
  [`service-guide-chat.md`](../04-backend/service-guide-chat.md) "Prompt library"

## Context

Users retype the same prompts. Nothing in chat lets them save, tag, favourite and
reuse their own, with fill-in variables.

## Decision

- A `PromptTemplate` table owned by chat-service (`prompt_templates`), no relation to any
  other model, scoped by `userId` taken only from the JWT. A template owned by someone
  else answers 404, exactly like a missing one.
- Routes on `chat-prompt-templates` (list, create, get, patch, delete, `:id/use`). nginx
  gets a matching `location` in `locations.conf` and `nginx.distributed.conf.template`.
- Variables are `{{name}}`, `name` = `[a-z][a-z0-9_]{0,31}`, at most 20 distinct. The
  server only **extracts and validates** them (`variables` on every response); filling
  them in is the client's job. A malformed placeholder is refused with
  `PROMPT_TEMPLATE_INVALID` (400).
- Limits: 200 templates per user (`PROMPT_LIBRARY_FULL`, 409), title 1-120, body 1-20000,
  at most 10 tags of 1-32 chars (trimmed, lowercased, deduplicated). Duplicate titles are
  allowed.
- List order: favourites, then last used (never-used last), then last edited. Pagination
  is an opaque offset cursor; the 200 cap makes keyset pagination unnecessary.
- Titles and bodies are user content and are never logged.

## Consequences

Plan-tier limits are not applied; the flat 200 cap is the only quota. Sharing templates
between users is out of scope.
