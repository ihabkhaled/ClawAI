# ADR-087: Cross-thread retrieval, and why it is off by default

**Status**: Accepted
**Date**: 2026-08-30
**Deciders**: ClawAI core team
**Slice**: Conversational intelligence (context flagship, Batch 2)

## Context

[ADR-086](adr-086-conversational-context-composer.md) fixed what a thread knows
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

### D9 — One bounded scan per term, weighted by rarity

Stage 1 originally asked one query: every search term `OR`ed together, ordered
by recency, capped at 200 rows. Two defects hid inside that single line.

**The cap was shared.** A term the account uses constantly filled all 200 rows
on its own, and because the window is ordered by recency rather than relevance,
the rare term that identifies the right conversation was evicted by the common
term that identifies nothing. Measured live: `findCandidateThreads: 10
candidates from 200 hits`, with the thread that had stated the fact minutes
earlier absent from all ten.

**The terms were chosen by word length.** Words were ranked longest-first — a
weak proxy for how discriminating a word is, and one that ranked the failing
case exactly backwards. A prompt asking for a canary cohort codename yielded
`conversation`, `containing`, `genuinely`, `operation`, `workspace`,
`inventing` as its six terms. `cohort` and `canary` never reached the database
at all, so no amount of ranking downstream could have recovered them.

The scan is now **one bounded query per term** (`CROSS_THREAD_SCAN_PER_TERM`),
so a rare term's thread always enters the candidate set whatever the common
terms did — it is no longer competing with them for the same rows. A term that
fills its own slice is treated as a word the account says all the time and its
hits are weighted down to a floor (`CROSS_THREAD_COMMON_TERM_WEIGHT`) rather
than discarded, so a thread matching only common words can still rank, just
never above one matched by a term that appears in a handful of messages in the
whole history.

That weighting is what makes the word cap affordable, so it rose from 6 to 12
(`SALIENT_SEARCH_WORD_LIMIT`). The cap is now a spend limit rather than a
relevance filter: including a common word costs one small query and earns
almost nothing, and excluding the rare word ranked below it costs the feature.
Length survives as the tie-breaker it is good enough to be.

**Cost.** Up to twelve indexed queries of forty rows each, in place of one of
two hundred. Each is narrower than the query it replaces, and they run
concurrently.

### D10 — A message is scored on the search terms, not only on resembling the prompt

Stage 2 ranked each message by how much it resembles what the user just asked.
That is the obvious measure and, alone, the wrong one: **an answer does not
resemble its question.** It supplies the words the question was missing.

Measured against the prompt "In an earlier conversation I gave you the canary
cohort codename for ClawAI releases":

| Candidate message                                          | Score | Threshold           |
| ---------------------------------------------------------- | ----- | ------------------- |
| `The canary cohort for ClawAI releases is PEREGRINE-7742.` | 0.17  | 0.22 — **rejected** |
| the question above, restated verbatim                      | 1.00  | **top of the list** |

So retrieval preferred the question to the answer by construction, and the
higher a candidate scored the less it could possibly add. A user who asks the
same thing in several conversations accumulates near-identical copies of their
own question; the live corpus had three such threads, each with `has_answer =
0`, all outranking the one thread that held the fact. **Retrieval was handing
back its own past failures, paid for out of the answer's budget.**

Two changes, both following from the same observation:

- A message also scores on the **share of search terms it contains**
  (`CROSS_THREAD_TERM_MATCH_WEIGHT`), by substring, which is exactly what the
  database did to select the thread. Scoring on a different notion of "matches"
  than the query used would rank messages by a rule that never chose them. The
  terms that earned a thread its place are the terms that mark the messages
  worth reading inside it.
- A message whose overlap with the prompt is at or above
  `CROSS_THREAD_NEAR_DUPLICATE_OVERLAP` is **discarded**. The ceiling is
  deliberately high: a previous conversation legitimately restates part of a
  question before answering it, and only something close to verbatim carries
  nothing.

The two work as a pair. Term matching lets an answer win; the ceiling stops the
question from winning anyway by being a perfect match for itself.

### D11 — The blind stage ranks; it no longer rejects

Stage 1 sees a title, a weighted hit count and a timestamp. Stage 2 sees the
text. Stage 1 nevertheless decided which three threads stage 2 was allowed to
look at, which is the wrong way round, and it decided wrongly in exactly the
case this feature exists for: the three best-ranked threads were three previous
askings of the same question (`has_answer = 0` on all three), and the thread
holding the answer ranked ninth of ten.

Every candidate now has its messages read. Two supersessions follow:

- `CROSS_THREAD_THREAD_SCORE_THRESHOLD` and the one-candidate content-look
  escape hatch it needed are **removed**. The threshold existed to stop an
  unrelated conversation being imported, and the per-message threshold does
  that better, having actually read the message.
