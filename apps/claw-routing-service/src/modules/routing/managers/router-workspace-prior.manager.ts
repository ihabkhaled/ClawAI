import { Injectable, Logger } from '@nestjs/common';
import {
  MAX_WORKSPACE_PRIOR_NUDGE,
  MIN_WORKSPACE_PRIOR_SAMPLE_SIZE,
  WORKSPACE_PRIOR_BLEND_WEIGHT,
  WORKSPACE_PRIOR_CONFIDENCE_RAMP_SAMPLES,
} from '../constants/routing-education.constants';
import { RoutingEducationRepository } from '../repositories/routing-education.repository';
import type { RoutingContext, RoutingDecisionResult } from '../types/routing.types';
import type {
  UpsertWorkspacePriorInput,
  WorkspacePriorNudgeResult,
} from '../types/workspace-prior.types';

/**
 * V6 learning evolution (ADR-070) — workspace-tier hierarchical
 * personalization: global → domain/task → workspace, applied after evidence.
 *
 * A bounded secondary signal on top of RouterEducationManager's global
 * calibration, never a replacement for it. Kept as its own manager rather
 * than folded into RouterEducationManager (already over this repo's 500-line
 * file guidance per V5's disclosed deviation) — same "new sibling" pattern
 * V4 used for the same reason.
 *
 * Inert today: nothing upstream populates RoutingContext.workspaceId or
 * RoutingCompletedEventPayload.workspaceId yet (that requires chat-service to
 * thread a workspace id through the RabbitMQ payload, which is cross-service
 * work outside this batch's routing-service-only scope). Every method here
 * degrades to a no-op the moment workspaceId is absent — which is 100% of
 * current traffic.
 */
@Injectable()
export class RouterWorkspacePriorManager {
  private readonly logger = new Logger(RouterWorkspacePriorManager.name);

  constructor(private readonly repository: RoutingEducationRepository) {}

  /**
   * Incremental running-average update, gated by nothing (every outcome
   * counts) — the min-sample gate lives on the READ side
   * (resolveNudge/MIN_WORKSPACE_PRIOR_SAMPLE_SIZE), not here, so a thin
   * prior still accumulates evidence even while it's not yet trusted.
   */
  async ingestOutcome(input: UpsertWorkspacePriorInput): Promise<void> {
    const existing = await this.repository.findWorkspacePrior(
      input.workspaceId,
      input.provider,
      input.model,
      input.taskFamily,
    );

    const previousCount = existing ? Number(existing.routeCount) : 0;
    const previousRate = existing ? Number(existing.successRate) : 0;
    const nextCount = previousCount + 1;
    const observed = input.executionSuccess ? 1 : 0;
    // Simple running average: each new observation moves the rate by
    // 1/nextCount toward itself. No recency decay at this tier — the global
    // tier already decays, and a per-workspace window is thin enough that
    // decaying it further would mostly discard the very evidence the
    // min-sample gate is waiting to accumulate.
    const nextRate = previousRate + (observed - previousRate) / nextCount;
    const confidenceInPrior = Math.min(1, nextCount / WORKSPACE_PRIOR_CONFIDENCE_RAMP_SAMPLES);

    await this.repository.upsertWorkspacePrior({
      workspaceId: input.workspaceId,
      provider: input.provider,
      model: input.model,
      taskFamily: input.taskFamily,
      routeCount: nextCount,
      successRate: nextRate,
      confidenceInPrior,
      scoreVersion: input.scoreVersion ?? null,
    });
  }

  /**
   * Applies a bounded confidence nudge for an already-finalized decision.
   * NEVER changes selectedProvider/selectedModel — call this only after any
   * provider/model-selection logic has already run, so a workspace signal
   * can adjust confidence but can never be the reason a different model is
   * chosen. That is the pack's "preference overriding hard policy" guard
   * applied literally: there is no code path here that can override policy,
   * because this method cannot see or touch selection at all.
   */
  async resolveNudge(
    context: RoutingContext,
    decision: RoutingDecisionResult,
  ): Promise<WorkspacePriorNudgeResult> {
    const notApplied: WorkspacePriorNudgeResult = {
      confidence: decision.confidence,
      applied: false,
    };

    if (!context.workspaceId || decision.selectedProvider === 'UNAVAILABLE') {
      return notApplied;
    }

    const taskFamily = decision.detectedCategory ?? 'general';
    const prior = await this.repository.findWorkspacePrior(
      context.workspaceId,
      decision.selectedProvider,
      decision.selectedModel,
      taskFamily,
    );

    if (!prior || Number(prior.routeCount) < MIN_WORKSPACE_PRIOR_SAMPLE_SIZE) {
      return notApplied;
    }

    const priorConfidence = Math.min(1, Math.max(0, Number(prior.confidenceInPrior)));
    const rawNudge =
      (Number(prior.successRate) - decision.confidence) *
      priorConfidence *
      WORKSPACE_PRIOR_BLEND_WEIGHT;
    const boundedNudge = Math.min(
      MAX_WORKSPACE_PRIOR_NUDGE,
      Math.max(-MAX_WORKSPACE_PRIOR_NUDGE, rawNudge),
    );

    this.logger.debug(
      `resolveNudge: workspace=${context.workspaceId} ${decision.selectedProvider}/${decision.selectedModel} nudge=${boundedNudge.toFixed(4)}`,
    );

    return {
      confidence: Math.min(1, Math.max(0, decision.confidence + boundedNudge)),
      applied: true,
    };
  }
}
