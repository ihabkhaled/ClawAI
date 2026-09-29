# 57 — Memory and context packs are stored whole and retrieved by relevance

**Status:** active · **Owner:** memory-service + chat-service · **Added:** 2026-09-29

**Applies to**: `apps/claw-memory-service` (memory + context-pack writes,
retrieval, internal routes) and `apps/claw-chat-service`
(`ContextAssemblyManager`: fetching, fitting and rendering memories and packs).

**Related**: [ADR-127](../docs/13-adr/adr-127-memory-and-packs-stored-whole-retrieved-by-relevance.md) ·
[rules/51](51-router-candidates-and-model-window-fit.md) (window fit) ·
[rules/16](16-authentication-and-authorization.md) (owner scoping) ·
[service guide](../docs/04-backend/service-guide-memory.md).

## The rule

1. **A write never shortens user content.** A memory or pack item is stored
   exactly as sent, up to `MEMORY_CONTENT_MAX_CHARS` /
   `CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS` (250,000). Secret masking
   (`maskSecrets`) is length-preserving and runs over the WHOLE text; it never
   returns a "preview". The old `redact()` returned `slice(0, 256)` and the
   create path stored it — a 45K-char spec became a stub ending "…Use".
2. **The four limits move together:** memory-service Zod DTOs, memory-service
   JSON body limit (`MEMORY_SERVICE_BODY_LIMIT`, Express defaults to 100 KB),
   frontend Zod schemas (`@/constants` `MEMORY_CONTENT_MAX_CHARS`), and nginx
   `client_max_body_size` (75m). Raising one alone is not a raise.
3. **Every field the edit dialog sends is in the update DTO.** Zod strips
   unknown keys silently; `type` was stripped for months. A DTO test asserts
   each editable field round-trips.
4. **A pattern that also matches prose needs an `accept` check.** 40 chars of
   `[A-Za-z0-9/+]` is any URL path; 13–19 digits is any order number. Luhn for
   cards, mixed-case-plus-digit for secret tokens.
5. **A REDACTED memory reaches the prompt masked, never as `null`.** An empty
   body is the "INSTRUCTION with empty body" in "Why this answer".
6. **Packs reach chat through `POST /internal/context-packs/for-chat` only.**
   It returns the thread's attached packs plus every enabled, un-paused pack
   whose scope is USER (all chats) or THREAD with `scopeRef = threadId`, with
   `userId` in the WHERE clause of every branch. Service token required.
7. **The thread's `useMemory` / `useContext` switches are honoured** by
   generation, not only by the preview.
8. **Large memories and pack items are fitted by relevance, not head-cut.**
   `fitTextsByRelevance` splits on markdown headings → blank lines → size,
   keeps each text's preamble, then adds chunks best-first by rarity-weighted
   overlap with the question, in document order, inside the rule-51 share.
9. **The pack block says it is reference material**, not a request — a pack
   that contains "do not generate an image" must not read as a task.

## How to check

```bash
cd apps/claw-memory-service && npx vitest run src/modules/memory/__tests__/memory-large-content.spec.ts src/modules/context-packs/__tests__/context-packs-for-chat.spec.ts
cd apps/claw-chat-service && npx vitest run src/modules/chat-messages/utilities/__tests__/relevant-chunks.utility.spec.ts src/modules/chat-messages/managers/__tests__/context-assembly-packs-for-chat.spec.ts
```
