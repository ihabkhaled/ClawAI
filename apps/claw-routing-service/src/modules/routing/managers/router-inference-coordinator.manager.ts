import { Injectable, Logger, Optional } from '@nestjs/common';
import { PaygMeter } from '@claw/shared-entitlements';
import { PaygSurface } from '@claw/shared-types';
import { RouterErrorCode } from '../../../common/enums';
import type { RouterProvider } from '../../../generated/prisma';
import { ROUTER_MAX_OUTPUT_TOKENS } from '../constants/router-adapter.constants';
import { MAX_STRUCTURED_OUTPUT_REPAIRS } from '../constants/router-error.constants';
import type {
  RouterChainEntryInput,
  RouterCoordinatorOptions,
  RouterCoordinatorResult,
  RouterEntryOutcome,
  RouterInferenceProvider,
  RouterInferenceRequest,
  RouterInferenceResponse,
  RouterWalkState,
} from '../types/router-inference.types';
import {
  buildRepairHint,
  validateRouterDecision,
} from '../utilities/router-decision-validation.utility';
import { estimateRouterPromptTokens } from '../utilities/router-token-estimate.utility';
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
   * @param payg thin client over auth-service's credit wallet. @Optional() on
   * purpose: the router must keep routing when metering is not wired, and every
   * existing caller constructs this manager with no arguments. A missing meter
   * degrades to an unmetered call and says so in the log, rather than taking
   * AUTO mode down.
   */
  constructor(@Optional() private readonly payg?: PaygMeter) {}

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

      // A non-empty trigger list means "reach this entry only for these
      // failures". Ignoring it made every gated entry reachable by ordinary
      // order — so the seeded chain's model-fallback would run after a timeout
      // it was never meant to answer, spending budget on the wrong remedy.
      // An empty list stays unconditional.
      if (entry.triggers.length > 0 && !entry.triggers.includes(state.lastCode)) {
        this.logger.debug(`run: entry ${String(entry.order)} not triggered by ${state.lastCode}`);
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
      const response = await this.invokeMetered(adapter, entry, options, attemptNumber, {
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
          // The repair hint belongs to the malformed answer that prompted it.
          // Carrying it into an ordinary retry re-sent a stale correction and
          // recorded that retry as wasRepair=true, overstating how often the
          // repair path fired.
          repairHint = undefined;
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

  /**
   * One paid router call, wrapped in a PAYG reserve -> finalize / release cycle.
   *
   * WHY THIS EXISTS. The router calls real, billed models (Gemini, Ollama
   * Cloud) to decide where a message goes. Those adapters have always returned
   * true token counts, which landed in `router_attempts` and went no further,
   * so every AUTO-routed message spent provider money that no wallet ever saw
   * (U5/U6 in the PAYG audit).
   *
   * WHAT IT DOES NOT DECIDE. Whether this provider costs money is
   * auth-service's call, never this manager's. A local model comes back
   * `metered: false` from `reserve` and is charged nothing. Compiling that
   * predicate in here would put it in six `node_modules` copies and make the
   * connector admin toggle unenforceable without a six-container rebuild
   * (ADR-082). Note that OLLAMA_CLOUD is a routing-only provider name that
   * connector-service does not carry, so it resolves as unclassified and
   * therefore free, which is exactly the default D1/A3 chose for Ollama Cloud.
   */
  private async invokeMetered(
    adapter: RouterInferenceProvider,
    entry: RouterChainEntryInput,
    options: RouterCoordinatorOptions,
    attemptNumber: number,
    request: RouterInferenceRequest,
  ): Promise<RouterInferenceResponse> {
    const payg = this.payg;
    if (payg === undefined || options.userId === undefined) {
      // Not an error: replays, shadow evaluations and any boot without the
      // meter wired legitimately have no wallet to charge. Logged so an
      // unmetered production path stays visible rather than silent.
      const reason = payg === undefined ? 'NO_METER' : 'NO_USER';
      this.logger.debug(
        `invokeMetered: unmetered call provider=${entry.provider} trace=${options.traceId} reason=${reason}`,
      );
      return adapter.invoke(request);
    }

    const startedAt = Date.now();
    const hold = await this.reserveHold(
      payg,
      options.userId,
      entry,
      options,
      attemptNumber,
      request,
    );
    if (hold === null) {
      // FAILS CLOSED. Exhausted credit and an unreachable auth-service are
      // treated alike on purpose: neither is a licence to spend a provider's
      // money unbounded. BUDGET_EXCEEDED is REQUEST-scoped, so the walk stops
      // and `tryCloudRouting` returns null, which drops AUTO mode to the local
      // heuristic router instead of refusing the user's message. That is D4
      // exactly: degrade to local, never take the product down.
      return {
        ok: false,
        code: RouterErrorCode.BUDGET_EXCEEDED,
        safeMessage: 'router inference is not covered by the available credit',
        latencyMs: Date.now() - startedAt,
      };
    }

    try {
      // ALWAYS the granted ceiling, never the requested one. Below the balance
      // the clamp returns a smaller number, and honouring it is what makes "a
      // user cannot exceed their credit" true by construction rather than by
      // reconciliation.
      const response = await adapter.invoke({ ...request, maxOutputTokens: hold.maxOutputTokens });

      if (!response.ok) {
        // The user got nothing, so the hold is returned rather than settled.
        // Release is idempotent: a double release is a no-op, never a double
        // refund.
        await payg.release(hold, 'PROVIDER_ERROR');
        return response;
      }

      // Reconcile against what the provider actually reported. A null count
      // settles as zero rather than as the held worst case: charging a user for
      // tokens no provider ever confirmed is the wrong direction to guess in,
      // and the remainder of the hold is released either way.
      await payg.finalize(
        hold,
        {
          promptTokens: response.inputTokens ?? 0,
          completionTokens: response.outputTokens ?? 0,
          cachedPromptTokens: 0,
          // The router asks for a minimal thinking budget and neither adapter
          // reports a reasoning count, so there is nothing to attribute here.
          // Guessing would double-charge: `calculateCostMicroUsd` sums
          // reasoning and output as DISJOINT buckets.
          reasoningTokens: 0,
        },
        { toolCalls: 0 },
      );
      return response;
    } catch (error) {
      await payg.release(hold, 'PROVIDER_ERROR');
      throw error;
    }
  }

  /**
   * Takes the hold, or returns null when the wallet refuses.
   *
   * `null` rather than a thrown error so the caller keeps one exit shape and
   * the refusal is translated into the chain's own vocabulary exactly once.
   */
  private async reserveHold(
    payg: PaygMeter,
    // Passed explicitly rather than read off `options`, because the caller has
    // already proven it is present and TypeScript cannot carry that narrowing
    // across a method boundary. The reservation contract requires a real user.
    userId: string,
    entry: RouterChainEntryInput,
    options: RouterCoordinatorOptions,
    attemptNumber: number,
    request: RouterInferenceRequest,
  ): Promise<Awaited<ReturnType<PaygMeter['reserve']>> | null> {
    try {
      return await payg.reserve({
        userId,
        // Unique PER ATTEMPT, not per walk. `reserve` is idempotent on
        // (userId, requestId) so a retried request reuses its hold, and a retry
        // inside the entry loop is a SECOND paid call rather than a repeat of
        // the first. Sharing the key across attempts would silently
        // under-charge every retried route.
        requestId: `${options.traceId}:${entry.entryId}:${String(attemptNumber)}`,
        provider: entry.provider,
        model: entry.providerModelId,
        surface: PaygSurface.ROUTING,
        promptTokens: estimateRouterPromptTokens(request.prompt),
        // The router prompt is composed fresh per request and never sent
        // through a provider prompt cache, so nothing here is a cache hit.
        cachedPromptTokens: 0,
        requestedMaxOutputTokens: request.maxOutputTokens ?? ROUTER_MAX_OUTPUT_TOKENS,
      });
    } catch (error) {
      this.logger.warn(
        `reserveHold: reservation refused provider=${entry.provider} trace=${options.traceId} - ${(error as Error).message}`,
      );
      return null;
    }
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