- `CROSS_THREAD_MESSAGES_PER_THREAD` becomes `CROSS_THREAD_MESSAGE_SCAN_LIMIT`,
  a **total across threads**, split evenly with a floor. Widening the read from
  three threads to ten therefore costs nothing: the same 120 rows, spread
  wider and shallower.

Stage 2's read had the same shared-cap defect the candidate scan did — one
`take` across every thread, ordered by recency, so the busiest conversation
could take the whole window from the others. It is now one bounded query per
thread, as stage 1 is.

**What this trades.** Twelve messages per thread instead of forty. A fact
buried deep in a long conversation is now likelier to fall outside the window,
while a fact stated in a quiet thread is far likelier to be found at all. The
second case is the one users hit; the first is the one summarisation is for.

### D12 — A thread is ranked by the rarest term it matched, not by how many

Summing matched terms survived two attempts to tune it, because the corpus a
term's rarity is measured against **contains the question**.

Measured, asked for a `ruzeru` cohort codename:

| Term                                 | Messages in the account | Classed  | Occurs in                                                            |
| ------------------------------------ | ----------------------- | -------- | -------------------------------------------------------------------- |
| `ruzeru`                             | 2                       | rare     | the conversation holding the answer                                  |
| `inventing`                          | 32                      | **rare** | nothing but this question's own phrasing, "instead of inventing one" |
| `cohort`, `codename`, `workspace`, … | 40+                     | common   | everywhere                                                           |

Every previous asking of the question therefore earned a full-weight hit from
the question's own filler and scored 1.07, while the conversation that stated
the answer scored 1.03 and was cut. No weighting of a _sum_ fixes this: the
signal genuinely points at those threads, because they really do contain those
words.

Rarity is now continuous — `1 / log₂(2 + hits)`, so a word used twice is
separated from one used thirty times — and a thread is ranked by the **rarest
term it matched**, with everything else contributing only
`CROSS_THREAD_SECONDARY_TERM_WEIGHT` as a tie-break. The conversation holding
the answer then ranks first by roughly two to one.

`matchingMessageCount` is renamed `termRarity`, because it had stopped being a
count some time before anyone noticed.

### D13 — Entity overlap is not scored when the prompt has no entities

`entityOverlap` answers 0 for a prompt with nothing to overlap. That is
correct, and it was being read as "nothing matched": the caller weighted it at
0.6, so **every prompt phrased in ordinary words lost 60% of the scale** and
could not score above 0.4 however well it matched.

This is the one that kept the feature dark after the thread ranking was already
right. Measured: the conversation holding the answer ranked **first of ten**,
and its message scored **0.217** against a 0.22 threshold — rejected by 0.003,
by a penalty for containing no coined identifier, in the exact case the feature
exists for.

The weight is redistributed when there is nothing to weigh: with entities,
0.6/0.4 as before; without, lexical overlap alone. `hasEntities` exists so a
caller can tell "no entities matched" from "there were no entities to match".

### D14 — The ranking is logged, not re-derived

Four of the defects above were diagnosed by rebuilding the ranking in SQL after
the fact, because the log said `10 candidates` and nothing about which ten.
Stage 1 now logs each candidate with its score, and stage 2 logs what every
message scored, so a near-miss reads as a near-miss rather than as silence.
A ranking that cannot be read back is a ranking that gets guessed at.

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

**Not vector search.** Ranking is `ILIKE` term matching plus entity, lexical,
term-hit and volume scoring. It has no semantic recall: a thread about
"Postgres" will not match a prompt about "relational databases".
Embedding-based retrieval is the next batch, and this design leaves room for it
— stage 1's candidate query is the only thing that would change.

Worth naming precisely, because "it is only lexical" was used for months to
explain a failure that lexical matching was not causing. Every defect D9–D13
fixed was a **bound, a ranking rule or a scoring weight**, not a missing
embedding: a shared scan cap, terms chosen by word length,
similarity-to-the-question used as a proxy for usefulness, a blind stage
vetoing a sighted one, rarity summed instead of maximised, and 60% of the score
withheld from any prompt without a coined identifier. Each was invisible behind
the same sentence, and the last one was worth 0.003 against a threshold.

With all six fixed, the round that had been red for months passes with a fresh
unique fact every time. Before reaching for semantics again, check what the
query actually asked for and what the scorer actually rewarded.

**Not summaries.** Stage 2 selects raw messages. When hierarchical
summarisation lands it becomes a better input to both stages.

## References

- [ADR-086](adr-086-conversational-context-composer.md) — the composer this budgets against
- [`docs/03-architecture/conversational-context.md`](../03-architecture/conversational-context.md)
- `scripts/qa-lab/cross-thread-experiment.mjs` — the verification above
