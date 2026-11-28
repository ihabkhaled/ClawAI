import { Injectable, Logger, Optional } from '@nestjs/common';

import { NarrationKind } from '../../../common/enums/narration-kind.enum';
import { PlannedResearchAction } from '../../../common/enums/planned-research-action.enum';
import type { ResearchRenderHint } from '../../../common/enums/research-render-hint.enum';
import { ResearchWorkflow } from '../../../common/enums/research-workflow.enum';
import {
  RESEARCH_PLANNER_DEFAULT_MAX_PAGES,
  RESEARCH_ROUND_MIN_REMAINING_MS,
  RESEARCH_ROUNDS_BUDGET_MS,
} from '../../../common/constants/research-gate.constants';
import { SELF_CRAWL_NARRATION } from '../constants/platform-identity.constants';
import { NarrationService } from '../services/narration.service';
import { ResearchGateService } from '../services/research-gate.service';
import { StreamCancellationService } from '../services/stream-cancellation.service';
import type { ResearchPlan } from '../types/research-gate.types';
import type { ResearchRequestBase, ResearchRunResponse } from '../types/research.types';
import type {
  ResearchOrchestrationInput,
  ResearchRoundStep,
  ResearchSearchStep,
  ResearchStopClaim,
  ResearchTurnState,
} from '../types/research-orchestration.types';
import {
  describeGatewayProviders,
  gatewayRun,
  providersOfBundle,
} from '../utilities/research-gateway.utility';
import { summariseRunForGapCheck } from '../utilities/research-gap-check.utility';
import {
  appendMissingUrls,
  bundleOf,
  mergeResearchRuns,
  pageReadNarrations,
  statsNarrationParams,
  summariseCrawl,
} from '../utilities/research-orchestration.utility';
import {
  buildResearchEngineFields,
  clampResearchDepth,
  evidenceUrls,
  expansionQueries,
  maxRoundsForDepth,
  newEvidenceOnly,
  normaliseResearchLanguages,
  researchQueryBudget,
  researchQueryKey,
} from '../utilities/research-request.utility';

