# Conversational context

How ClawAI decides what a model is told about a conversation, how to observe
that decision, and what it still cannot do.

> **The one sentence to keep.** "The message is visibly in the thread" and "the
> model was actually given the information" are different claims. Everything
> below exists to keep them distinguishable.

## The pipeline

```text
thread rows (up to THREAD_HISTORY_FETCH_LIMIT = 400)
        │
        ▼
ContextAssemblyManager.assemble()
        │  fetches memories, context packs, files, workspace citations, research
        │  measures their token cost  ─────────────► systemOverheadTokens
        │
        ├─► routing-service: GET /internal/router-models/context-window/:provider/:model
        │                                             ─────────────► contextWindowTokens
        ▼
resolveModelTokenBudget()
        │  contextWindowTokens
        │  − reservedOutputTokens   (from the thread's maxTokens)
        │  − systemOverheadTokens   (measured, not assumed)
        │  − toolOverheadTokens
        │  = availableInputTokens   (capped at MAX_HISTORY_INPUT_TOKENS)
        ▼
ContextComposerManager.select()
        │  group into turns → classify P0..P3 → rank → fit to budget
        ▼
AssembledContext { threadMessages, modelBudget, conversationManifest }
        │
        ├─► buildChatMessages()  → provider adapters (OpenAI / Anthropic / Gemini / Ollama)
        └─► receiptFromAssembledContext() → context receipt → the inspector UI
```

## The rule that makes it work

> **Nothing removes a message for being irrelevant. The only reason a message
> is left out is that the token budget ran out.**

Relevance decides **order**. Order only matters once the budget is full. On a
128k window with an ordinary thread, nothing is dropped at all.

This is an inversion. The previous selector's default was _exclude unless proven
relevant_, and every measured failure was that default firing — see
[ADR-084](../13-adr/adr-084-conversational-context-composer.md) for the numbers.

## Priority classes

| Class          | What                                              | Evicted                                       |
| -------------- | ------------------------------------------------- | --------------------------------------------- |
| `P0_REQUIRED`  | The current turn                                  | Never — placed before the budget is consulted |
| `P1_RECENT`    | The last `RECENT_TURNS_ALWAYS_KEPT` (12) turns    | Only after P2 and P3                          |
| `P2_RETRIEVED` | Older turns scoring ≥ `RETRIEVAL_SCORE_THRESHOLD` | Third                                         |
| `P3_OPTIONAL`  | Everything else                                   | First                                         |

Eviction never walks from "oldest". The oldest message is often the one that
named the project or chose the database.

`MIN_TURNS_FLOOR` (3) guarantees a conversation rather than an isolated
question even on a tiny window; when the floor forces an overspend the manifest
carries `INPUT_BUDGET_EXCEEDED_BY_FLOOR`.

## Turns, not messages

A turn is a `USER` message plus every `ASSISTANT` / `TOOL` / `SYSTEM` message
until the next `USER` message. Turns are included whole or not at all.

Half a turn is worse than none: an assistant answer with no question reads as an
unprompted assertion, and a question with no answer invites a second answer.

## Relevance scoring

Hybrid, four signals, weights in `RELEVANCE_WEIGHTS`:

| Signal     | Weight | Why it is there                                                                                                                                 |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `lexical`  | 0.35   | Word overlap. The weakest signal — it was previously the **only** one, used as a hard gate at 0.45.                                             |
| `entity`   | 0.30   | Coined identifiers (`ORCHID-731`) and bare numbers (`7`). The old tokenizer destroyed both: it required ≥4 characters and stripped punctuation. |
| `decision` | 0.20   | `DECISION_MARKER_PATTERN` — must, never, decided, replace, instead, agreed.                                                                     |
| `recency`  | 0.15   | Distance-decayed, so the later of two equally relevant turns wins. This is what currently serves latest-value precedence.                       |

## Reference detection

`detectReferenceSignal` replaces `isLikelyFollowUp`. Six detectors:
`TEMPORAL_REFERENCE`, `ORDINAL_SELECTION`, `DEFINITE_ARTIFACT`,
`BARE_IMPERATIVE`, `PRONOUN`, `CONTINUATION`, plus a short-prompt heuristic.

