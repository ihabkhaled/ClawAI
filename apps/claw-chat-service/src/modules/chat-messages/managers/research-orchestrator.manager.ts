import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { NarrationKind } from '../../../common/enums/narration-kind.enum';
import { PlannedResearchAction } from '../../../common/enums/planned-research-action.enum';
import { ResearchWorkflow } from '../../../common/enums/research-workflow.enum';
import { runResearch } from '../../../common/utilities';
import { NarrationService } from '../services/narration.service';
import { ResearchGateService } from '../services/research-gate.service';
import type { ResearchRequestBase, ResearchRunResponse } from '../types/research.types';
import type { ResearchOrchestrationInput } from '../types/research-orchestration.types';
import {
  appendMissingUrls,
  bundleOf,
  mergeResearchRuns,
  summariseCrawl,
} from '../utilities/research-orchestration.utility';

/**
 * AUTO research as a loop an AI drives, narrated as it goes:
 *
 *   plan  -> "You shared a site, so I'll read it first."
 *   crawl -> crawling ... 14 pages read
 *   back to the AI -> "The site covers pricing; I'll check how it compares."
 *   search -> searching ... 6 results
 *   back to the AI -> the user's own model writes the answer
 *
 * The planner models are the admin's ordered candidates, tried until one
 * answers. The ANSWER is never written here: this only gathers evidence, which
 * is attached to the user message for the originally selected model to read.
 *
 * Every step is also written to the narration log, which is stored on the
 * answer, so the whole sequence is still there after a refresh.
 */
@Injectable()
export class ResearchOrchestratorManager {
  private readonly logger = new Logger(ResearchOrchestratorManager.name);

  constructor(
    private readonly planner: ResearchGateService,
    private readonly narration: NarrationService,
  ) {}

  async run(input: ResearchOrchestrationInput): Promise<ResearchRunResponse | null> {
    const plan = await this.planner.plan(input.intent, input.attachmentDigest ?? '');
    await this.narrateThought(input.threadId, plan.thinking);
    if (plan.narration.length > 0) {
      await this.narration.append(input.threadId, {
        kind: NarrationKind.PLANNED,
        text: plan.narration,
        params: { action: plan.action, model: plan.decidedBy ?? '' },
      });
    }
    if (plan.action === PlannedResearchAction.ANSWER) {
      return null;
    }

    if (plan.action === PlannedResearchAction.SEARCH) {
      return this.search(input, plan.query);
    }

    const crawled = await this.crawl(input, plan.urls, plan.maxPages);
    if (plan.action === PlannedResearchAction.CRAWL) {
      return crawled;
    }

    // Back to the AI with what the pages said: search only if they did not
    // cover the question. Asking again, rather than always searching, is what
    // keeps "read this site" from also spending a search.
    await this.narration.append(input.threadId, { kind: NarrationKind.BACK_TO_AI });
    const followUp = await this.planner.followUpAfterCrawl(input.intent, summariseCrawl(crawled));
    await this.narrateThought(input.threadId, followUp.thinking);
    if (followUp.narration.length > 0) {
      await this.narration.append(input.threadId, {
        kind: NarrationKind.REPLANNED,
        text: followUp.narration,
      });
    }
    if (!followUp.needsSearch) {
      return crawled;
    }
    const searched = await this.search(input, followUp.query ?? plan.query);
    return mergeResearchRuns(crawled, searched);
  }

  private async crawl(
    input: ResearchOrchestrationInput,
    urls: string[],
    maxPages: number,
  ): Promise<ResearchRunResponse | null> {
    await this.narration.append(input.threadId, {
      kind: NarrationKind.CRAWL_STARTED,
      params: { urls: urls.join(', '), maxPages },
    });
    // The URLs travel in the intent because research-service reads them from
    // there; a URL the planner added is appended so it is crawled too.
    const intent = appendMissingUrls(input.intent, urls);
    const run = await runResearch(AppConfig.get().RESEARCH_SERVICE_URL, {
      ...this.baseRequest(input),
      intent,
      workflow: ResearchWorkflow.SITE_CRAWL,
      maxPages,
    });
    await this.narrateOutcome(input.threadId, run, NarrationKind.CRAWL_DONE);
    return run;
  }

  private async search(
    input: ResearchOrchestrationInput,
    query: string | null,
  ): Promise<ResearchRunResponse | null> {
    await this.narration.append(input.threadId, {
      kind: NarrationKind.SEARCH_STARTED,
      params: { query: query ?? '' },
    });
    const run = await runResearch(AppConfig.get().RESEARCH_SERVICE_URL, {
      ...this.baseRequest(input),
      intent: input.intent,
      workflow: ResearchWorkflow.SEARCH_THEN_FETCH,
      searchQuery: query ?? undefined,
    });
    await this.narrateOutcome(input.threadId, run, NarrationKind.SEARCH_DONE);
    return run;
  }

  /**
   * Rule 41: every failed web step is SAID, never silent. A step that produced
   * nothing is reported as such, and the count shown is what was actually READ
   * — never what was found.
   */
  private async narrateOutcome(
    threadId: string,
    run: ResearchRunResponse | null,
    doneKind: NarrationKind,
  ): Promise<void> {
    const bundle = bundleOf(run);
    if (run === null || bundle === null) {
      this.logger.warn(`narrateOutcome: ${doneKind} produced no run`);
      await this.narration.append(threadId, { kind: NarrationKind.RESEARCH_FAILED });
      return;
    }
    await this.narration.append(threadId, {
      kind: doneKind,
      params: { count: bundle.items.length, warnings: bundle.warnings.length },
    });
  }

  private baseRequest(input: ResearchOrchestrationInput): ResearchRequestBase {
    return {
      userToken: input.userToken,
      userId: input.userId,
      searchProviderId: input.providerId,
      requestedProvider: input.forcedProvider,
      requestedModel: input.forcedModel,
      correlationId: input.threadId,
    };
  }

  private async narrateThought(threadId: string, thinking: string): Promise<void> {
    if (thinking.length > 0) {
      await this.narration.append(threadId, { kind: NarrationKind.AI_THOUGHT, text: thinking });
    }
  }
}