/**
 * AUTO research as a loop an AI drives, narrated as it goes:
 *
 *   plan  -> "You shared a site, so I'll read it first."
 *   crawl -> crawling ... 14 pages read
 *   back to the AI -> "The site covers pricing; I'll check how it compares."
 *   search -> searching ... 6 results           (round 1: the council's sub-questions, languages and depth)
 *   back to the AI -> "Still missing: the 2025 figures." (gap check, research engine B2)
 *   search -> round 2 with the new queries, never re-reading a page already read
 *   back to the AI -> the user's own model writes the answer
 *
 * The planner models are the admin's ordered candidates, tried until one
 * answers. The ANSWER is never written here: this only gathers evidence, which
 * is attached to the user message for the originally selected model to read.
 *
 * Rounds (B2): after the first search, a depth of 2 or 3 asks the gate's models what is still missing. Research
 * stops when they say done, offer no new query, a round adds no new page, the round cap (= depth) is reached, the
 * turn's research has run `RESEARCH_ROUNDS_BUDGET_MS`, or the run was stopped (user Stop, or a newer message replaced it). A stopped turn keeps what it read.
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
    /** The thread's Stop button; optional so a hand-built orchestrator (specs) runs without it. */
    @Optional() private readonly cancellation?: StreamCancellationService,
  ) {}

  /** The self-contained search a follow-up means, from the planner and council; undefined when they name none. */
  async standaloneQuery(intent: string, conversation: string): Promise<string | undefined> {
    const plan = await this.planner.plan(intent, '', conversation);
    return plan.query ?? undefined;
  }

  async run(input: ResearchOrchestrationInput): Promise<ResearchRunResponse | null> {
    const stop = this.claimStop(input.threadId);
    const turn: ResearchTurnState = {
      startedAt: Date.now(),
      queriesRun: [],
      ...(stop.controller === undefined ? {} : { signal: stop.controller.signal }),
    };
    try {
      return await this.runTurn(input, turn);
    } finally {
      if (stop.owned) {
        this.cancellation?.release(input.threadId);
        this.carryUserStop(input.threadId, turn);
      }
    }
  }

  private async runTurn(
    input: ResearchOrchestrationInput,
    turn: ResearchTurnState,
  ): Promise<ResearchRunResponse | null> {
    if (input.selfSiteUrl !== undefined) {
      return this.selfCrawl(input, turn, input.selfSiteUrl);
    }
    const plan = await this.planner.plan(
      input.intent,
      input.attachmentDigest ?? '',
      input.conversation ?? '',
    );
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
      return this.searchRounds(input, turn, plan, plan.query, null);
    }

    const crawled = await this.crawl(input, turn, plan.urls, plan.maxPages, plan.render);
    if (plan.action === PlannedResearchAction.CRAWL || this.isStopped(turn)) {
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
    const searched = await this.searchRounds(
      input,
      turn,
      plan,
      followUp.query ?? plan.query,
      crawled,
    );
    return mergeResearchRuns(crawled, searched);
  }

  /**
   * The user asked about the platform itself: crawl its own public site, no
   * planner. The plan gate was already checked by the caller (rule 50).
   */
  private async selfCrawl(
    input: ResearchOrchestrationInput,
    turn: ResearchTurnState,
    siteUrl: string,
  ): Promise<ResearchRunResponse | null> {
    await this.narration.append(input.threadId, {
      kind: NarrationKind.PLANNED,
      text: SELF_CRAWL_NARRATION,
      params: { action: PlannedResearchAction.CRAWL, model: '' },
    });
    return this.crawl(input, turn, [siteUrl], RESEARCH_PLANNER_DEFAULT_MAX_PAGES);
  }

  private async crawl(
    input: ResearchOrchestrationInput,
    turn: ResearchTurnState,
    urls: string[],
    maxPages: number,
    render?: ResearchRenderHint,
  ): Promise<ResearchRunResponse | null> {
    if (this.isStopped(turn)) {
      this.logger.log('crawl: not started - the run was stopped or replaced');
      return null;
    }
    await this.narration.append(input.threadId, {
      kind: NarrationKind.CRAWL_STARTED,
      params: { urls: urls.join(', '), maxPages },
    });
    // The URLs travel in the intent because research-service reads them from
    // there; a URL the planner added is appended so it is crawled too.
    const intent = appendMissingUrls(input.intent, urls);
    const run = await gatewayRun({
      ...this.baseRequest(input),
      intent,
      workflow: ResearchWorkflow.SITE_CRAWL,
      maxPages,
      ...(render === undefined ? {} : { render }),
    });
    return this.narrateOutcome(input.threadId, run, NarrationKind.CRAWL_DONE);
  }

  /**
   * Round 1 searches the plan's query with the council's other sub-questions, languages and depth; while the depth
   * allows another round, a gap check decides whether and what to search next. Returns the search evidence only
   * (de-duplicated across rounds); a crawl that came first (`prior`) is merged by the caller.
   */
  private async searchRounds(
    input: ResearchOrchestrationInput,
    turn: ResearchTurnState,
    plan: ResearchPlan,
    query: string | null,
    prior: ResearchRunResponse | null,
  ): Promise<ResearchRunResponse | null> {
    const depth = clampResearchDepth(plan.depth);
    const languages = normaliseResearchLanguages(plan.languages);
    let gathered = await this.search(input, turn, {
      round: 1,
      query,
      queries: expansionQueries(
        query ?? input.intent,
        plan.subQuestions,
        researchQueryBudget(depth) - 1,
      ),
      languages,
      platforms: plan.platforms,
      depth,
      excludeUrls: evidenceUrls(prior),
    });
    const maxRounds = maxRoundsForDepth(depth);
    // A follow-up like "search again" means nothing on its own; the gap check also reads what it was resolved to.
    const question = query === null ? input.intent : `${input.intent}\nSearching for: ${query}`;
    for (let round = 2; gathered !== null && round <= maxRounds; round += 1) {
      const next = await this.nextRound(input, turn, mergeResearchRuns(prior, gathered), {
        round,
        question,
        depth,
        languages,
        platforms: plan.platforms,
      });
      if (next === null) {
        break;
      }
      gathered = mergeResearchRuns(gathered, next);
    }
    return gathered;
  }

  /**
   * One more round, or null to stop: Stop, the wall-time budget, a gap check that says done or offers no query not
   * already searched, a failed run, or a run that read nothing new. `evidence` is everything this turn read so far.
   */
  private async nextRound(
    input: ResearchOrchestrationInput,
    turn: ResearchTurnState,
    evidence: ResearchRunResponse | null,
    step: ResearchRoundStep,
  ): Promise<ResearchRunResponse | null> {
    if (this.roundBlocked(turn, step.round)) {
      return null;
    }
    await this.narration.append(input.threadId, {
      kind: NarrationKind.BACK_TO_AI,
      params: { round: step.round },
    });
    const gap = await this.planner.gapCheck(step.question, summariseRunForGapCheck(evidence), [
      ...turn.queriesRun,
    ]);
    const queries = this.freshQueries(gap.queries, turn.queriesRun);
    await this.narrateThought(input.threadId, gap.thinking);
    if (gap.narration.length > 0) {
      await this.narration.append(input.threadId, {
        kind: NarrationKind.REPLANNED,
        text: gap.narration,
        // A round number only when that round will run: "that is enough" must not read as "Round 2".
        ...(gap.done || queries.length === 0
          ? {}
          : { params: { round: step.round, queries: queries.length } }),
      });
    }
    if (gap.done || queries.length === 0) {
      this.logger.log(
        `rounds: stop before round ${String(step.round)} - ${gap.done ? 'gap check says done' : 'no new query'}`,
      );
      return null;
    }
    // Checked again right before the gateway call: the gap check itself takes time.
    if (this.roundBlocked(turn, step.round)) {
      return null;
    }
    const seen = evidenceUrls(evidence);
    const run = await this.search(input, turn, {
      ...step,
      query: queries.at(0) ?? null,
      queries: queries.slice(1, researchQueryBudget(step.depth)),
      excludeUrls: seen,
    });
    const fresh = newEvidenceOnly(run, seen);
    if (run !== null && fresh === null) {
      this.logger.log(`rounds: round ${String(step.round)} read nothing new - stopping`);
    }
    return fresh;
  }

  private async search(
    input: ResearchOrchestrationInput,
    turn: ResearchTurnState,
    step: ResearchSearchStep,
  ): Promise<ResearchRunResponse | null> {
    if (this.isStopped(turn)) {
      this.logger.log(
        `search: round ${String(step.round)} not started - the run was stopped or replaced`,
      );
      return null;
    }
    turn.queriesRun.push(step.query ?? input.intent, ...step.queries);
    await this.narration.append(input.threadId, {
      kind: NarrationKind.SEARCH_STARTED,
      params: {
        query: step.query ?? '',
        round: step.round,
        queries: 1 + step.queries.length,
        ...(step.languages.length > 0 ? { languages: step.languages.join(', ') } : {}),
      },
    });
    const run = await gatewayRun({
      ...this.baseRequest(input),
      intent: input.intent,
      workflow: ResearchWorkflow.SEARCH_THEN_FETCH,
      searchQuery: step.query ?? undefined,
      // `depth` sizes the run (queries and pages read); `maxPages` is a crawl budget only.
      ...buildResearchEngineFields({
        queries: step.queries,
        languages: step.languages,
        platforms: step.platforms,
        depth: step.depth,
        round: step.round,
        excludeUrls: step.excludeUrls,
      }),
    });
    return this.narrateOutcome(input.threadId, run, NarrationKind.SEARCH_DONE, {
      round: step.round,
    });
  }

  /**
   * Rule 41: every failed web step is SAID, never silent. A step that produced
   * nothing is reported as such, and the count shown is what was actually READ
   * — never what was found. A run that read zero items (robots Disallow, an
   * unreachable private host) is a failure too, and yields no evidence, so the
   * answer cannot cite a source that was never stored.
   */
  private async narrateOutcome(
    threadId: string,
    run: ResearchRunResponse | null,
    doneKind: NarrationKind,
    extra: Record<string, string | number> = {},
  ): Promise<ResearchRunResponse | null> {
    const bundle = bundleOf(run);
    if (run === null || bundle === null || bundle.items.length === 0) {
      this.logger.warn(`narrateOutcome: ${doneKind} produced no readable evidence`);
      await this.narration.append(threadId, { kind: NarrationKind.RESEARCH_FAILED });
      return null;
    }
    await this.narratePagesRead(threadId, run);
    // Which providers searched, when research-service said (`providers[]`, or the
    // providers it attempted on the old shape), and the engine's own counters
    // (`bundle.stats`). Extra params are ignored by a template that has no
    // placeholder for them, so this is safe before the UI text lands.
    const isSearch = doneKind === NarrationKind.SEARCH_DONE;
    const providers = isSearch ? describeGatewayProviders(providersOfBundle(bundle)) : [];
    await this.narration.append(threadId, {
      kind: doneKind,
      params: {
        count: bundle.items.length,
        warnings: bundle.warnings.length,
        ...(providers.length > 0
          ? { providers: providers.join(', '), providerCount: providers.length }
          : {}),
        ...extra,
        ...(isSearch ? statsNarrationParams(bundle) : {}),
      },
    });
    return run;
  }

  /**
   * One line per page an escalated fetch tier served ("Read example.com via
   * Crawl4AI after Plain fetch was blocked"). Public because the explicit
   * research modes (not AUTO) reach the same bundle through
   * `runResearchForIntent`, and must narrate it the same way (rule 59).
   */
  async narratePagesRead(threadId: string, run: ResearchRunResponse | null): Promise<void> {
    const bundle = bundleOf(run);
    if (bundle === null) {
      return;
    }
    for (const line of pageReadNarrations(bundle.items)) {
      await this.narration.append(threadId, line);
    }
  }

  /** Every request of the turn names its thread (research-service thread memory, B1). */
  private baseRequest(input: ResearchOrchestrationInput): ResearchRequestBase {
    return {
      userToken: input.userToken,
      userId: input.userId,
      searchProviderId: input.providerId,
      requestedProvider: input.forcedProvider,
      requestedModel: input.forcedModel,
      correlationId: input.threadId,
      ...buildResearchEngineFields({ threadId: input.threadId }),
    };
  }

  /** The gap check's queries minus every query this turn already searched. */
  private freshQueries(queries: readonly string[], queriesRun: readonly string[]): string[] {
    const searched = new Set(queriesRun.map(researchQueryKey));
    return queries.filter((query) => !searched.has(researchQueryKey(query)));
  }

  /**
   * The thread's Stop key. Research runs before the answering model, when nothing else holds that key, so it is
   * registered here and released when research ends (before the model registers its own). When a run on this replica
   * already holds it, research listens to that controller instead: registering again would abort that run.
   */
  private claimStop(threadId: string): ResearchStopClaim {
    if (this.cancellation === undefined) {
      return { owned: false };
    }
    const existing = this.cancellation.getController(threadId);
    return existing === undefined
      ? { controller: this.cancellation.register(threadId), owned: true }
      : { controller: existing, owned: false };
  }

  /** A user Stop during research also stops the answer that follows it (see StreamCancellationService.carryStop). */
  private carryUserStop(threadId: string, turn: ResearchTurnState): void {
    if (turn.signal?.aborted === true && !StreamCancellationService.wasReplaced(turn.signal)) {
      this.cancellation?.carryStop(threadId);
    }
  }

  private isStopped(turn: ResearchTurnState): boolean {
    return turn.signal?.aborted === true;
  }

  /** True when round `round` must not start: the run was stopped or replaced, or the research time is spent. */
  private roundBlocked(turn: ResearchTurnState, round: number): boolean {
    if (this.isStopped(turn)) {
      this.logger.log(
        `rounds: round ${String(round)} not started - the run was stopped or replaced`,
      );
      return true;
    }
    const elapsed = Date.now() - turn.startedAt;
    if (elapsed > RESEARCH_ROUNDS_BUDGET_MS - RESEARCH_ROUND_MIN_REMAINING_MS) {
      this.logger.log(
        `rounds: round ${String(round)} not started - research budget spent (${String(elapsed)}ms)`,
      );
      return true;
    }
    return false;
  }

  private async narrateThought(threadId: string, thinking: string): Promise<void> {
    if (thinking.length > 0) {
      await this.narration.append(threadId, { kind: NarrationKind.AI_THOUGHT, text: thinking });
    }
  }
}
