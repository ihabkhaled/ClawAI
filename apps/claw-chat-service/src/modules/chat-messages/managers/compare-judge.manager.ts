import { Injectable, Logger } from '@nestjs/common';
import { PaygSurface, TokenLedgerContext, TokenUsageSource } from '@claw/shared-types';

import {
  CompareJudgeFailureReason,
  CompareJudgeVerdictStatus,
  OrchestrationStageStatus,
} from '../../../common/enums';
import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import {
  COMPARE_JUDGE_HISTORY_LIMIT,
  COMPARE_JUDGE_MAX_OUTPUT_TOKENS,
  COMPARE_JUDGE_MIN_LANES,
  COMPARE_JUDGE_STAGE_LABEL,
  COMPARE_JUDGE_SYSTEM_PROMPT,
} from '../constants/compare-judge.constants';
import { JUDGE_LOCAL_MODEL } from '../constants/judge-referee.constants';
import { PAYG_WORKFLOW_COMPARE_JUDGE } from '../constants/payg.constants';
import { ChatStreamService } from '../services/chat-stream.service';
import type {
  CompareJudgeLaneInput,
  CompareJudgeRequest,
  CompareJudgeShuffle,
  CompareJudgeTarget,
  CompareJudgeVerdict,
  CompareLaneCritique,
} from '../types/compare-judge.types';
import type { AssembledContext } from '../types/context.types';
import type { LlmResponse } from '../types/execution.types';
import type { JudgeRefereeConfig } from '../types/judge-referee.types';
import {
  buildCompareJudgeQuestion,
  buildLaneShuffle,
  buildRankedVerdict,
  buildUnrankedVerdict,
  computeAnswerBudgetChars,
  estimateHistoryTokens,
  fitAnswersFairly,
  frameCompareJudgeSystemPrompt,
  missingFilesForLane,
  parseCompareJudgeOutput,
} from '../utilities/compare-judge.utility';
import { estimateTokensFromText } from '../utilities/token-estimator.utility';
import { ChatContextGatewayManager } from './chat-context-gateway.manager';
import { JudgeRefereeManager } from './judge-referee.manager';
import { ModeExecutionGatewayManager } from './mode-execution-gateway.manager';

/**
 * Compare's judge: ONE call that ranks every lane side by side (ADR-116).
 *
 * It replaced a per-lane referee that scored each answer in its own call. Those
 * scores were each calibrated against nothing but the answer in front of them,
 * so two lanes' numbers were not comparable and the "best" lane was whichever
 * call happened to be kinder. Here the judge sees every completed answer at
 * once, anonymised as A, B, C… in a seeded shuffle, and scores them all on one
 * 0-10 scale in one structured reply.
 *
 * Context comes from `ChatContextGatewayManager` sized to the JUDGE's own
 * window, and the call goes through `ModeExecutionGatewayManager` — so through
 * `ChatExecutionManager.callProvider`, the billing chokepoint — as exactly one
 * hold per run. Nothing here throws: every failure is a verdict that says
 * "judge unavailable", never a winner chosen by default.
 */
@Injectable()
export class CompareJudgeManager {
  private readonly logger = new Logger(CompareJudgeManager.name);

  constructor(
    private readonly chatContextGateway: ChatContextGatewayManager,
    private readonly modeExecutionGateway: ModeExecutionGatewayManager,
    private readonly judgeRefereeManager: JudgeRefereeManager,
    private readonly chatStreamService: ChatStreamService,
  ) {}

  async judge(request: CompareJudgeRequest): Promise<CompareJudgeVerdict> {
    const startedAt = Date.now();
    const target = await this.resolveTarget(request.judgeModel);
    const judgeLabel =
      target === null
        ? (request.judgeModel ?? JUDGE_LOCAL_MODEL)
        : `${target.provider}/${target.model}`;

    if (target === null || request.lanes.length < COMPARE_JUDGE_MIN_LANES) {
      const notEnough = request.lanes.length < COMPARE_JUDGE_MIN_LANES;
      this.logger.log(
        `judge: run=${request.runId} not called — lanes=${String(request.lanes.length)} targetResolved=${String(target !== null)}`,
      );
      return buildUnrankedVerdict({
        status: notEnough ? CompareJudgeVerdictStatus.SKIPPED : CompareJudgeVerdictStatus.UNAVAILABLE,
        failureReason: notEnough
          ? CompareJudgeFailureReason.NOT_ENOUGH_ANSWERS
          : CompareJudgeFailureReason.CALL_FAILED,
        judgeModel: judgeLabel,
        shuffle: null,
        truncated: false,
        latencyMs: 0,
        usage: null,
      });
    }

    const criticLabel = request.critic.enabled ? (request.critic.model ?? 'AUTO') : null;
    this.chatStreamService.emitJudgeEvaluating(request.threadId, criticLabel, judgeLabel);
    const critiques = request.critic.enabled ? await this.critiqueLanes(request) : [];

    this.emitStage(request.threadId, judgeLabel, OrchestrationStageStatus.ACTIVE);
    const verdict = await this.rankLanes(request, target, critiques, startedAt);
    this.emitStage(request.threadId, judgeLabel, OrchestrationStageStatus.COMPLETED);

    this.logger.log(
      `judge: run=${request.runId} status=${verdict.status} reason=${verdict.failureReason ?? 'none'} ` +
        `winnerLane=${verdict.winnerLaneIndex === null ? 'none' : String(verdict.winnerLaneIndex)} ` +
        `ties=${String(verdict.tiedLaneIndices.length)} truncated=${String(verdict.truncated)} ` +
        `latencyMs=${String(verdict.latencyMs)}`,
    );
    return verdict;
  }

