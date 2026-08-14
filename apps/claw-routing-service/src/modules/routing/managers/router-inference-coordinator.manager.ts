import { Injectable, Logger } from '@nestjs/common';
import { RouterErrorCode } from '../../../common/enums';
import type { RouterProvider } from '../../../generated/prisma';
import { MAX_STRUCTURED_OUTPUT_REPAIRS } from '../constants/router-error.constants';
import type {
  RouterChainEntryInput,
  RouterCoordinatorOptions,
  RouterCoordinatorResult,
  RouterEntryOutcome,
  RouterInferenceProvider,
  RouterInferenceResponse,
  RouterWalkState,
} from '../types/router-inference.types';
import {
  buildRepairHint,
  validateRouterDecision,
} from '../utilities/router-decision-validation.utility';
import {
  isRetryableRouterError,
  isTerminalForRequest,
  shouldQuarantineDeployment,
  shouldSkipProvider,
} from '../utilities/router-error-mapping.utility';

/**
 * Walks the configured router chain and returns the first trustworthy decision.
 *
 * Everything about failure lives here rather than in the adapters, so the
 * behaviour is proven once instead of per provider. The invariants it enforces:
 *
 * - the total deadline and attempt ceiling always win, including mid-retry;
 * - a retryable failure is retried only within its own entry's budget;
 * - a provider-scoped failure skips every later entry on that provider;
 * - a malformed answer earns exactly one stricter re-ask, then the chain moves on;
 * - a decision naming an ineligible deployment is refused, never trusted;
 * - low confidence is a distinct outcome from provider failure;
 * - cancellation, budget and policy stop the walk instead of routing around it.
 */
@Injectable()
export class RouterInferenceCoordinatorManager {
  private readonly logger = new Logger(RouterInferenceCoordinatorManager.name);

  /**
   * @param providers one adapter per provider; an entry whose provider has no
   * adapter is skipped rather than failing the walk, so a partially configured
   * chain still routes.
   */
  async run(
    providers: ReadonlyMap<RouterProvider, RouterInferenceProvider>,
    options: RouterCoordinatorOptions,
    now: () => number = Date.now,
  ): Promise<RouterCoordinatorResult> {
    const state: RouterWalkState = {
      attempts: [],
      quarantined: [],
      skippedProviders: new Set<RouterProvider>(),
      lastCode: RouterErrorCode.UNKNOWN,
      deadlineAt: now() + options.totalDeadlineMs,
    };

    const ordered = [...options.chain].sort((left, right) => left.order - right.order);

    for (const entry of ordered) {
      if (state.skippedProviders.has(entry.provider)) {
        this.logger.debug(
          `run: skipping entry ${String(entry.order)} - provider ${entry.provider} already failed`,
        );
        continue;
      }
      if (state.attempts.length >= options.maxAttempts || now() >= state.deadlineAt) {
        break;
      }

      const adapter = providers.get(entry.provider);
      if (!adapter) {
        this.logger.warn(`run: no adapter registered for provider ${entry.provider}`);
        continue;
      }

      const outcome = await this.runEntry(adapter, entry, options, state, now);
      if (outcome.ok) {
        return {
          ok: true,
          decision: outcome.decision,
          attempts: state.attempts,
          fallbackDepth: ordered.indexOf(entry),
        };
      }
      if (outcome.stop) {
        break;
      }
    }

    this.logger.warn(
      `run: chain exhausted trace=${options.traceId} attempts=${String(state.attempts.length)} lastCode=${state.lastCode}`,
    );
    return {
      ok: false,
      code: state.lastCode,
      attempts: state.attempts,
      quarantinedDeploymentIds: state.quarantined,
    };
  }

