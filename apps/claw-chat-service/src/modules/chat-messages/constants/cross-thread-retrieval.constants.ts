/**
 * Cross-thread retrieval bounds.
 *
 * Every number here caps a read or a spend. Retrieval across a user's whole
 * history is the one context source that grows without limit as the account
 * ages, so it is the one that must be bounded at every stage rather than
 * trusted to a relevance score. ADR-087.
 */

/** Threads that survive stage 1 ranking. */
export const CROSS_THREAD_CANDIDATE_LIMIT = 10;

/**
 * Threads whose messages are read in stage 2.
 *
 * Every candidate, deliberately. Stage 1 judges without reading a single
 * message — it knows a title, a weighted hit count and a timestamp — and stage
 * 2 is the part that sees the text. Letting the blind stage decide which three
 * threads the sighted one may look at was what kept the answer out of reach:
 * the three best-ranked threads were three previous askings of the same
 * question, and the thread holding the answer ranked ninth.
 *
 * The cheap filter now ranks rather than rejects. Cost does not rise, because
 * the message budget below is a total across threads rather than a per-thread
 * allowance.
 */
export const CROSS_THREAD_SELECTED_LIMIT = CROSS_THREAD_CANDIDATE_LIMIT;

/**
 * Messages read in stage 2, across every selected thread combined.
 *
 * A total rather than a per-thread allowance, and split evenly, so widening
 * the read from three threads to ten costs nothing extra. Read per thread, as
 * it was, one chatty conversation would take the whole window from the nine
 * others — the same defect the candidate scan had.
 */
export const CROSS_THREAD_MESSAGE_SCAN_LIMIT = 120;

/** Messages read per thread however many threads share the budget. */
export const CROSS_THREAD_MIN_MESSAGES_PER_THREAD = 8;

/** Messages that may reach the prompt, across all selected threads combined. */
export const CROSS_THREAD_PROMPT_MESSAGE_LIMIT = 8;

/**
 * Share of the input budget cross-thread material may take.
 *
 * Kept deliberately small. The current conversation is what the user is
 * actually in; another thread's content earns its place only by being clearly
 * relevant, and a large share would let history crowd out the live discussion.
 */
export const CROSS_THREAD_BUDGET_SHARE = 0.15;

/**
 * Score a thread starts from when it was found by a coined identifier.
 *
 * Above `CROSS_THREAD_THREAD_SCORE_THRESHOLD` on purpose: matching
 * `MERIDIAN-88` is not weak evidence that the thread is about MERIDIAN-88, and
 * making such a thread also clear a relevance bar computed from its title would
 * discard the strongest signal the feature has.
 */
export const CROSS_THREAD_IDENTIFIER_MATCH_SCORE = 0.35;

/** Minimum score for an individual message once its thread has been selected. */
export const CROSS_THREAD_MESSAGE_SCORE_THRESHOLD = 0.22;

/**
 * A prompt shorter than this in meaningful tokens does not trigger retrieval.
 *
 * "ok", "thanks" and "go on" match many old conversations weakly and none of
 * them strongly. Retrieval on such a prompt is noise by construction.
 */
export const CROSS_THREAD_MIN_INTENT_TOKENS = 3;

/**
 * How much a recent thread's existing relevance is amplified.
 *
 * A multiplier, never an addition. A thread with no lexical evidence must not
 * become relevant by being recent — that would make every retrieval return
 * whatever the user did last. It lifts a thread that already matched, which is
 * the case that was failing: a thread that states a fact once, minutes ago,
 * scored below the threshold because `evidence` counts matching messages and a
 * short thread has few. A long, rambling, older thread outranked it.
 */
export const CROSS_THREAD_RECENCY_AMPLIFICATION = 0.5;

/** Recency bands, newest first: [maximum age in milliseconds, weight]. */
export const CROSS_THREAD_RECENCY_BANDS: readonly (readonly [number, number])[] = [
  [60 * 60 * 1_000, 1],
  [24 * 60 * 60 * 1_000, 0.6],
  [7 * 24 * 60 * 60 * 1_000, 0.3],
];

/**
 * Matching messages read per search term.
 *
 * The scan used to be one `OR` query with a single cap, and that cap was the
 * bug. A term that matches half the account fills the window on its own, and
 * because the window is ordered by recency, the rare term that identifies the
 * right thread is evicted by the common term that identifies nothing. Measured
 * live: `10 candidates from 200 hits`, none of them the thread holding the
 * fact.
 *
 * One bounded slice per term instead. A rare term's thread always enters the
 * candidate set, whatever the common terms did, because it is no longer
 * competing with them for the same rows.
 */
export const CROSS_THREAD_SCAN_PER_TERM = 40;

/**
 * How much the rest of a thread's matched terms count beside its rarest one.
 *
 * A thread is ranked by the most distinctive thing it matched, not by how many
 * things it matched, and everything else only breaks ties. Summing was the
 * defect, and it survived two attempts to tune it, because the corpus a term's
 * rarity is measured against **contains the question**.
 *
 * Measured: asked for a `ruzeru` cohort codename, the word `ruzeru` appeared in
 * 2 messages in the whole account and `inventing` in 32 — so `inventing`
 * counted as rare, and it occurs nowhere but in this question's own phrasing,
 * "instead of inventing one". Every previous asking therefore earned a
 * full-weight hit from the question's own filler and scored 1.07, while the
 * one conversation that stated the answer scored 1.03 and was cut. Ranking by
 * the rarest term matched puts it first instead, by roughly two to one.
 */
export const CROSS_THREAD_SECONDARY_TERM_WEIGHT = 0.05;

/**
 * Overlap at which a retrieved message is a restatement of the prompt.
 *
 * Message scoring ranks by similarity to what the user just asked, which
 * treats maximum similarity as maximum usefulness. A message that IS the
 * prompt therefore scores at the top — and carries no information the model
 * does not already have, while spending budget that a real answer needed.
 *
 * Measured: a user who asks the same question in several conversations
 * accumulates near-identical copies of their own question, and those copies
 * outrank the one thread that holds the answer. Retrieval was handing back its
 * own past failures.
 *
 * Deliberately high. A previous conversation legitimately restates parts of a
 * question before answering it; only something close to verbatim is discarded.
 */
export const CROSS_THREAD_NEAR_DUPLICATE_OVERLAP = 0.8;

/**
 * Weight of the search terms in a message's score.
 *
 * A message used to be scored purely on how much it resembles the prompt, and
 * an answer does not resemble its question — it introduces the words the
 * question was missing. Measured: "The canary cohort for ClawAI releases is
 * PEREGRINE-7742." scored 0.17 against a 0.22 threshold for the question that
 * asked for exactly that, while the question restated verbatim scored 1.00.
 * Retrieval preferred the question to the answer by construction.
 *
 * The terms that earned a thread its place are the terms that identify the
 * useful messages inside it, so they are scored directly rather than through
 * the sentence that happened to contain them.
 */
export const CROSS_THREAD_TERM_MATCH_WEIGHT = 0.5;
