import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { AiActionKind } from '../../../common/enums/ai-action-kind.enum';
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
 *   - `Promise.allSettled` so one slow/failing reviewer never blocks the rest
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

    const reviewerSettled = await Promise.allSettled(
      reviewers.map((r) => this.runReviewer(r, input.content, chatUrl, timeoutMs)),
    );
    const reviewerOutcomes: ReviewerOutcome[] = reviewerSettled.map((s, i) => {
      // reviewerSettled and reviewers are zipped 1:1 by index, so the
      // lookup is always defined. Fall back to a synthetic ref if a future
      // refactor breaks the invariant — never throw at this layer.
      const ref =
        reviewers[i] ?? reviewers[0] ?? { provider: 'unknown', model: 'unknown' };
      return this.materialiseReviewer(s, ref);
    });
    const anyReviewerSucceeded = reviewerOutcomes.some((r) => r.success);

    let judge: JudgeOutcome | null = null;
    if (input.judgeModel !== undefined && anyReviewerSucceeded) {
      judge = await this.runJudge(input.judgeModel, reviewerOutcomes, chatUrl, timeoutMs);
    } else if (input.judgeModel !== undefined && !anyReviewerSucceeded) {
      this.logger.warn(
        'run: skipping judge pass — no reviewer succeeded; nothing to synthesise',
      );
    }

    return { reviewers: reviewerOutcomes, judge, anyReviewerSucceeded };
  }

  private async runReviewer(
    ref: ReviewerModelRef,
    content: string,
    chatUrl: string,
    timeoutMs: number,
  ): Promise<ReviewerOutcome> {
    const startedAt = Date.now();
    const judgePrompt = AI_ACTION_PROMPTS[AiActionKind.JUDGE];
    const out = await callCloudGenerate({
      chatServiceUrl: chatUrl,
      provider: ref.provider,
      model: ref.model,
      systemPrompt: judgePrompt.system,
      userPrompt: `${judgePrompt.userPrefix}${content}`,
      timeoutMs,
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

  private materialiseReviewer(
    settled: PromiseSettledResult<ReviewerOutcome>,
    ref: ReviewerModelRef,
  ): ReviewerOutcome {
    if (settled.status === 'fulfilled') return settled.value;
    const message = settled.reason instanceof Error ? settled.reason.message : 'unknown';
    this.logger.warn(`reviewer ${ref.provider}/${ref.model} failed: ${message}`);
    return {
      provider: ref.provider,
      model: ref.model,
      label: ref.label ?? `${ref.provider}/${ref.model}`,
      success: false,
      latencyMs: 0,
      errorMessage: message,
    };
  }

  private async runJudge(
    ref: ReviewerModelRef,
    reviewers: ReviewerOutcome[],
    chatUrl: string,
    timeoutMs: number,
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
        systemPrompt,
        userPrompt,
        timeoutMs,
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
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.error(`judge pass failed: ${message}`);
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
