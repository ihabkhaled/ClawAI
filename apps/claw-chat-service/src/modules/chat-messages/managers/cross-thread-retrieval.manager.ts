import { Injectable, Logger } from '@nestjs/common';
import {
  CROSS_THREAD_BUDGET_SHARE,
  CROSS_THREAD_IDENTIFIER_MATCH_SCORE,
  CROSS_THREAD_MESSAGE_SCORE_THRESHOLD,
  CROSS_THREAD_MIN_INTENT_TOKENS,
  CROSS_THREAD_PROMPT_MESSAGE_LIMIT,
  CROSS_THREAD_SELECTED_LIMIT,
  CROSS_THREAD_THREAD_SCORE_THRESHOLD,
} from '../constants/cross-thread-retrieval.constants';
import { CrossThreadRetrievalRepository } from '../repositories/cross-thread-retrieval.repository';
import {
  type CrossThreadCandidate,
  type CrossThreadMessageRow,
  type CrossThreadRetrievalResult,
  type CrossThreadSelection,
  CrossThreadSkipReason,
} from '../types/cross-thread-retrieval.types';
import { entityOverlap, lexicalOverlap } from '../utilities/history-relevance.utility';
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
 *   1. OFF BY DEFAULT. `useCrossThreadContext` defaults to false. Reaching into
 *      other conversations is a privacy decision and must be asked for.
 *   2. USER-SCOPED. Every read filters on userId, twice (ADR-085).
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

    const scoredThreads = candidates
      .map((candidate) => ({
        candidate,
        score: this.scoreThread(candidate, args.intent, salient.identifiers.length > 0),
      }))
      .filter((entry) => entry.score >= CROSS_THREAD_THREAD_SCORE_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, CROSS_THREAD_SELECTED_LIMIT);

    if (scoredThreads.length === 0) {
      return this.emptyResult(CrossThreadSkipReason.NO_RELEVANT_THREAD);
    }

    const searchedThreadIds = scoredThreads.map((entry) => entry.candidate.threadId);
    const rows = await this.repository.findMessagesForThreads(args.userId, searchedThreadIds);

    const scoredMessages = rows
      .map((row) => this.scoreMessage(row, args.intent))
      .filter((entry): entry is CrossThreadSelection => entry !== null)
      .sort((a, b) => b.score - a.score);

    if (scoredMessages.length === 0) {
      return {
        selections: [],
        searchedThreadIds,
        usedThreadIds: [],
        skippedReason: CrossThreadSkipReason.NO_RELEVANT_MESSAGE,
        estimatedTokens: 0,
      };
    }

    const selections: CrossThreadSelection[] = [];
    let spent = 0;
    for (const entry of scoredMessages) {
      if (selections.length >= CROSS_THREAD_PROMPT_MESSAGE_LIMIT) break;
      const cost = estimateTokensFromText(entry.content);
      if (spent + cost > tokenCeiling) continue;
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
   * A thread's relevance.
   *
   * Evidence first: `matchingMessageCount` is how many of the thread's messages
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
    const evidence = Math.min(1, Math.log2(1 + candidate.matchingMessageCount) / 3);
    // Matching on a coined identifier is already strong evidence — the query
    // itself was the precision gate — so such a candidate starts above the
    // threshold. A word-only match has to earn its place from repetition or a
    // title that names the subject.
    const base = searchedByIdentifier ? CROSS_THREAD_IDENTIFIER_MATCH_SCORE : 0;
    return Math.min(1, Math.max(base, 0) + 0.4 * evidence + 0.3 * titleScore);
  }

  private scoreMessage(row: CrossThreadMessageRow, intent: string): CrossThreadSelection | null {
    if (row.content.trim().length === 0) return null;
    const entity = entityOverlap(row.content, intent);
    const lexical = lexicalOverlap(row.content, intent);
    const score = 0.6 * entity + 0.4 * lexical;
    if (score < CROSS_THREAD_MESSAGE_SCORE_THRESHOLD) return null;
    const reasons: string[] = [];
    if (entity > 0) reasons.push(`entity:${entity.toFixed(2)}`);
    if (lexical > 0) reasons.push(`lexical:${lexical.toFixed(2)}`);
    return {
      messageId: row.messageId,
      threadId: row.threadId,
      threadTitle: row.threadTitle,
      role: row.role,
      content: row.content,
      score,
      reasons,
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
