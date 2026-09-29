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

## Addendum — generation intent ignores negations and pasted bodies

Pasting the Myoncare pack (which says "DO NOT generate an image, diagram, document…") generated an image: the keyword scan matched inside the negation and inside the 45K body. `generationRequestText()` (shared-utilities `generation-request/`) now feeds both the image scan and routing's `detectFileIntent`: negated clauses are dropped (13 locales), long or heading-structured messages contribute only their instruction envelope, and a save/remember command (`detectSaveToContextIntent`) is never a generation. Known gap, unchanged: the generation table has phrase-level coverage only for English/Arabic, so bare German/Chinese requests ("Erstelle ein Bild", "生成一张图片") were and remain undetected.

## Addendum — saving from chat

Owner feature 11: "save this as memory / remember this / add this to my context pack" in 13 locales is handled deterministically by chat-service before any model call, through two owner-scoped, idempotent memory-service routes, and answered with a localized confirmation. Deviation from the brief: no model tool-calling path — the deterministic path already covers every model, and a second path would be a second way to save twice. Ambiguity is limited to "nothing to save", which gets one question.

## Addendum — follow-ups from the live rounds

- AUTO downgrades an enforced-local domain to cloud when no Ollama runtime is healthy (owner decision: availability over locality when no local runtime exists). Where Ollama is healthy, enforcement is unchanged.
- Memory/pack blocks instruct verbatim quoting of exact strings in their original language.
- German and Chinese bare generation phrases added; the earlier "known gap" is closed.

## Addendum (2026-09-30): superseded for saving from chat

At the owner's direction, a planner model now decides saves from chat and asks which pack when none was named — see [ADR-134](adr-134-ai-decided-save-to-memory-and-context.md). The deterministic path described in "Addendum — saving from chat" remains as the fallback when no planner answers.
