# ADR-086: The Context Composer, and why relevance may never remove a message

**Status**: Accepted
**Date**: 2026-08-30
**Deciders**: ClawAI core team
**Slice**: Conversational intelligence (context flagship, Batch 1)

## Context

A user reported that ClawAI forgets the earlier part of a long conversation: ask
a hundred questions, then ask it to build something using what was discussed,
and the answer ignores the discussion.

The report was correct, and understated. A live lab against production
(`scripts/qa-lab`) reproduced total context loss **at turn three of a
three-turn conversation**, and the mechanism turned out to have nothing to do
with length.

### What was actually happening

Three independent caps sat in series, each unaware of the others.

| #   | Where                           | Rule                                          | Effect                                                                                                                              |
| --- | ------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `chat-messages.service.ts`      | `findRecentByThreadId(threadId, 20)`          | Only 20 rows ever left the database. Message 21 and older could not be recovered by any downstream budget — they were never loaded. |
| 2   | `context-assembly.manager.ts`   | `threadMessages.slice(-THREAD_CONTEXT_LIMIT)` | Cut to 20 again, at a message boundary, so roughly half the time an assistant answer arrived without its question.                  |
| 3   | `filterThreadMessagesForIntent` | see below                                     | Cut 20 down to **1–6**.                                                                                                             |

Cap 3 is the one that mattered. For a prompt not matching a sixteen-word regex
(`again|another|continue|expand|…`) it:

- **dropped every `ASSISTANT` message unconditionally** — `if (msg.role === 'ASSISTANT') return false;`
- kept user messages scoring `>= 0.45` on word overlap with the current question
- then took `.slice(-4)`
- and if nothing scored, fell back to `messages.slice(-1)`

For a prompt that _did_ match the regex, it took `.slice(-6)`.

A fourth cap applied on the AUTO fast path: `slice(-6)` messages and a
1024-token prompt ceiling, triggered by prompts under 220 characters — that is,
triggered precisely by short questions about long conversations.

And a fifth, structural one: `tokenBudget` was `threadSettings.maxTokens ?? 4096`.
`maxTokens` is a thread setting meaning _how long may the answer be_. Used as
the whole-prompt budget at ~4 chars/token, a 256k-window model received about
16 KB of history, memories, files and system prompt combined. `contextWindowTokens`
existed in routing-service, connector-service and the frontend — and in **zero
files** of chat-service, the service deciding how much to send.

### The measurement that settled it

Same planted fact, same thread, same distance (9 messages), same six free
models, four phrasings of one question:

| Phrasing                                           | Overlap vs. the seeding sentence | Predicted by the shipped rule | Measured recall |
| -------------------------------------------------- | -------------------------------- | ----------------------------- | --------------- |
| `What is my access code for this session?`         | 0.50                             | kept                          | **83%** (5/6)   |
| `Which secret string did I share at the start?`    | 0.00                             | dropped                       | **0%** (0/6)    |
| `Remind me of the credential I mentioned earlier.` | 0.00 (regex hit → `slice(-6)`)   | dropped                       | **0%** (0/6)    |
| `Repeat it back to me.`                            | 0.00                             | dropped                       | **0%** (0/6)    |

24 of 24 threads matched the static prediction. A separate breadth run scored
19/19 free models at 100% on the high-overlap phrasing, which rules the models
out as the variable.

Recall was not a function of conversation length, model quality, or context
window. It was a function of **how many four-letter-or-longer words the question
happened to share with the sentence that stated the fact.** Rephrase the
question and the fact vanishes. That is why the failure felt random.

## Decision

### D1 — Relevance ranks; only the token budget removes

`ContextComposerManager` is the single place that decides what reaches the
model, and it obeys one rule:

> **Nothing removes a message for being irrelevant. The only reason a message is
> left out is that the token budget ran out.**

Relevance decides **order**, and order only matters once the budget is full. On
a 128k window with an ordinary thread, nothing is dropped at all — the composer
sends 81 of 81 messages where the old path sent one.

This is the inversion that matters. The previous design's default was _exclude
unless proven relevant_, and every failure above is that default firing. A
selector that can only add cannot cause them.

### D2 — Selection works in turns, not messages

A turn is a `USER` message plus every `ASSISTANT`/`TOOL`/`SYSTEM` message until
the next `USER` message. Turns are included whole or not at all.

Half a turn is worse than none: an assistant answer with no question reads to
the next model as an unprompted assertion, and a question with no answer invites
it to answer again. `slice(-20)` split turns at the boundary about half the time.

### D3 — Assistant output is conversational state

`ASSISTANT` messages are never dropped for their role. The assistant is where
architectures, options, code, drafts and recommendations live, and
"implement the architecture you recommended" is unanswerable without them.