  // Null when the selection cannot be resolved (no local default model, say).
  // The run then reports "judge unavailable" without dialling anything.
  private async resolveTarget(rawModel: string | null): Promise<CompareJudgeTarget | null> {
    try {
      return await this.judgeRefereeManager.resolveJudgeTarget(rawModel ?? JUDGE_LOCAL_MODEL);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`resolveTarget: failed — ${message}`);
      return null;
    }
  }

  /**
   * The user's critic, once per answer, before the comparison. Its notes reach
   * the judge; its score does not — a per-lane score is exactly the
   * uncalibrated number this manager exists to stop comparing.
   */
  private async critiqueLanes(request: CompareJudgeRequest): Promise<CompareLaneCritique[]> {
    const config: JudgeRefereeConfig = {
      enabled: true,
      category: undefined,
      routingMode: 'MANUAL_MODEL',
      isLocalOnly: false,
      criticEnabled: true,
      criticModel: request.critic.model,
      userId: request.userId,
    };
    return Promise.all(request.lanes.map(async (lane) => this.critiqueOne(lane, request, config)));
  }

  // A critic that fails leaves its lane without notes; it never blocks the
  // comparison, and the judge is not told a failed critic had an opinion.
  private async critiqueOne(
    lane: CompareJudgeLaneInput,
    request: CompareJudgeRequest,
    config: JudgeRefereeConfig,
  ): Promise<CompareLaneCritique> {
    try {
      const critic = await this.judgeRefereeManager.critiqueLane(
        this.toLlmResponse(lane),
        request.laneContext,
        config,
      );
      const usable = critic.parseFailed !== true;
      return {
        laneIndex: lane.laneIndex,
        notes: usable ? critic.feedback : [],
        summary: usable && critic.summary.length > 0 ? critic.summary : null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`critiqueOne: lane=${String(lane.laneIndex)} critic failed — ${message}`);
      return { laneIndex: lane.laneIndex, notes: [], summary: null };
    }
  }

  private async rankLanes(
    request: CompareJudgeRequest,
    target: CompareJudgeTarget,
    critiques: CompareLaneCritique[],
    startedAt: number,
  ): Promise<CompareJudgeVerdict> {
    const judgeLabel = `${target.provider}/${target.model}`;
    const shuffle = buildLaneShuffle(
      request.runId,
      request.lanes.map((lane) => lane.laneIndex),
    );
    const ordered = this.inShuffledOrder(request.lanes, shuffle);
    let truncatedByLabel: boolean[] = ordered.map(() => false);

    try {
      const bundle = await this.chatContextGateway.build({
        userId: request.userId,
        threadId: request.threadId,
        surface: ChatSurface.JUDGE,
        historyLimit: COMPARE_JUDGE_HISTORY_LIMIT,
        provider: target.provider,
        model: target.model,
        maxOutputTokens: COMPARE_JUDGE_MAX_OUTPUT_TOKENS,
        ...(request.fileIds === undefined ? {} : { fileIds: request.fileIds }),
      });
      const built = this.buildJudgeQuestion(
        request.instructions ?? bundle.context.systemPrompt,
        bundle.context,
        ordered,
        shuffle,
        critiques,
      );
      truncatedByLabel = built.truncatedByLabel;

      const response = await this.modeExecutionGateway.run({
        bundle: { ...bundle, context: { ...bundle.context, systemPrompt: built.systemPrompt } },
        prompt: built.question,
        provider: target.provider,
        model: target.model,
        ledgerContext: TokenLedgerContext.JUDGE,
        paygCall: {
          surface: PaygSurface.JUDGE,
          workflow: PAYG_WORKFLOW_COMPARE_JUDGE,
          // One hold per run, keyed by the run: a retried request reuses it
          // rather than paying for the same comparison twice.
          requestId: `${request.runId}:${PAYG_WORKFLOW_COMPARE_JUDGE}`,
          threadId: request.threadId,
        },
      });
      return this.toVerdict(response, request, shuffle, truncatedByLabel, critiques, judgeLabel, startedAt);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`rankLanes: run=${request.runId} judge call failed — ${message}`);
      return buildUnrankedVerdict({
        status: CompareJudgeVerdictStatus.UNAVAILABLE,
        failureReason: CompareJudgeFailureReason.CALL_FAILED,
        judgeModel: judgeLabel,
        shuffle,
        truncated: truncatedByLabel.some(Boolean),
        latencyMs: Date.now() - startedAt,
        usage: null,
      });
    }
  }

  /**
   * Frames the system prompt, fits every answer to the judge's window fairly,
   * and renders the labelled question — split out of `rankLanes` so the try
   * block stays about the CALL, not the prompt it sends.
   */
  private buildJudgeQuestion(
    instructions: string | null,
    context: AssembledContext,
    ordered: CompareJudgeLaneInput[],
    shuffle: CompareJudgeShuffle,
    critiques: CompareLaneCritique[],
  ): { systemPrompt: string; question: string; truncatedByLabel: boolean[] } {
    const systemPrompt = frameCompareJudgeSystemPrompt(instructions, COMPARE_JUDGE_SYSTEM_PROMPT);
    const promptBase = {
      labels: shuffle.labels,
      criticNotes: ordered.map(
        (lane) => critiques.find((entry) => entry.laneIndex === lane.laneIndex)?.notes ?? null,
      ),
      missingFiles: ordered.map((lane) => missingFilesForLane(lane)),
    };
    // The skeleton is measured with the truncation note in it, so the budget
    // never forgets the words that explain the budget.
    const skeleton = buildCompareJudgeQuestion({
      ...promptBase,
      texts: ordered.map(() => ''),
      truncated: ordered.map(() => true),
      capChars: Number.MAX_SAFE_INTEGER,
    });
    const budgetChars = computeAnswerBudgetChars(
      context.modelBudget,
      estimateTokensFromText(systemPrompt) + estimateHistoryTokens(context) + estimateTokensFromText(skeleton),
    );
    const fitted = fitAnswersFairly(
      ordered.map((lane) => lane.content),
      budgetChars,
    );
    return {
      systemPrompt,
      question: buildCompareJudgeQuestion({
        ...promptBase,
        texts: fitted.texts,
        truncated: fitted.truncated,
        capChars: fitted.capChars,
      }),
      truncatedByLabel: fitted.truncated,
    };
  }

  private toVerdict(
    response: LlmResponse,
    request: CompareJudgeRequest,
    shuffle: CompareJudgeShuffle,
    truncatedByLabel: boolean[],
    critiques: CompareLaneCritique[],
    judgeLabel: string,
    startedAt: number,
  ): CompareJudgeVerdict {
    const usage = {
      inputTokens: response.inputTokens ?? 0,
      outputTokens: response.outputTokens ?? 0,
      estimated: response.tokenEstimated ?? false,
      source: response.tokenSource ?? TokenUsageSource.ESTIMATED,
    };
    const latencyMs = Date.now() - startedAt;
    const parsed = parseCompareJudgeOutput(response.content, shuffle.labels);
    if (parsed === null) {
      // The reply is not logged: it quotes the user's answers. Its length is
      // enough to tell an empty reply from a chatty one.
      this.logger.warn(
        `toVerdict: run=${request.runId} judge reply did not match the schema (length=${String(response.content.length)})`,
      );
      return buildUnrankedVerdict({
        status: CompareJudgeVerdictStatus.UNAVAILABLE,
        failureReason: CompareJudgeFailureReason.PARSE_FAILED,
        judgeModel: judgeLabel,
        shuffle,
        truncated: truncatedByLabel.some(Boolean),
        latencyMs,
        usage,
      });
    }
    return buildRankedVerdict({
      parsed,
      shuffle,
      lanes: request.lanes,
      truncatedByLabel,
      critiques,
      judgeModel: judgeLabel,
      latencyMs,
      usage,
    });
  }

  private inShuffledOrder(
    lanes: CompareJudgeLaneInput[],
    shuffle: CompareJudgeShuffle,
  ): CompareJudgeLaneInput[] {
    return shuffle.order.flatMap((laneIndex) => {
      const lane = lanes.find((candidate) => candidate.laneIndex === laneIndex);
      return lane === undefined ? [] : [lane];
    });
  }

  private toLlmResponse(lane: CompareJudgeLaneInput): LlmResponse {
    return {
      content: lane.content,
      provider: lane.provider,
      model: lane.model,
      latencyMs: 0,
      usedFallback: false,
    };
  }

  private emitStage(threadId: string, judgeLabel: string, status: OrchestrationStageStatus): void {
    this.chatStreamService.emitOrchestrationStage(threadId, {
      label: COMPARE_JUDGE_STAGE_LABEL,
      status,
      detail: judgeLabel,
      stageId: `compare-judge:${judgeLabel}`,
    });
  }
}
