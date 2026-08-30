# Runbook: "the AI forgot something we discussed"

The single most common context complaint, and the one that used to be
unanswerable. Work the steps in order; each rules out one layer.

## 0. Get the message id

Ask for the assistant message that got it wrong, not the one that stated the
fact. You need what the model was given at the moment it answered.

## 1. Read the receipt — this is the whole runbook in one call

```bash
curl -s "https://<host>/api/v1/chat-messages/<messageId>/context-receipt" \
  -H "Authorization: Bearer <user token>" | jq .conversation
```

Users can reach the same data from the `[debug]` badge under the message.

| What you see                                                         | What it means                                                                          | Do this                                                                 |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `conversation` is **absent**                                         | Message predates ADR-086, or was produced by a lane that does not yet build a manifest | Reproduce on a new message before investigating further                 |
| `includedMessageIds` contains the message that stated the fact       | **The model was told and did not use it.** Not a context bug                           | Model-quality issue. Try another model; check whether the model refused |
| That message is in `omittedMessageIds` with `TOKEN_BUDGET_EXHAUSTED` | Genuine budget pressure                                                                | Go to step 2                                                            |
| That message is in `omittedMessageIds` with `LOW_RELEVANCE`          | It was older than the recent window and did not rank                                   | Go to step 3                                                            |
| Neither included **nor** omitted                                     | It was never loaded from the database                                                  | Go to step 4                                                            |

## 2. `TOKEN_BUDGET_EXHAUSTED` — check the budget's provenance

```bash
… | jq '.conversation | {contextWindowTokens, contextWindowSource, availableInputTokens, estimatedInputTokens, reservedOutputTokens}'
```

- **`contextWindowSource: "CONSERVATIVE_FALLBACK"`** — routing-service could not
  tell chat-service the window, so it budgeted 8192 tokens for a model that may
  hold 256k. This is the most likely cause of a surprising truncation. Check:
  - chat-service logs for `findContextWindowTokens: … failed` or
    `no catalog row for <provider>/<model>`
  - the catalog row: `GET /api/v1/routing/models?search=<model>` — is
    `contextWindowTokens` null? If so the model is executable but unenriched.
    Re-run catalog enrichment; the client caches for 15 minutes.
- **`contextWindowSource: "PROVIDER_DEFAULT"`** — same cause, milder (32,768).
- **`availableInputTokens` much smaller than `contextWindowTokens`** — something
  is eating overhead. A large attached file is the usual culprit; compare
  `systemOverheadTokens` against the reply.
- **`estimatedInputTokens` at `MAX_HISTORY_INPUT_TOKENS` (96,000)** — the thread
  is genuinely enormous. This is the designed ceiling, not a fault.

## 3. `LOW_RELEVANCE` — expected, and bounded

The message was outside the last 12 turns and did not rank into P2. This is only
a bug if the budget had room: check `estimatedInputTokens` against
`availableInputTokens`. If there was room and it was still omitted, the fit loop
has a defect — file it with the receipt attached.

If there was genuinely no room, the honest answer is that the thread has
outgrown the raw window, and hierarchical summarisation (not yet built, see
[the architecture doc](../03-architecture/conversational-context.md)) is the fix.

## 4. Never loaded — the fetch cap

`THREAD_HISTORY_FETCH_LIMIT` is 400 rows. A message older than that in a very
long thread cannot be recovered by any budget: it never left the database.

Confirm with the thread's total message count. If the thread is under 400
messages and the row still was not loaded, check whether the message was created
**after** the routed user message — `resolveRoutedMessageWindow` deliberately
cuts everything newer than the turn being answered.

## 4b. "It did not remember my other conversation"

A different complaint with a different answer. Read the same receipt:

```bash
… | jq '.conversation | {crossThreadSkipReason, priorThreadsSearched, priorThreadsUsed}'
```

| `crossThreadSkipReason` | Meaning                                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DISABLED`              | The thread has not opted in. This is the default. Turn on **Use relevant previous chats** in thread settings.                                                              |
| `INTENT_TOO_SHORT`      | The prompt had too few meaningful words to search on. Ask a fuller question.                                                                                               |
| `NO_CANDIDATES`         | No other thread of this user mentions the prompt's salient terms. If the user is sure it does, check they are naming it the same way — search is term-based, not semantic. |
| `NO_RELEVANT_THREAD`    | Threads matched but none ranked highly enough.                                                                                                                             |
| `NO_RELEVANT_MESSAGE`   | A thread was read; no individual message cleared the bar.                                                                                                                  |
| `NO_BUDGET`             | The 15% share left no room. Rare; means the prompt is already enormous.                                                                                                    |
| `RETRIEVAL_FAILED`      | The read errored. Check chat-service logs for `CrossThreadRetrievalManager retrieve: failed`. The turn proceeded without it, by design.                                    |
| `null`                  | Retrieval ran and contributed. `priorThreadsUsed` names what it used.                                                                                                      |

**If `priorThreadsUsed` is empty and the model still produced an answer, the
model made it up.** That is a hallucination, not a retrieval leak, and the two
have different fixes. Do not report it as a privacy incident — the manifest is
the record of what was supplied.

Archived threads are never retrieved, and a deleted thread leaves nothing to
retrieve (messages cascade on delete).

## 5. Ruling out the memory path

A memory is not conversation. If the missing item was a saved memory rather than
a message, read `.memories` on the same receipt.

Generation and preview now read the SAME route
(`POST /internal/memories/retrieve`), so they agree. If they ever disagree
again, that is the F-05 regression returning and
`scripts/qa-lab/memory-experiment.mjs` will show it in one run.

If memory-service returns nothing at all, check chat-service logs for
`fetchMemories: memory-service retrieve failed status=401` — that is the
service token, not the memories. Retrieval is non-blocking by design, so the
answer still arrives, just without memory.

## 6. Reproducing deliberately

```bash
cd scripts/qa-lab
node paraphrase-experiment.mjs
```

Plants one fact, asks for it four ways at a fixed distance, and prints the
static prediction beside the measured result. If recall varies by phrasing, a
relevance gate has been reintroduced somewhere — that is exactly the defect
ADR-086 removed.

Only PAYG-exempt models can run: `client.mjs` refuses metered providers in code.

## Deploy-order symptom

`fetchMemories: memory-service retrieve failed status=401` in chat-service logs
means memory-service was deployed before chat-service and workspace-service.
memory-service's internal routes now require a service token that only the
newer callers send. Answers still arrive — memory is non-blocking — but without
memories. Deploy the callers, then memory-service. See the
[rollout guide](../08-runtime-devops/conversational-context-rollout.md).

## Escalation

Attach: the message id, the full `conversation` block, the thread's message
count, the provider/model, and the chat-service log lines for
`ContextComposerManager select:` around that generation. The composer logs
included/total messages, turns, tokens, window and its source on every call.
