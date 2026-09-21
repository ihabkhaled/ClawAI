import { Injectable, Logger } from '@nestjs/common';
import {
  CROSS_THREAD_BUDGET_SHARE,
  CROSS_THREAD_IDENTIFIER_MATCH_SCORE,
  CROSS_THREAD_MESSAGE_SCORE_THRESHOLD,
  CROSS_THREAD_MIN_INTENT_TOKENS,
  CROSS_THREAD_NEAR_DUPLICATE_OVERLAP,
  CROSS_THREAD_PROMPT_MESSAGE_LIMIT,
  CROSS_THREAD_RECENCY_AMPLIFICATION,
  CROSS_THREAD_SELECTED_LIMIT,
  CROSS_THREAD_TERM_MATCH_WEIGHT,
} from '../constants/cross-thread-retrieval.constants';
import { recencyWeight, termMatchRatio } from '../utilities/cross-thread-scoring.utility';
import { CrossThreadRetrievalRepository } from '../repositories/cross-thread-retrieval.repository';
import {
  type CrossThreadCandidate,
  type CrossThreadMessageRow,
  type CrossThreadRetrievalResult,
  type CrossThreadSelection,
  CrossThreadSkipReason,
} from '../types/cross-thread-retrieval.types';
import { entityOverlap, hasEntities, lexicalOverlap } from '../utilities/history-relevance.utility';
import { estimateTokensFromText } from '../utilities/token-estimator.utility';
import { meaningfulTokenCount } from '../utilities/intent-tokens.utility';
import { extractSalientTerms, searchTermsFor } from '../utilities/salient-terms.utility';

/**
 * Relevant material from the user's OTHER conversations.
 *
 * Two stages, because one is not safe. Stage 1 asks the database which of the
 * user's threads actually mention the salient terms of the prompt, ranks them,
 * and keeps at most three; stage 2 reads only those threads and scores
 * individual messages. A single-stage search over every message a user
 * has ever sent would surface a sentence that happens to share vocabulary with
 * the prompt, torn out of a conversation about something else entirely — which
 * is precisely the "why is the AI talking about my other project" failure this
 * feature has to avoid being.
 *
 * Three properties hold at all times, in this order of importance:
 *
 *   1. USER-SCOPED, ALWAYS. Every read filters on userId — once when choosing
 *      candidate threads, once when reading their messages (ADR-087). Two
 *      filters rather than one because the thread ids arrive as an array from
 *      a caller, and a caller is exactly where a bug can substitute an id.
 *      This can surface a user's own past conversations and nothing else.
 *   2. OPT-OUT, NOT OPT-IN, since 2026-09-17. `useCrossThreadContext` defaults
 *      to true: an assistant that forgets what you told it in another
 *      conversation is the complaint this exists to answer. A thread can still
 *      turn it off.
 *   3. FAILS SILENT. A retrieval error returns nothing and records why. The
 *      current conversation must stay usable when the enhancement breaks.
 */
@Injectable()
export class CrossThreadRetrievalManager {
  private readonly logger = new Logger(CrossThreadRetrievalManager.name);

  constructor(private readonly repository: CrossThreadRetrievalRepository) {}

  async retrieve(args: {
    userId: string;
    currentThreadId: string;
    enabled: boolean;
    intent: string;
    availableInputTokens: number;
  }): Promise<CrossThreadRetrievalResult> {
    const empty = (skippedReason: CrossThreadSkipReason): CrossThreadRetrievalResult => ({
      selections: [],
      searchedThreadIds: [],
      usedThreadIds: [],
      skippedReason,
      estimatedTokens: 0,
    });

    if (!args.enabled) return empty(CrossThreadSkipReason.DISABLED);
    if (meaningfulTokenCount(args.intent) < CROSS_THREAD_MIN_INTENT_TOKENS) {
      return empty(CrossThreadSkipReason.INTENT_TOO_SHORT);
    }
    const tokenCeiling = Math.floor(args.availableInputTokens * CROSS_THREAD_BUDGET_SHARE);
    if (tokenCeiling <= 0) return empty(CrossThreadSkipReason.NO_BUDGET);

    try {
      return await this.run(args, tokenCeiling);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(
        `retrieve: failed for user=${args.userId} thread=${args.currentThreadId} — ${message}; continuing without cross-thread context`,
      );
      return empty(CrossThreadSkipReason.RETRIEVAL_FAILED);
    }
  }

