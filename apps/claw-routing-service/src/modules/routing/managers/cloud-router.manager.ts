import { Injectable, Logger } from '@nestjs/common';
import type { RouterProvider } from '../../../generated/prisma';
import {
  CLOUD_ROUTER_UNAVAILABLE_DISABLED,
  CLOUD_ROUTER_UNAVAILABLE_NO_CONFIGURATION,
  CLOUD_ROUTER_UNAVAILABLE_NO_ELIGIBLE_DEPLOYMENT,
  CLOUD_ROUTER_UNAVAILABLE_NO_RUNNABLE_ENTRY,
} from '../constants/router-chain.constants';
import { GeminiRouterAdapter } from '../adapters/gemini-router.adapter';
import { LegacyLocalRouterAdapter } from '../adapters/legacy-local-router.adapter';
import { OllamaCloudRouterAdapter } from '../adapters/ollama-cloud-router.adapter';
import { RouterAttemptRepository } from '../repositories/router-attempt.repository';
import { RouterConfigurationRepository } from '../repositories/router-configuration.repository';
import { RouterTraceService } from '../services/router-trace.service';
import type { RouterTraceContext } from '../types/router-trace.types';
import { toAttemptRecords } from '../utilities/router-attempt-mapping.utility';
import type { CloudRouteRequest, CloudRouteResult } from '../types/cloud-router.types';
import type { RouterInferenceProvider } from '../types/router-inference.types';
import { isChainServiceable, resolveChain } from '../utilities/router-chain-resolution.utility';
import { RouterInferenceCoordinatorManager } from './router-inference-coordinator.manager';

/**
 * Entry point for cloud-first routing.
 *
 * Loads one immutable snapshot of the published configuration, resolves which
 * chain entries can run, and walks them through the coordinator.
 *
 * It never falls back to the legacy heuristic on its own. Every unavailable
 * path returns a typed reason so the caller decides explicitly whether to use
 * the legacy router — a silent fallback would make "is the cloud router
 * actually serving traffic?" unanswerable, which is exactly what the rollout
 * needs to measure.
 */
@Injectable()
export class CloudRouterManager {
  private readonly logger = new Logger(CloudRouterManager.name);

  constructor(
    private readonly configurations: RouterConfigurationRepository,
    private readonly coordinator: RouterInferenceCoordinatorManager,
    private readonly attempts: RouterAttemptRepository,
    private readonly trace: RouterTraceService,
    private readonly gemini: GeminiRouterAdapter,
    private readonly ollamaCloud: OllamaCloudRouterAdapter,
    private readonly legacyLocal: LegacyLocalRouterAdapter,
  ) {}

  /**
   * Routes, then records what happened.
   *
   * `decide` has four early returns and a walk; wrapping it means every one of
   * them is traced and persisted, rather than only the paths someone remembered
   * to instrument. A decline is the case an operator most needs evidence for,
   * and it is also the easiest to leave untraced.
   *
   * Both side effects are best effort and awaited only so failures are logged
   * in order. Neither can change the routing result.
   */
  async route(request: CloudRouteRequest): Promise<CloudRouteResult> {
    const context: RouterTraceContext = {
      traceId: request.traceId,
      requestId: request.requestId ?? request.traceId,
      threadId: request.threadId ?? null,
      sequence: 0,
    };

    const result = await this.decide(request);

    if (result.available) {
      await this.attempts.recordAttempts(
        toAttemptRecords(request.traceId, result.outcome.attempts),
      );
    }
    await this.trace.emit(context, result);

    return result;
  }

  /** Adapters keyed by the provider they serve. */
  private get providers(): ReadonlyMap<RouterProvider, RouterInferenceProvider> {
    return new Map<RouterProvider, RouterInferenceProvider>([
      [this.gemini.provider, this.gemini],
      [this.ollamaCloud.provider, this.ollamaCloud],
      [this.legacyLocal.provider, this.legacyLocal],
    ]);
  }

  /** The routing decision itself. Wrapped by route() so every path is traced. */
  private async decide(request: CloudRouteRequest): Promise<CloudRouteResult> {
    const snapshot = await this.configurations.findPublishedSnapshot();
    if (!snapshot) {
      return { available: false, reason: CLOUD_ROUTER_UNAVAILABLE_NO_CONFIGURATION };
    }

    const providers = this.providers;
    const resolution = resolveChain(snapshot, new Set(providers.keys()));

    if (!snapshot.enabled) {
      // The seeded chain is published but off. This is the normal state before
      // an admin turns it on, so it is a debug-level fact rather than a warning.
      this.logger.debug(`route: configuration revision ${String(snapshot.revision)} is disabled`);
      return { available: false, reason: CLOUD_ROUTER_UNAVAILABLE_DISABLED };
    }

    if (!isChainServiceable(snapshot, resolution)) {
      this.logger.warn(
        `route: no runnable chain entry in revision ${String(snapshot.revision)} - ` +
          `excluded=[${resolution.excluded.map((e) => `${e.modelAlias}:${e.reason}`).join(', ')}]`,
      );
      return {
        available: false,
        reason: CLOUD_ROUTER_UNAVAILABLE_NO_RUNNABLE_ENTRY,
        excluded: resolution.excluded,
      };
    }

    // Hard policy filtering happens before this call; an empty eligible set here
    // means nothing survived it, and asking a router to choose from nothing
    // would invite it to invent an id.
    if (request.eligibleDeploymentIds.length === 0) {
      return {
        available: false,
        reason: CLOUD_ROUTER_UNAVAILABLE_NO_ELIGIBLE_DEPLOYMENT,
        excluded: resolution.excluded,
      };
    }

    const outcome = await this.coordinator.run(providers, {
      traceId: request.traceId,
      // Carried, never derived. The coordinator meters the router's own paid
      // calls against this wallet; a walk that arrives without one is left
      // unmetered instead of billed to a guess.
      userId: request.userId,
      prompt: request.prompt,
      chain: resolution.runnable,
      totalDeadlineMs: snapshot.totalDeadlineMs,
      maxAttempts: snapshot.maxAttempts,
      minConfidence: snapshot.minConfidence,
      eligibleDeploymentIds: request.eligibleDeploymentIds,
    });

    return {
      available: true,
      configurationRevision: snapshot.revision,
      excluded: resolution.excluded,
      outcome,
    };
  }
}