### D4 — Four priority classes, evicted from P3 upwards

`P0_REQUIRED` (the current turn, placed before the budget is even consulted) ·
`P1_RECENT` (the last 12 turns, sent regardless of subject) ·
`P2_RETRIEVED` (older turns above the relevance threshold) ·
`P3_OPTIONAL` (the rest, if room remains).

Eviction never walks from "oldest". The oldest message in a thread is very often
the one that named the project or chose the database, and it was the first thing
the old `slice(-N)` threw away.

### D5 — Four token quantities, not one

`ModelTokenBudget` separates `contextWindowTokens`, `reservedOutputTokens`,
`systemOverheadTokens`, `toolOverheadTokens` and `availableInputTokens`.
`maxTokens` now feeds `reservedOutputTokens` **and nothing else**. Shortening
your replies can no longer shorten your memory.

System overhead is _measured_ (files, memories, packs, citations, system prompt),
not assumed. A 200 KB attachment and an empty one used to leave history exactly
the same budget, and the file then pushed the conversation out at the provider,
where nothing could record it.

### D6 — The catalog is the source of truth for the window

routing-service gains `GET /internal/router-models/context-window/:provider/:model`
(`ServiceTokenGuard`, same shape as the model-cost route beside it).
chat-service reads it through `ModelContextWindowClient`, cached 15 minutes.

It **fails open**, which is the opposite of `ModelRateClient` next door and
deliberate: an unknown _price_ must refuse the request, because proceeding
unpriced spends real money; an unknown _window_ must not, because a conservative
budget degrades an answer while a refusal denies one.

`MAX_HISTORY_INPUT_TOKENS = 96_000` caps history even on a 1M window. A 1M-token
prompt is slow, expensive on metered providers, and recall degrades in the middle
of very long prompts. Raise it with a measurement, not a hunch.

### D7 — Every generation emits a manifest

`ConversationContextManifest` records the included message ids, the omitted ones
with a per-message `ContextOmissionReason`, the estimated input tokens, the full
budget with its provenance, and which reference detectors fired. It is written
to the context receipt.

The receipt previously skipped itself when there were no memories and no pack
items — which is the overwhelming majority of chat turns. The one surface that
could have shown a hundred-message thread being sent as one message did not
exist for the threads that needed it.

### D8 — The fast path trims retrieval, never conversation

AUTO's fast path keeps its memory and citation caps and its output-token cap,
which is what actually buys the latency. It no longer slices history or clamps
the prompt to 1024 tokens.

## Consequences

**Good.** Long threads work. Recall stops depending on phrasing. Assistant
output is usable later. A 256k model is budgeted as a 256k model. "Why did the
AI forget this?" has an auditable answer instead of a guess.

**Cost.** Prompts get larger, and on metered providers larger prompts cost more.
This is a deliberate product decision, not an oversight:
`MAX_HISTORY_INPUT_TOKENS` bounds the worst case, and provider prompt caching
(Batch 3) is the intended mitigation. Reducing context to save money is a
product-level policy decision, never a silent default.

**Latency.** One cached internal call per model per 15 minutes, and a larger
prompt to transmit. Context assembly itself is O(messages) with no network I/O.

**Read amplification.** `THREAD_HISTORY_FETCH_LIMIT = 400` replaces a 20-row
read. It is one indexed query on one thread. Beyond 400, hierarchical summaries
(Batch 2) take over rather than an ever-larger `SELECT`.

## What this ADR does NOT decide

Deferred to later batches, and **not** claimed as done:

- Hierarchical rolling summarisation beyond the 400-row window
- Structured thread state with supersession (`latest-value precedence` is
  currently served by recency weighting, not by an explicit supersedes graph)
- Semantic/vector same-thread retrieval — P2 ranking is hybrid lexical + entity
  - decision-marker + recency, not embeddings
- **Cross-thread retrieval.** It does not exist. The lab measured
  `cross_thread_recall` failing and `wrong_thread_retrieval` passing — the second
  only because there is nothing to retrieve.
- Migrating chat from `GET /internal/memories/for-context` to the canonical
  `POST /internal/memories/retrieve`. The mismatch is real: `context-preview`
  already uses the canonical route, so the preview a user is shown is produced
  by a different code path from the generation itself.

## References

- Live evidence: `scripts/qa-lab/` — `paraphrase-experiment.mjs`, `run-lab.mjs`
- Report: [`docs/03-architecture/conversational-context.md`](../03-architecture/conversational-context.md)
- Runbook: [`docs/11-runbooks/context-loss-triage.md`](../11-runbooks/context-loss-triage.md)
