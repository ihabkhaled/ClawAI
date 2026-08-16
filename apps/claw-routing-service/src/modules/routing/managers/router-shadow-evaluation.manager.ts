import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { EntityNotFoundException } from '../../../common/errors';
import { type RoutingOutcomeRecord } from '../../../generated/prisma';
import {
  CLOUD_COST_UNAVAILABLE_REASON,
  CLOUD_QUALITY_UNAVAILABLE_SHADOW_ONLY,
  COMPARISON_MESSAGE_PREVIEW_LENGTH,
  LEGACY_COST_UNAVAILABLE_REASON,
  LEGACY_QUALITY_UNAVAILABLE_NO_OUTCOME,
  LEGACY_QUALITY_UNAVAILABLE_NOT_JUDGED,
  ROUTING_JUDGE_RUBRIC_VERSION,
} from '../constants/legacy-cloud-comparison.constants';
import { CLOUD_ROUTER_UNAVAILABLE_NO_ELIGIBLE_DEPLOYMENT } from '../constants/router-chain.constants';
import { CloudRouterEligibilityManager } from './cloud-router-eligibility.manager';
import { CloudRouterPromptManager } from './cloud-router-prompt.manager';
import { CloudRouterManager } from './cloud-router.manager';
import { RoutingDecisionsRepository } from '../repositories/routing-decisions.repository';
import type { CloudRouteResult } from '../types/cloud-router.types';
import type {
  CloudRouteSummary,
  ComparisonCostSignal,
  ComparisonFailureSignal,
  ComparisonLatencySignal,
  ComparisonQualitySignal,
  LegacyRouteSummary,
  LegacyVsCloudBatchResult,
  LegacyVsCloudComparison,
} from '../types/legacy-cloud-comparison.types';
import type { EligibleDeploymentRecord } from '../types/model-deployment.types';
import type { ReplayFilters } from '../types/replay.types';
import type { RoutingContext, RoutingDecisionWithOutcomes } from '../types/routing.types';

/**
 * Runs a historical `RoutingDecision` as a CHALLENGER through
 * `CloudRouterManager.route()` and reports how it compares to the legacy
 * decision that actually served the user — V4 of the Learning Evolution
 * phase ("Shadow/replay/evaluation").
 *
 * Deliberately a sibling to `ReplayManager`, not an extension of it:
 * `compareRuns()` there diffs two AGGREGATE `ReplayRun` summaries, both
 * produced by the same legacy `RoutingManager.evaluateRoute()` engine. This
 * manager compares ONE historical decision at a time, per-dimension, between
 * TWO DIFFERENT engines (legacy heuristic vs `CloudRouterManager`) — a
 * structural mismatch that `RunComparisonDelta`/`ReplayRunSummary` cannot
 * absorb without a schema migration (no column on `ReplayRun`/`ReplayCase`
 * carries a cloud provider, an excluded-chain-entry list, or an evaluator
 * version). It DOES reuse `ReplaySingleDecision`'s pattern exactly: build a
 * `RoutingContext` from the historical row, ask a router for a decision,
 * never write the result back onto the served decision.
 *
 * The challenger call mirrors `RoutingManager.tryCloudRouting()` byte for
 * byte in shape (`traceId: randomUUID()`, no `threadId`, prompt from
 * `CloudRouterPromptManager`, eligible ids from
 * `CloudRouterEligibilityManager`) — the same call production already makes
 * for a live Auto-mode request. `route()` only ever returns a DECISION
 * (deployment id / workflow / confidence); it never executes anything or
 * generates an answer, so "no execution, no answer generation" holds
 * structurally, not by convention. Omitting `threadId` (matching the hot
 * path) means the trace RabbitMQ publishes carries `threadId: null`, so a
 * shadow comparison never rides into a real user's SSE timeline.
 */
@Injectable()
export class RouterShadowEvaluationManager {
  private readonly logger = new Logger(RouterShadowEvaluationManager.name);

  constructor(
    private readonly decisionsRepository: RoutingDecisionsRepository,
    private readonly cloudRouter: CloudRouterManager,
    private readonly cloudRouterEligibility: CloudRouterEligibilityManager,
    private readonly cloudRouterPrompt: CloudRouterPromptManager,
  ) {}

