# ADR-085: Cross-thread retrieval, and why it is off by default

**Status**: Accepted
**Date**: 2026-08-30
**Deciders**: ClawAI core team
**Slice**: Conversational intelligence (context flagship, Batch 2)

## Context

[ADR-084](adr-084-conversational-context-composer.md) fixed what a thread knows
about itself. It deliberately did not address the other half of the complaint:
starting a new conversation about a project discussed last week and finding that
ClawAI has never heard of it.

Measured before this change: a thread that had spent three turns establishing
facts about `MERIDIAN-88` was invisible to a new thread asking to continue it.
The `cross_thread_recall` probe failed and `wrong_thread_retrieval` passed —
the second only because there was nothing to retrieve.

This is a feature with a bad failure mode. Done carelessly it produces the
worst behaviour a conversational product can have: answering from a conversation
the user is not in, about a project they did not mention, with information they
may have shared in a different context entirely. The design is shaped more by
what it must refuse than by what it must find.

## Decision

### D1 — Off by default, and the default is a privacy decision

`ChatThread.useCrossThreadContext` defaults to `false`. Reaching into a user's
other conversations is not a quality tweak that can be switched on for
everybody; it must be asked for. The migration adds the column with
`DEFAULT false`, so every existing thread keeps behaving exactly as it did.

When it is off, the repository is **never called**. Opt-out means "not read",
not "read and then discarded" — the second still exposes the data to a bug in
whatever discards it. The manager returns `DISABLED` before touching anything.

Surfaced as one setting in thread settings, in all 13 locales: _"Use relevant
previous chats"_, described in the user's terms and stating that it is off by
default. No context-window mathematics reaches the user.

### D2 — Two stages, because one is not safe

**Stage 1** asks the database which of this user's threads actually mention the
salient terms of the prompt, and ranks them. **Stage 2** reads only the top
three and scores individual messages.

A single-stage search over every message a user has ever sent would surface a
sentence that happens to share vocabulary with the prompt, torn out of a
conversation about something else — which is precisely the "why is the AI
talking about my other project" failure this feature has to avoid being.

### D3 — A coined identifier is the precision gate

`extractSalientTerms` splits a prompt into identifiers (`MERIDIAN-88`,
`ORCHID-731`) and ordinary words. When an identifier is present, **it is the
only thing searched.**

"Continue the MERIDIAN-88 project. Which package manager did we standardise
on?" searched on `[MERIDIAN-88, project, package, manager]` matches every thread
that ever mentioned a package manager. Searched on `[MERIDIAN-88]` it matches
the one conversation the user means. Words are the fallback for prompts with no
identifier, so ordinary questions still work without dragging in half the
account.

### D4 — Stage 1 ranks on evidence, not on the thread title

The first implementation scored candidate threads by title alone. It failed its
first live test for an instructive reason: a thread that had discussed
`MERIDIAN-88` for three turns carried a title that did not name it, scored 0.03
against a 0.28 threshold, and was never read.

A title is auto-derived from the opening turn, is often absent, and can be
renamed to anything. **The evidence that a thread is about something is in the
thread.** Ranking now uses the count of matching messages (damped
logarithmically, so a long thread cannot win on volume alone), with the title as
a contributing signal rather than the only one.

### D5 — Every read is user-scoped, twice

`CrossThreadRetrievalRepository` has no method that can be called without a
`userId`, and none that accepts a thread id without re-proving ownership in the
same `WHERE` clause. Stage 2 does not trust the thread ids stage 1 handed it:
re-proving costs one join condition and removes the whole class of mistake,
and a cross-thread query that forgets its owner filter does not return slightly
wrong results — it returns another customer's conversation.

Archived threads are excluded. Archiving is the user saying "I am done with
this", and quietly resurrecting it as context contradicts that. Deleted threads
cannot appear at all: messages cascade on delete, so a removed conversation
leaves nothing behind for retrieval to find. That is the deletion-propagation
guarantee, and it holds because of the schema rather than because of a cleanup
job that might not run.

### D6 — It spends from the conversation's budget, not on top of it

Cross-thread material is capped at `CROSS_THREAD_BUDGET_SHARE` (15%) of
`availableInputTokens`, and what it spends is **subtracted before the composer
runs**. The live conversation is what the user is in; another thread earns room
only by being clearly relevant, and never by displacing the discussion in front
of them.

### D7 — Retrieved text is labelled as data, not instruction

The prompt block says so explicitly, names the source thread, and states that
the excerpts are not part of the current conversation. Retrieved content is a
standing prompt-injection surface, and a previous conversation may contain
anything the user once pasted. Unlabelled retrieved text is also how an
assistant ends up confidently asserting something the user never said in this
conversation.

### D8 — Seven named reasons for retrieving nothing

`CrossThreadSkipReason` distinguishes `DISABLED`, `INTENT_TOO_SHORT`,
`NO_CANDIDATES`, `NO_RELEVANT_THREAD`, `NO_RELEVANT_MESSAGE`, `NO_BUDGET` and
`RETRIEVAL_FAILED`, and the reason is written to the context receipt alongside
the threads searched and used. "Nothing was retrieved" is never ambiguous.

Retrieval **fails silent**: an error returns nothing and records
`RETRIEVAL_FAILED`. The current conversation must stay usable when the
enhancement breaks.

## Verification

Measured live against a deployment running this code, three threads, one model:

| Case                                    | Toggle | Retrieved                     | Result                              |
| --------------------------------------- | ------ | ----------------------------- | ----------------------------------- |
| New thread asks to continue MERIDIAN-88 | off    | nothing, `DISABLED`           | correct — the default holds         |
| Same question                           | on     | the three MERIDIAN-88 threads | correct — answered pnpm + Frankfurt |
| Asks about a project never discussed    | on     | nothing, `NO_CANDIDATES`      | correct                             |

The third case is worth reading carefully. The model _did_ produce an answer
("we standardized on pnpm for the SALTMARSH-… project") for a project that had
never been mentioned. The manifest shows nothing was retrieved, so this is a
model hallucination, not a retrieval leak. Scoring the experiment on the model's
words would have conflated the two; scoring it on the manifest keeps them apart.
That distinction is the reason the manifest exists.

An earlier version of the same experiment reported a false failure because its
decoy project name was fixed, so the _previous run's own decoy thread_ contained
the name and retrieval correctly found it. The decoy is now unique per run.

## Consequences

**Good.** "Continue the project we discussed last week" works. Retrieval is
explainable per message and per thread. The privacy default is enforced at the
earliest possible point rather than by filtering later.

**Cost.** One extra bounded query per turn, only for threads that opted in, and
up to 15% more prompt tokens on those turns.

**Precision over recall, deliberately.** Identifier-only search will miss a
previous conversation the user refers to purely descriptively ("the thing we
discussed about caching"). That is the intended trade: a miss asks the user to
be specific, a false positive imports the wrong conversation.

**Not vector search.** Ranking is `ILIKE` term matching plus entity, lexical and
volume scoring. It has no semantic recall: a thread about "Postgres" will not
match a prompt about "relational databases". Embedding-based retrieval is the
next batch, and this design leaves room for it — stage 1's candidate query is
the only thing that would change.

**Not summaries.** Stage 2 selects raw messages. When hierarchical
summarisation lands it becomes a better input to both stages.

## References

- [ADR-084](adr-084-conversational-context-composer.md) — the composer this budgets against
- [`docs/03-architecture/conversational-context.md`](../03-architecture/conversational-context.md)
- `scripts/qa-lab/cross-thread-experiment.mjs` — the verification above
