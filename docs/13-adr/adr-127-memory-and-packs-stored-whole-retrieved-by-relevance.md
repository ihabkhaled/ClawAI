# ADR-127 — Memories and context packs are stored whole and retrieved by relevance

**Status:** Accepted · **Date:** 2026-09-29 · **Rule:** [rules/57](../../rules/57-memory-and-context-pack-integrity.md)

## Context

Production reports on claw-ai.co, all reproduced against the code:

| Symptom                                                   | Cause                                                                                                                                                                                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A ~45K-char markdown memory saved as a stub ending "…Use" | A false-positive secret match (`aws_secret_key` matches any 40-char `[A-Za-z0-9/+]` run) made the create path store `redact()`'s `slice(0, 256)` preview. Character 256 of the real pack is the "Use" of "Use it only as…". |
| Editing a memory's type did nothing                       | `updateMemorySchema` had no `type`; Zod stripped it.                                                                                                                                                                        |
| Packs capped at 50K                                       | DTO `.max(50000)` in 4 places, plus Express's 100 KB default body limit in memory-service.                                                                                                                                  |
| "Why this answer" showed 0 pack items                     | Chat fetched only `thread.contextPackIds`; an enabled pack reached a thread only if attached to it.                                                                                                                         |
| A big memory was "used" but the model recalled nothing    | REDACTED memories were retrieved with `content: null`; everything else was head-truncated to its window share, so page-30 facts were unreachable.                                                                           |

## Decision

1. Masking is length-preserving over the whole text; writes never shorten.
2. Limits are 250,000 characters, with a 4 MB JSON body limit.
3. `type` is updatable.
4. Chat gets packs from one owner-scoped, service-token-guarded endpoint that
   includes USER-scope packs (the default scope) automatically. Turning a pack
   off (`isEnabled=false`) or the thread's `useContext` off removes it.
5. Memories and pack items are fitted with `fitTextsByRelevance` — markdown
   chunks ranked against the user's question — inside the existing rule-51
   shares (memory 5%, packs 10% of the input window). No embedding call on the
   hot path: lexical rarity weighting finds exact phrases ("Documentation
   Date … future") that a 768-d prefix embedding of the first 4K chars cannot.

## Consequences

- A user with many USER-scope packs now pays their tokens on every turn (up to
  20 packs, bounded by the 10% share). The pack switch is the control.
- Existing rows already cut to 256 chars are not recoverable; the user must
  re-save them.
- CJK text without spaces is tokenised as long runs; relevance there is
  weaker (falls back to document order). Not addressed in this change.