  async compareLegacyVsCloud(decisionId: string): Promise<LegacyVsCloudComparison> {
    const decision = await this.decisionsRepository.findByIdWithOutcome(decisionId);
    if (!decision) {
      throw new EntityNotFoundException('RoutingDecision', decisionId);
    }
    return this.compareOne(decision);
  }

  async compareLegacyVsCloudBatch(filters: ReplayFilters): Promise<LegacyVsCloudBatchResult> {
    const decisions = await this.decisionsRepository.findRecentWithOutcomes(filters);
    this.logger.log(
      `compareLegacyVsCloudBatch: shadow-comparing ${String(decisions.length)} historical decision(s) against the cloud router`,
    );

    const settled = await Promise.allSettled(decisions.map((d) => this.compareOne(d)));
    const results: LegacyVsCloudComparison[] = [];
    for (const [index, outcome] of settled.entries()) {
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
      } else {
        const msg = outcome.reason instanceof Error ? outcome.reason.message : 'Unknown error';
        this.logger.warn(`compareOne[${String(index)}] failed: ${msg}`);
      }
    }

    return this.buildBatchResult(results);
  }

  private async compareOne(
    decision: RoutingDecisionWithOutcomes,
  ): Promise<LegacyVsCloudComparison> {
    const context = this.buildContextFromDecision(decision);
    const { result, eligible } = await this.runChallenger(context);
    const cloud = this.buildCloudSummary(result, eligible);
    const legacy = this.buildLegacySummary(decision);

    return {
      decisionId: decision.id,
      messagePreview: (decision.messageContent ?? '').slice(0, COMPARISON_MESSAGE_PREVIEW_LENGTH),
      choiceAgrees: this.choiceAgrees(legacy, cloud),
      evaluatorVersion: ROUTING_JUDGE_RUBRIC_VERSION,
      comparedAt: new Date().toISOString(),
      legacy,
      cloud,
    };
  }

  /** Builds the shadow request the same way the live hot path does, then decides. Never serves the result. */
  private async runChallenger(context: RoutingContext): Promise<{
    result: CloudRouteResult;
    eligible: EligibleDeploymentRecord[];
  }> {
    const eligible = await this.cloudRouterEligibility.resolveEligibleDeployments(context);
    if (eligible.length === 0) {
      // Matches tryCloudRouting's own early return: a call that could not
      // have run anything is noise, not evidence, so it never reaches
      // route() and never emits a trace or an attempt row.
      return {
        result: { available: false, reason: CLOUD_ROUTER_UNAVAILABLE_NO_ELIGIBLE_DEPLOYMENT },
        eligible,
      };
    }

    const prompt = this.cloudRouterPrompt.buildPrompt(context, eligible);
    const result = await this.cloudRouter.route({
      traceId: randomUUID(),
      prompt,
      eligibleDeploymentIds: eligible.map((deployment) => deployment.id),
    });
    return { result, eligible };
  }

  private buildContextFromDecision(decision: RoutingDecisionWithOutcomes): RoutingContext {
    return {
      message: decision.messageContent ?? '',
      threadId: decision.threadId,
      userMode: decision.routingMode,
    };
  }

  private buildLegacySummary(decision: RoutingDecisionWithOutcomes): LegacyRouteSummary {
    return {
      provider: decision.selectedProvider,
      model: decision.selectedModel,
      confidence: decision.confidence !== null ? Number(decision.confidence) : null,
      reasonTags: decision.reasonTags,
      privacyClass: decision.privacyClass,
      quality: this.buildLegacyQuality(decision.outcomes),
      cost: this.buildLegacyCost(decision.costClass),
      latency: this.buildLegacyLatency(decision.routingDurationMs ?? null),
      failure: this.buildLegacyFailure(decision.outcomes),
    };
  }

  private buildLegacyQuality(outcomes: readonly RoutingOutcomeRecord[]): ComparisonQualitySignal {
    const outcome = outcomes[0];
    if (!outcome) {
      return {
        evaluatorVersion: ROUTING_JUDGE_RUBRIC_VERSION,
        available: false,
        unavailableReason: LEGACY_QUALITY_UNAVAILABLE_NO_OUTCOME,
      };
    }
    if (outcome.judgeOutcome === 'NONE') {
      return {
        evaluatorVersion: ROUTING_JUDGE_RUBRIC_VERSION,
        available: false,
        unavailableReason: LEGACY_QUALITY_UNAVAILABLE_NOT_JUDGED,
      };
    }
    return {
      evaluatorVersion: ROUTING_JUDGE_RUBRIC_VERSION,
      available: true,
      judgeOutcome: outcome.judgeOutcome,
      judgeConfidence:
        outcome.judgeConfidence !== null ? Number(outcome.judgeConfidence) : undefined,
      criticScore: outcome.criticScore !== null ? Number(outcome.criticScore) : undefined,
    };
  }

  private buildLegacyCost(costClass: string | null): ComparisonCostSignal {
    if (!costClass) {
      return { available: false, unavailableReason: LEGACY_COST_UNAVAILABLE_REASON };
    }
    return { available: true, costClass };
  }

  private buildLegacyLatency(routingDurationMs: number | null): ComparisonLatencySignal {
    if (routingDurationMs === null) {
      return { available: false };
    }
    return { available: true, latencyMs: routingDurationMs };
  }

  private buildLegacyFailure(outcomes: readonly RoutingOutcomeRecord[]): ComparisonFailureSignal {
    const outcome = outcomes[0];
    // A RoutingDecision row only ever exists once handleAuto produced SOME
    // decision — the fallback chain guarantees that — so routing itself
    // never fails on the legacy side. A failure here would be an execution
    // failure downstream of routing, which is a distinct question.
    if (!outcome || outcome.executionSuccess) {
      return { failed: false };
    }
    return {
      failed: true,
      code: outcome.executionStatus,
      safeMessage: outcome.followUpSignal ?? undefined,
    };
  }

  private buildCloudSummary(
    result: CloudRouteResult,
    eligible: readonly EligibleDeploymentRecord[],
  ): CloudRouteSummary {
    const quality: ComparisonQualitySignal = {
      evaluatorVersion: ROUTING_JUDGE_RUBRIC_VERSION,
      available: false,
      unavailableReason: CLOUD_QUALITY_UNAVAILABLE_SHADOW_ONLY,
    };
    const cost: ComparisonCostSignal = {
      available: false,
      unavailableReason: CLOUD_COST_UNAVAILABLE_REASON,
    };

    if (!result.available) {
      return {
        available: false,
        unavailableReason: result.reason,
        excluded: result.excluded ?? [],
        quality,
        cost,
        latency: { available: false },
        failure: { failed: true, code: result.reason },
      };
    }

    const { outcome } = result;
    if (!outcome.ok) {
      const lastAttempt = outcome.attempts.at(-1);
      return {
        available: true,
        excluded: result.excluded,
        quality,
        cost,
        latency: { available: lastAttempt !== undefined, latencyMs: lastAttempt?.latencyMs },
        failure: {
          failed: true,
          code: outcome.code,
          safeMessage: lastAttempt?.safeMessage ?? undefined,
        },
      };
    }

    const selected = eligible.find((deployment) => deployment.id === outcome.decision.deploymentId);
    const winningAttempt = [...outcome.attempts].reverse().find((a) => a.outcome === 'SUCCESS');

    return {
      available: true,
      provider: selected?.provider,
      model: selected?.providerModelId,
      deploymentId: outcome.decision.deploymentId,
      confidence: outcome.decision.confidence,
      workflow: outcome.decision.workflow,
      excluded: result.excluded,
      quality,
      cost,
      latency: { available: winningAttempt !== undefined, latencyMs: winningAttempt?.latencyMs },
      failure: { failed: false },
    };
  }

  private choiceAgrees(legacy: LegacyRouteSummary, cloud: CloudRouteSummary): boolean {
    if (!cloud.available || !cloud.provider || !cloud.model) {
      return false;
    }
    return (
      legacy.provider.toUpperCase() === cloud.provider.toUpperCase() &&
      legacy.model.toUpperCase() === cloud.model.toUpperCase()
    );
  }

  private buildBatchResult(results: LegacyVsCloudComparison[]): LegacyVsCloudBatchResult {
    const cloudAvailableCount = results.filter((r) => r.cloud.available).length;
    const cloudAgreesCount = results.filter((r) => r.choiceAgrees).length;
    const cloudFailedCount = results.filter((r) => r.cloud.failure.failed).length;

    return {
      totalCompared: results.length,
      cloudAvailableCount,
      cloudAgreesCount,
      cloudFailedCount,
      agreementRate: results.length > 0 ? cloudAgreesCount / results.length : 0,
      evaluatorVersion: ROUTING_JUDGE_RUBRIC_VERSION,
      results,
    };
  }
}
