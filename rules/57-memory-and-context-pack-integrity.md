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
10. **Generation intent reads only the request, never the material.** Image
    (`detectImageGenerationSignals`) and file (`detectFileIntent`) detection
    both scan `generationRequestText(message)` from `@claw/shared-utilities`:
    negated clauses removed in the 13 locales, a pasted document reduced to
    its instruction envelope (first paragraph; last only if it says "above"),
    and a "save this as memory/context" command yields nothing. Add a new
    generation keyword table → it must go through this filter too.

11. **"Save this as memory / add this to my context pack" is a server-side save, not a model turn.** chat-service `SaveToContextManager` recognises the command with `detectSaveToContextIntent` (13 locales; must open the message or be its whole last paragraph), saves via memory-service `POST /internal/memories/save-from-chat` or `/internal/context-packs/save-from-chat` (service token, owner = thread owner, idempotent on the user message id), and stores a localized confirmation with type, size and a `/memory` or `/context` link. Zero tokens, no model call. A bare command saves the previous message; nothing to save → a one-line question.

12. **Memories are markdown end to end.** Stored and injected verbatim; the memory card renders them with `MarkdownRenderer` over `memoryCardPreview()` (first 4,000 characters) — never raw text, never a 250K parse per card.

13. **Exact strings are quoted, never translated.** The memory and pack blocks end with `VERBATIM_QUOTE_INSTRUCTION`: an error message, label or code from the material is quoted verbatim in its original language even when the reply is in Arabic (live round R9 translated it). Its tokens are counted in `estimateSystemOverheadTokens` (rule 51).
14. **An enforced-local domain needs a live local runtime.** `handleAuto` honours medical/legal/privacy → local-ollama only when `isRuntimeHealthy('OLLAMA')`; otherwise it goes cloud router → heuristic best-available cloud, skipping the Ollama router and local category models. Production runs no ollama-service; a pasted healthcare pack used to die with "fetch failed".

15. **A chat's switches govern it as a SOURCE, not only as a reader** (SEC-006,
    2026-09-30). `useMemory=false` means nothing said in that chat is LEARNED:
    chat-service puts `useMemory` on `message.completed` and memory-service's
    `handleMessageCompleted` returns before extraction when it is `false`
    (absent = an older publisher = on). A chat with `useMemory=false` or
    `useCrossThreadContext=false` is never a cross-thread candidate for another
    chat (`findCandidateThreads` filters both). Before this, both switches only
    stopped what the chat itself READ.

## How to check

```bash
cd apps/claw-memory-service && npx vitest run src/modules/memory/__tests__/memory-large-content.spec.ts src/modules/context-packs/__tests__/context-packs-for-chat.spec.ts src/modules/memory/__tests__/memory.service.spec.ts
cd apps/claw-chat-service && npx vitest run src/modules/chat-messages/utilities/__tests__/relevant-chunks.utility.spec.ts src/modules/chat-messages/managers/__tests__/context-assembly-packs-for-chat.spec.ts src/modules/chat-messages/repositories/__tests__/cross-thread-branch-family.spec.ts
```
