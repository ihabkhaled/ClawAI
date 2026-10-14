import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PaygSurface } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors/business.exception';
import { AiActionKind } from '../../../common/enums/ai-action-kind.enum';
import {
  AI_ACTION_WORKFLOW_REVIEW,
  AI_ACTION_WORKFLOW_REVIEW_JUDGE,
} from '../constants/model-catalog.constants';
import { MULTI_MODEL_REVIEW_REVIEWER_CAP } from '../constants/ai-action-policy.constants';
import { AI_ACTION_PROMPTS } from '../constants/ai-action-prompts.constants';
import type {
  JudgeOutcome,
  MultiModelReviewInput,
  MultiModelReviewResult,
  ReviewerModelRef,
  ReviewerOutcome,
} from '../types/multi-model-review.types';
import { callCloudGenerate } from '../utilities/cloud-generation-client.utility';
import { describeUpstreamFailure } from '../utilities/upstream-failure.utility';
import { withPlatformIdentity } from '../utilities/platform-identity.utility';

/**
 * v3 round 2 (2026-05-12) — Prompt 04 polish: multi-model PR/MR review.
 *
 * Fans the same review prompt out to N reviewer models in parallel. When a
 * judge model is supplied, also runs a synthesis pass that takes the
 * reviewers' verdicts as input and produces a single recommendation.
 *
 * Cost guardrails:
 *   - hard cap of 5 reviewer models
 *   - per-reviewer timeout from AppConfig.AI_ACTION_REQUEST_TIMEOUT_MS
 *   - each reviewer is caught individually so one slow/failing reviewer never blocks the rest
 *
 * No new external dependencies — reuses the existing
 * `cloud-generation-client.utility` that funnels through chat-service.
 */
@Injectable()
export class MultiModelReviewOrchestratorManager {
  private readonly logger = new Logger(MultiModelReviewOrchestratorManager.name);

  async run(input: MultiModelReviewInput): Promise<MultiModelReviewResult> {
    if (input.content.trim().length === 0) {
      throw new Error('MultiModelReviewOrchestrator: content is empty');
    }
    if (input.reviewerModels.length === 0) {
      throw new Error('MultiModelReviewOrchestrator: reviewerModels is empty');
    }
    const reviewers = input.reviewerModels.slice(0, MULTI_MODEL_REVIEW_REVIEWER_CAP);
    const cfg = AppConfig.get();
    const timeoutMs = input.timeoutMs ?? cfg.AI_ACTION_REQUEST_TIMEOUT_MS;
    const chatUrl = cfg.CHAT_SERVICE_URL;

    this.logger.debug(
      `run: reviewers=${String(reviewers.length)} judge=${input.judgeModel === undefined ? 'none' : `${input.judgeModel.provider}/${input.judgeModel.model}`}`,
    );

    // Each reviewer is caught on its own, so one slow or failing model never
    // blocks or hides the rest.
    const reviewerOutcomes = await Promise.all(
      reviewers.map((r) =>
        this.runReviewer(r, input.content, chatUrl, timeoutMs, input.userId).catch(
          (error: unknown) => this.failedReviewer(r, error),
        ),
      ),
    );
    const anyReviewerSucceeded = reviewerOutcomes.some((r) => r.success);

    // Every reviewer failing is a failed request, not a 200 with a list of
    // errors: callers (and the bundle download) would otherwise present an empty
    // review as a success. Same 422 vocabulary as a failed single AI action.
    if (!anyReviewerSucceeded) {
      this.logger.warn('run: no reviewer succeeded; failing the request');
      throw new BusinessException(
        this.summariseAllFailed(reviewerOutcomes),
        'AI_ACTION_UPSTREAM_FAILED',
        HttpStatus.UNPROCESSABLE_ENTITY,
        { triedModels: reviewerOutcomes.map((r) => `${r.provider}/${r.model}`) },
      );
    }

    const judge: JudgeOutcome | null =
      input.judgeModel === undefined
        ? null
        : await this.runJudge(input.judgeModel, reviewerOutcomes, chatUrl, timeoutMs, input.userId);

    return { reviewers: reviewerOutcomes, judge, anyReviewerSucceeded };
  }

