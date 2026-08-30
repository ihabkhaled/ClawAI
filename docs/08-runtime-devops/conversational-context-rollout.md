# Rolling out the conversational-context change

What to deploy, in what order, what to watch, and how to undo it.

Covers [ADR-086](../13-adr/adr-086-conversational-context-composer.md) (the
Context Composer) and [ADR-087](../13-adr/adr-087-cross-thread-retrieval.md)
(cross-thread retrieval), plus the memory-service hardening that ships with
them.

## What actually changes for a user

| Change                               | Visible how                             | Default            |
| ------------------------------------ | --------------------------------------- | ------------------ |
| Whole conversation reaches the model | Long threads stop forgetting            | On — it is the fix |
| Cross-thread retrieval               | New thread-settings toggle              | **Off**            |
| Context manifest                     | New block in the `[debug]` inspector    | On                 |
| memory-service service token         | Nothing, if the order below is followed | On                 |

## Deploy order — this one matters

There is exactly one ordering constraint, and getting it wrong takes memory
retrieval down.

1. **chat-service and workspace-service first.** Both gained
   `Authorization: Service …` headers on their calls to memory-service. The
   header is inert until memory-service enforces it, so deploying these first is
   safe in isolation.
2. **memory-service second.** It now rejects internal calls without that header.
   A memory-service deployed _before_ step 1 will 401 every retrieval.
3. **routing-service** any time. It only gains a new internal read route.
4. **frontend** any time after chat-service. The inspector renders new receipt
   fields and tolerates their absence.

The failure mode of getting it backwards is not an outage: chat-service treats
memory as non-blocking, so answers still arrive, just without memories. It shows
up as `fetchMemories: memory-service retrieve failed status=401` in chat-service
logs — see the [triage runbook](../11-runbooks/context-loss-triage.md).

## Database migration

One migration, `20260830120000_add_cross_thread_context`, on the chat database:

- `chat_threads.use_cross_thread_context BOOLEAN NOT NULL DEFAULT false`
- `chat_messages (thread_id, created_at)` index

Both are additive and take a brief lock proportional to table size for the
index. No backfill: the default means every existing thread keeps its current
behaviour, and there is nothing to migrate.

## What to watch, in order of usefulness

Everything below comes from the context receipt, which every generation now
writes.

1. **`contextWindowSource`** — if `CONSERVATIVE_FALLBACK` starts appearing,
   chat-service cannot read the model catalog and every prompt is being budgeted
   at 8192 tokens. Answers get shorter on context, not broken. Check
   routing-service reachability and the model's catalog row.
2. **`estimatedInputTokens`** — the cost signal. Expect it to rise; it is
   bounded at 96,000 (`MAX_HISTORY_INPUT_TOKENS`) plus overhead. A sudden jump
   at the ceiling means threads have outgrown the raw window.
3. **memory-service circuit warnings** — `circuit open for 30s` in
   memory-service logs means an Ollama-backed feature (embeddings, extraction or
   sensitivity) has a missing or unreachable model. The feature degrades; chat
   keeps working. Install the model and the circuit closes within 30 s.
4. **`retrievalMs` and `selectionMs`** — measured at 8–16 ms and 0–1 ms
   respectively on a 159-message thread. `selectionMs` growing with thread
   length would be the first sign the composer is the bottleneck; it was not at
   any length tested.
5. **`crossThreadSkipReason`** — should be `DISABLED` for essentially every turn
   at first, because the toggle is off by default. A rising share of `null`
   (meaning retrieval ran) tracks adoption.
6. **memory-service `401`s in chat-service logs** — the deploy-order symptom.

## Rollback

**There is no feature flag, deliberately.** A flag's "off" state is the state
nobody tests, and here the off state is a known-broken selector: reverting to it
would reintroduce the defect this change exists to fix. A flag whose disabled
path is a shipped bug is worse than no flag.

What exists instead, in increasing order of severity:

| Problem                            | Lever                               | Effect                                              |
| ---------------------------------- | ----------------------------------- | --------------------------------------------------- |
| Cross-thread retrieval misbehaving | It is per-thread and off by default | Already off for everyone who has not opted in       |
| Prompts too expensive              | `MAX_HISTORY_INPUT_TOKENS` constant | Requires a deploy; bounds history spend             |
| Something worse                    | `git revert` the context commits    | Returns to the previous selector, and to the defect |

Reverting is a real option and it is cheap — the changes are additive and the
migration is a nullable-with-default column plus an index, neither of which the
old code reads. But it restores a system where a hundred-message thread reaches
the model as one message, so it is a last resort rather than a first response.

## Verifying the deploy

```bash
export QA_LAB_BASE=https://<host>/api/v1
export QA_LAB_EMAIL=… QA_LAB_PASSWORD=…
node scripts/qa-lab/verify-fix.mjs                 # ~15 min, 24 threads
node scripts/qa-lab/authorization-experiment.mjs   # ~3 min, release blocker
node scripts/qa-lab/memory-experiment.mjs          # ~2 min, preview vs generation
```

Expected: recall at 100% for every phrasing, 13/13 authorization probes denied,
and preview and generation returning identical memory id lists. Only PAYG-exempt
models execute — the harness refuses anything else in code.

## Cost

Prompts get larger, and on metered providers larger prompts cost more. Bounded
by:

- 96,000 tokens of history, even on a million-token window
- 15% of the input budget for cross-thread material, subtracted before the
  conversation is fitted
- cross-thread being off by default

Provider prompt caching is the intended mitigation and is not built. Reducing
context to save money should be a stated product policy, never a silent default.

## See also

- [Conversational context architecture](../03-architecture/conversational-context.md)
- [Context loss triage](../11-runbooks/context-loss-triage.md)
- [`skills/audit-conversational-context.md`](../../skills/audit-conversational-context.md)