  private async run(
    args: {
      userId: string;
      currentThreadId: string;
      intent: string;
      availableInputTokens: number;
    },
    tokenCeiling: number,
  ): Promise<CrossThreadRetrievalResult> {
    // Stage 1 asks the database a question rather than scoring everything: which
    // of this user's other threads actually mention what the prompt is about.
    const salient = extractSalientTerms(args.intent);
    const terms = searchTermsFor(salient);
    if (terms.length === 0) {
      return this.emptyResult(CrossThreadSkipReason.INTENT_TOO_SHORT);
    }
    const candidates = await this.repository.findCandidateThreads(
      args.userId,
      args.currentThreadId,
      terms,
    );
    if (candidates.length === 0) {
      return this.emptyResult(CrossThreadSkipReason.NO_CANDIDATES);
    }

    const scoredThreads = this.selectThreads(
      candidates,
      args.intent,
      salient.identifiers.length > 0,
    );

    if (scoredThreads.length === 0) {
      return this.emptyResult(CrossThreadSkipReason.NO_RELEVANT_THREAD);
    }

    const searchedThreadIds = scoredThreads.map((entry) => entry.candidate.threadId);
    this.logRanking(scoredThreads);
    const rows = await this.repository.findMessagesForThreads(args.userId, searchedThreadIds);

    // Relevance decides WHICH messages are eligible; recency decides which of
    // them survive the budget. Ranking the fill by score meant a token ceiling
    // could be spent entirely on old-but-wordy matches while last week's
    // conversation on the same subject was dropped — and "what did we decide
    // recently" is the question people actually ask across threads.
    this.logMessageScores(rows, args.intent, terms);
    const scoredMessages = rows
      .map((row) => this.scoreMessage(row, args.intent, terms))
      .filter((entry): entry is CrossThreadSelection => entry !== null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (scoredMessages.length === 0) {
      return {
        selections: [],
        searchedThreadIds,
        usedThreadIds: [],
        skippedReason: CrossThreadSkipReason.NO_RELEVANT_MESSAGE,
        estimatedTokens: 0,
      };
    }

    // Newest first, and STOP at the ceiling rather than skipping over an
    // expensive message to fit a cheaper older one. Continuing would quietly
    // reorder the pack by size, so a full pack would no longer be "the latest
    // bunch" — it would be "the latest cheap bunch".
    const selections: CrossThreadSelection[] = [];
    let spent = 0;
    for (const entry of scoredMessages) {
      if (selections.length >= CROSS_THREAD_PROMPT_MESSAGE_LIMIT) break;
      const cost = estimateTokensFromText(entry.content);
      if (spent + cost > tokenCeiling) break;
      selections.push(entry);
      spent += cost;
    }

    if (selections.length === 0) {
      return {
        selections: [],
        searchedThreadIds,
        usedThreadIds: [],
        skippedReason: CrossThreadSkipReason.NO_BUDGET,
        estimatedTokens: 0,
      };
    }

    const usedThreadIds = [...new Set(selections.map((entry) => entry.threadId))];
    this.logger.log(
      `retrieve: ${String(selections.length)} messages from ${String(usedThreadIds.length)} of ${String(searchedThreadIds.length)} searched threads, ${String(spent)}/${String(tokenCeiling)} tokens, user=${args.userId}`,
    );

    return {
      selections,
      searchedThreadIds,
      usedThreadIds,
      skippedReason: null,
      estimatedTokens: spent,
    };
  }

  /**
   * Which threads were ranked, and what they scored.
   *
   * Not just how many. Four rounds of one defect were diagnosed by re-deriving
   * the ranking in SQL afterwards, because the log said "10 candidates" and
   * nothing about WHICH ten. A ranking that cannot be read back is a ranking
   * that gets guessed at.
   */
  private logRanking(scored: readonly { candidate: CrossThreadCandidate; score: number }[]): void {
    this.logger.debug(
      `retrieve: ranked ${scored
        .map((entry) => `${entry.candidate.threadId}=${entry.score.toFixed(3)}`)
        .join(' ')}`,
    );
  }

  /**
   * Which candidate threads get their messages read.
   *
   * When nothing clears the cheap filter, the best candidate still gets its
   * content read. The filter judges without seeing a single message, and it
   * was rejecting the case this feature exists for: a fact stated once, in a
   * thread whose title says nothing about it. The message scorer is the
   * precise one, and it can only decide about threads it is given.
   */
  private selectThreads(
    candidates: readonly CrossThreadCandidate[],
    intent: string,
    searchedByIdentifier: boolean,
  ): { candidate: CrossThreadCandidate; score: number }[] {
    const ranked = candidates
      .map((candidate) => ({
        candidate,
        score: this.scoreThread(candidate, intent, searchedByIdentifier),
      }))
      .sort((a, b) => b.score - a.score);
    return ranked.slice(0, CROSS_THREAD_SELECTED_LIMIT);
  }

  /**
   * A thread's relevance.
   *
   * Evidence first: `termRarity` is how many of the thread's messages
   * actually mention a salient term, and a thread that says the thing forty
   * times is about it in a way a thread that says it once is not. The count is
   * damped logarithmically so a very long thread cannot win on volume alone.
   *
   * The title still contributes, because a title naming the subject is a strong
   * signal — but it can no longer be the only signal. Title-only ranking was
   * the first implementation and it failed its first live test: a thread that
   * had discussed MERIDIAN-88 for three turns carried a title that did not
   * name it, scored 0.03 against a 0.28 threshold, and was never read.
   */
  private scoreThread(
    candidate: CrossThreadCandidate,
    intent: string,
    searchedByIdentifier: boolean,
  ): number {
    const title = candidate.title ?? '';
    const titleScore =
      title.trim().length === 0
        ? 0
        : 0.6 * entityOverlap(title, intent) + 0.4 * lexicalOverlap(title, intent);
    // Damped so a very long thread cannot win on volume alone.
    const evidence = Math.min(1, Math.log2(1 + candidate.termRarity) / 3);
    // Matching on a coined identifier is already strong evidence — the query
    // itself was the precision gate — so such a candidate starts above the
    // threshold. A word-only match has to earn its place from repetition or a
    // title that names the subject.
    const base = searchedByIdentifier ? CROSS_THREAD_IDENTIFIER_MATCH_SCORE : 0;
    const relevance = 0.4 * evidence + 0.3 * titleScore;
    // Recency amplifies relevance; it never creates it. `evidence` counts
    // matching MESSAGES, so a thread that states a fact once — which is how
    // people actually record one — scored below the threshold while a long,
    // rambling, older thread on the same subject outranked it. Multiplying
    // means a thread with no lexical match stays at zero however recent it is,
    // so "what did I do last" cannot crowd out "what did I say about this".
    const amplified =
      relevance * (1 + CROSS_THREAD_RECENCY_AMPLIFICATION * recencyWeight(candidate.updatedAt));
    return Math.min(1, Math.max(base, 0) + amplified);
  }

  /**
   * How useful one message from another conversation is here.
   *
   * Resemblance to the prompt is the obvious measure and the wrong one on its
   * own, because an answer does not resemble its question — it supplies the
   * words the question lacked. Scoring the search terms directly is what lets
   * an answer win: the terms that earned this thread its place are the terms
   * that mark the messages worth reading inside it.
   */
  /** What every read message scored, so a near-miss is visible as a near-miss. */
  private logMessageScores(
    rows: readonly CrossThreadMessageRow[],
    intent: string,
    terms: readonly string[],
  ): void {
    this.logger.debug(
      `retrieve: read ${String(rows.length)} messages; scores ${rows
        .map((row) => `${row.threadId}:${this.messageScore(row, intent, terms).toFixed(3)}`)
        .join(' ')}`,
    );
  }

  /** The score alone, so the ranking can be logged without selecting anything. */
  private messageScore(
    row: CrossThreadMessageRow,
    intent: string,
    terms: readonly string[],
  ): number {
    // Entity overlap carries most of the weight when there are entities, and
    // none of it when there are not. Splitting 0.6/0.4 regardless meant a
    // prompt phrased in ordinary words could never score above 0.4 of the
    // scale, and the message holding the answer missed a 0.22 threshold by
    // 0.003 because of it.
    const lexical = lexicalOverlap(row.content, intent);
    const resemblance = hasEntities(intent)
      ? 0.6 * entityOverlap(row.content, intent) + 0.4 * lexical
      : lexical;
    return Math.max(
      resemblance,
      CROSS_THREAD_TERM_MATCH_WEIGHT * termMatchRatio(row.content, terms) +
        (1 - CROSS_THREAD_TERM_MATCH_WEIGHT) * resemblance,
    );
  }

  private scoreMessage(
    row: CrossThreadMessageRow,
    intent: string,
    terms: readonly string[],
  ): CrossThreadSelection | null {
    if (row.content.trim().length === 0) return null;
    const entity = entityOverlap(row.content, intent);
    const lexical = lexicalOverlap(row.content, intent);
    const termHit = termMatchRatio(row.content, terms);
    const score = this.messageScore(row, intent, terms);
    if (score < CROSS_THREAD_MESSAGE_SCORE_THRESHOLD) return null;
    // A message that restates the prompt is the highest-scoring message this
    // function can produce and the least useful one it can return: it tells
    // the model what the model was just told, and spends budget an answer
    // needed. Almost always it is the user's own question, asked before in
    // another conversation and left unanswered there too.
    if (lexical >= CROSS_THREAD_NEAR_DUPLICATE_OVERLAP) return null;
    const reasons: string[] = [];
    if (entity > 0) reasons.push(`entity:${entity.toFixed(2)}`);
    if (lexical > 0) reasons.push(`lexical:${lexical.toFixed(2)}`);
    if (termHit > 0) reasons.push(`terms:${termHit.toFixed(2)}`);
    return {
      messageId: row.messageId,
      threadId: row.threadId,
      threadTitle: row.threadTitle,
      role: row.role,
      content: row.content,
      score,
      reasons,
      createdAt: row.createdAt,
    };
  }

  private emptyResult(skippedReason: CrossThreadSkipReason): CrossThreadRetrievalResult {
    return {
      selections: [],
      searchedThreadIds: [],
      usedThreadIds: [],
      skippedReason,
      estimatedTokens: 0,
    };
  }
}