The critical property is **not** that it is more accurate. It is that a
`false` answer no longer removes anything. `referential` raises the rank of
older turns; recent turns are sent either way. A detector that can only add
cannot cause the failure the old one caused.

## Token budgeting

Five quantities that used to be one number called `maxTokens`:

| Field                  | Meaning                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `contextWindowTokens`  | The model's real window, from the catalog                  |
| `reservedOutputTokens` | Held for the answer. **This** is what `maxTokens` feeds    |
| `systemOverheadTokens` | Measured cost of prompt, memories, packs, files, citations |
| `toolOverheadTokens`   | Tool schemas and transcripts                               |
| `availableInputTokens` | What conversation may spend                                |

`source` records provenance: `MODEL_CATALOG`, `PROVIDER_DEFAULT` or
`CONSERVATIVE_FALLBACK`. If you see `CONSERVATIVE_FALLBACK` in production, the
catalog row for that model is unenriched — fix the catalog, not the budget.

`MAX_HISTORY_INPUT_TOKENS` (96k) caps history even on a 1M window: such prompts
are slow, expensive on metered providers, and recall degrades in the middle of
very long prompts.

## Observability

Every generation writes a `ConversationContextManifest` into the context
receipt (`GET /api/v1/chat-messages/:id/context-receipt`), surfaced by the
thread context inspector.

It carries: included message ids, omitted ids with a per-message
`ContextOmissionReason`, turn count, estimated input tokens, the full budget
with its provenance, and which reference detectors fired.

The receipt used to skip itself when there were no memories and no pack
items — the overwhelming majority of chat turns — so the one surface that could
have shown the failure did not exist for the threads that had it.

## The QA lab

`scripts/qa-lab/` runs deterministic scenarios against a live deployment.

```bash
node scripts/qa-lab/paraphrase-experiment.mjs      # the decisive experiment
node scripts/qa-lab/run-lab.mjs --label BASELINE --suite full --workers 6
```

**Only PAYG-exempt providers can execute.** `client.mjs` refuses anything else
in code (`assertFree`), not by naming convention — `ALLOW_METERED = false` is
the `QA_ALLOW_METERED_MODELS=false` contract. Threads are prefixed
`QA-LAB-{runId}-{scenario}`.

Scoring is deterministic regex/keyword matching. No judge model: a judge would
itself be a metered call and would blur "the context system failed" with "the
judge disagreed".

## What this does NOT do

Stated plainly so nobody plans against a capability that is absent.

| Not built                                  | Consequence today                                                                                                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cross-thread retrieval**                 | Asking a new thread to continue an old project retrieves nothing. Measured: `cross_thread_recall` fails. `wrong_thread_retrieval` passes only because there is nothing to retrieve.                                                   |
| **Hierarchical summarisation**             | Beyond `THREAD_HISTORY_FETCH_LIMIT` (400 rows) the oldest content is simply not loaded.                                                                                                                                               |
| **Structured thread state / supersession** | Latest-value precedence is served by recency weighting, not by an explicit supersedes graph. It is a strong heuristic, not a guarantee.                                                                                               |
| **Semantic/vector same-thread retrieval**  | P2 ranking is lexical + entity + decision + recency. No embeddings.                                                                                                                                                                   |
| **Canonical memory retrieval in chat**     | Chat still calls the legacy `GET /internal/memories/for-context`; `context-preview` calls the canonical `POST /internal/memories/retrieve`. **The preview a user is shown is produced by a different code path from the generation.** |
| **Per-user context settings**              | "Use relevant previous chats" does not exist because the retrieval it would toggle does not exist.                                                                                                                                    |

## See also

- [ADR-084](../13-adr/adr-084-conversational-context-composer.md) — the decision and the evidence
- [Context loss triage](../11-runbooks/context-loss-triage.md) — the runbook
- [`skills/audit-conversational-context.md`](../../skills/audit-conversational-context.md) — how to re-run the lab
