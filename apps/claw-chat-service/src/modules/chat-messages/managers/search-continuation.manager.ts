import { Injectable, Logger } from '@nestjs/common';

import { RESEARCH_PLANNER_MIN_OUTPUT_TOKENS } from '../../../common/constants/research-gate.constants';
import { PROMISE_JUDGE_BUDGET_MS } from '../constants/search-continuation.constants';
import { ResearchGateService } from '../services/research-gate.service';
import type { LlmResponse } from '../types/execution.types';
import type { PendingSearch } from '../types/search-continuation.types';
import {
  buildSearchPromisePrompt,
  detectStructuralPendingSearch,
  isSearchPromiseCandidate,
  parseSearchPromiseVerdict,
} from '../utilities/pending-search.utility';

/**
 * Whether a reply only promised a search (ADR-227). A web tool call or web-tool markup is certain. A short uncited
 * statement is asked about once, so any language works and no word list decides (rule 67). Every failure answers
 * null: the reply is then kept as it is.
 */
@Injectable()
export class SearchContinuationManager {
  private readonly logger = new Logger(SearchContinuationManager.name);

  constructor(private readonly gate: ResearchGateService) {}

  async inspect(response: LlmResponse, userMessage: string): Promise<PendingSearch | null> {
    if (!this.isTextAnswer(response)) {
      return null;
    }
    const structural = detectStructuralPendingSearch(response.content, response.requestedTools);
    if (structural !== null) {
      return this.found(structural, response);
    }
    if (!isSearchPromiseCandidate(response.content)) {
      return null;
    }
    try {
      const verdict = await this.withDeadline(
        this.gate.askPlanner(
          buildSearchPromisePrompt(userMessage, response.content),
          RESEARCH_PLANNER_MIN_OUTPUT_TOKENS,
          parseSearchPromiseVerdict,
        ),
      );
      return verdict?.promisesSearch === true
        ? this.found({ signal: 'judge', query: verdict.query }, response)
        : null;
    } catch (error: unknown) {
      this.logger.warn(
        `inspect: judge failed - ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  /** Null when the judge has not answered within its budget; its late answer is ignored. */
  private async withDeadline<T>(work: Promise<T | null>): Promise<T | null> {
    let timer: NodeJS.Timeout | undefined;
    const late = new Promise<null>((resolve) => {
      timer = setTimeout(() => {
        this.logger.warn('inspect: judge gave no answer in time - the reply is kept');
        resolve(null);
      }, PROMISE_JUDGE_BUDGET_MS);
    });
    try {
      return await Promise.race([work, late]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Generated media, plan notices and stopped replies are never continued. */
  private isTextAnswer(response: LlmResponse): boolean {
    return (
      response.finishReason !== 'cancelled' &&
      response.imageGenerationId === undefined &&
      response.videoGenerationId === undefined &&
      response.fileGenerationId === undefined &&
      response.fileLimit === undefined &&
      response.planFeatureRefusal === undefined &&
      response.imageMaskRefusal === undefined
    );
  }

  private found(pending: PendingSearch, response: LlmResponse): PendingSearch {
    this.logger.log(
      `inspect: promised search signal=${pending.signal} model=${response.provider}/${response.model} replyChars=${String(response.content.length)}`,
    );
    return pending;
  }
}