  private summariseAllFailed(outcomes: ReviewerOutcome[]): string {
    const last = outcomes.at(-1);
    const reason = last?.errorMessage ?? 'unknown';
    return `All ${String(outcomes.length)} reviewers failed. Last error from ${last?.provider ?? 'unknown'}/${last?.model ?? 'unknown'}: ${reason}`;
  }

  /**
   * One reviewer, one paid provider call, one reservation.
   *
   * Every reviewer in the fan-out is a SEPARATE call to chat-service, so each
   * one is separately reserved and separately settled inside chat-service. That
   * is what stops five reviewers being billed as one — the reservation key is
   * derived per inbound request there, and these are five distinct requests.
   */
  private async runReviewer(
    ref: ReviewerModelRef,
    content: string,
    chatUrl: string,
    timeoutMs: number,
    userId: string,
  ): Promise<ReviewerOutcome> {
    const startedAt = Date.now();
    const judgePrompt = AI_ACTION_PROMPTS[AiActionKind.JUDGE];
    const out = await callCloudGenerate({
      chatServiceUrl: chatUrl,
      provider: ref.provider,
      model: ref.model,
      systemPrompt: withPlatformIdentity(judgePrompt.system),
      userPrompt: `${judgePrompt.userPrefix}${content}`,
      timeoutMs,
      userId,
      surface: PaygSurface.WORKSPACE_ACTION,
      workflow: AI_ACTION_WORKFLOW_REVIEW,
    });
    return {
      provider: ref.provider,
      model: ref.model,
      label: ref.label ?? `${ref.provider}/${ref.model}`,
      success: true,
      content: out.content,
      inputTokens: out.inputTokens,
      outputTokens: out.outputTokens,
      latencyMs: Date.now() - startedAt,
    };
  }

  private failedReviewer(ref: ReviewerModelRef, error: unknown): ReviewerOutcome {
    const raw = error instanceof Error ? error.message : 'unknown';
    const { code, message } = describeUpstreamFailure(error);
    this.logger.warn(`reviewer ${ref.provider}/${ref.model} failed: ${code} ${raw}`);
    return {
      provider: ref.provider,
      model: ref.model,
      label: ref.label ?? `${ref.provider}/${ref.model}`,
      success: false,
      latencyMs: 0,
      errorMessage: message,
    };
  }

  /** The synthesis pass. A sixth paid call, metered exactly like the five above. */
  private async runJudge(
    ref: ReviewerModelRef,
    reviewers: ReviewerOutcome[],
    chatUrl: string,
    timeoutMs: number,
    userId: string,
  ): Promise<JudgeOutcome> {
    const startedAt = Date.now();
    const succeeded = reviewers.filter((r) => r.success);
    const synthesisInput = succeeded
      .map((r, i) => `### Reviewer ${String(i + 1)} — ${r.label}\n${r.content ?? ''}`)
      .join('\n\n---\n\n');
    const systemPrompt =
      'You are a senior reviewer aggregating multiple peer reviewer verdicts. ' +
      'Read every reviewer output below; identify points of consensus and disagreement; ' +
      'produce a single short markdown verdict with: ## Consensus, ## Disagreements, ## Final Recommendation. ' +
      'When reviewers disagree, take a position; do not hedge.';
    const userPrompt = `The following ${String(succeeded.length)} reviewers were asked to judge the same content.\n\n${synthesisInput}`;
    try {
      const out = await callCloudGenerate({
        chatServiceUrl: chatUrl,
        provider: ref.provider,
        model: ref.model,
        systemPrompt: withPlatformIdentity(systemPrompt),
        userPrompt,
        timeoutMs,
        userId,
        surface: PaygSurface.WORKSPACE_ACTION,
        workflow: AI_ACTION_WORKFLOW_REVIEW_JUDGE,
      });
      return {
        provider: ref.provider,
        model: ref.model,
        label: ref.label ?? `${ref.provider}/${ref.model}`,
        success: true,
        content: out.content,
        inputTokens: out.inputTokens,
        outputTokens: out.outputTokens,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      const { code, message } = describeUpstreamFailure(error);
      this.logger.error(
        `judge pass failed: ${code} ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return {
        provider: ref.provider,
        model: ref.model,
        label: ref.label ?? `${ref.provider}/${ref.model}`,
        success: false,
        latencyMs: Date.now() - startedAt,
        errorMessage: message,
      };
    }
  }
}