  /** Runs one chain entry, including its retries and its single repair. */
  private async runEntry(
    adapter: RouterInferenceProvider,
    entry: RouterChainEntryInput,
    options: RouterCoordinatorOptions,
    state: RouterWalkState,
    now: () => number,
  ): Promise<RouterEntryOutcome> {
    let attemptNumber = 0;
    let repairsUsed = 0;
    let repairHint: string | undefined;

    // One loop covers retries and the repair: both are "ask this same entry
    // again", and separating them would let the two budgets overrun the shared
    // attempt ceiling.
    while (attemptNumber <= entry.retries + MAX_STRUCTURED_OUTPUT_REPAIRS) {
      if (state.attempts.length >= options.maxAttempts || now() >= state.deadlineAt) {
        return { ok: false, stop: true };
      }

      attemptNumber += 1;
      const wasRepair = repairHint !== undefined;
      const remainingMs = state.deadlineAt - now();
      const response = await adapter.invoke({
        traceId: options.traceId,
        prompt: options.prompt,
        providerModelId: entry.providerModelId,
        deploymentId: entry.deploymentId,
        // The total deadline outranks the per-entry timeout; an entry may not
        // spend budget the request no longer has.
        timeoutMs: Math.max(0, Math.min(entry.attemptTimeoutMs, remainingMs)),
        repairHint,
      });

      if (!response.ok) {
        this.record(state, entry, attemptNumber, response, wasRepair);
        state.lastCode = response.code;

        if (shouldQuarantineDeployment(response.code)) {
          state.quarantined.push(entry.deploymentId);
        }
        if (isTerminalForRequest(response.code)) {
          return { ok: false, stop: true };
        }

        // Retries come before scope on purpose. A timeout is both retryable and
        // provider-scoped: one slow call is not yet evidence the provider is
        // down, so the entry spends its own budget first and only a failure
        // that survives that condemns the provider. Checking scope first would
        // make `retries` dead configuration for every transient error.
        if (isRetryableRouterError(response.code) && attemptNumber <= entry.retries) {
          continue;
        }

        if (shouldSkipProvider(response.code)) {
          state.skippedProviders.add(entry.provider);
        }
        return { ok: false, stop: false };
      }

      const validation = validateRouterDecision(response.raw, options.eligibleDeploymentIds);
      if (!validation.valid) {
        this.record(
          state,
          entry,
          attemptNumber,
          {
            ok: false,
            code: RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT,
            safeMessage: validation.rejection,
            latencyMs: response.latencyMs,
          },
          wasRepair,
        );
        state.lastCode = RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT;

        if (repairsUsed < MAX_STRUCTURED_OUTPUT_REPAIRS) {
          repairsUsed += 1;
          repairHint = buildRepairHint(response.raw);
          continue;
        }
        return { ok: false, stop: false };
      }

      // A valid decision nobody trusts is not a provider failure, so it is
      // recorded as its own outcome and the chain continues to a stronger entry.
      if (validation.decision.confidence < options.minConfidence) {
        this.record(
          state,
          entry,
          attemptNumber,
          {
            ok: false,
            code: RouterErrorCode.LOW_CONFIDENCE,
            safeMessage: `confidence ${validation.decision.confidence.toFixed(2)} below ${options.minConfidence.toFixed(2)}`,
            latencyMs: response.latencyMs,
          },
          wasRepair,
        );
        state.lastCode = RouterErrorCode.LOW_CONFIDENCE;
        return { ok: false, stop: false };
      }

      state.attempts.push({
        entryId: entry.entryId,
        order: entry.order,
        attemptNumber,
        provider: entry.provider,
        providerModelId: entry.providerModelId,
        deploymentId: entry.deploymentId,
        outcome: 'SUCCESS',
        code: null,
        safeMessage: null,
        latencyMs: response.latencyMs,
        wasRepair,
      });
      return { ok: true, decision: validation.decision };
    }

    return { ok: false, stop: false };
  }

  private record(
    state: RouterWalkState,
    entry: RouterChainEntryInput,
    attemptNumber: number,
    response: Extract<RouterInferenceResponse, { ok: false }>,
    wasRepair: boolean,
  ): void {
    state.attempts.push({
      entryId: entry.entryId,
      order: entry.order,
      attemptNumber,
      provider: entry.provider,
      providerModelId: entry.providerModelId,
      deploymentId: entry.deploymentId,
      outcome: 'FAILURE',
      code: response.code,
      safeMessage: response.safeMessage,
      latencyMs: response.latencyMs,
      wasRepair,
    });
  }
}
