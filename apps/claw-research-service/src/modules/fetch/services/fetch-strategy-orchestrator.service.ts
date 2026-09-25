import { Injectable, Logger, Optional } from '@nestjs/common';

import { BlockSignalKind } from '../../../common/enums/block-signal-kind.enum';
import {
  FETCH_ESCALATION_MIN_ATTEMPT_MS,
  FETCH_ESCALATION_WALL_CLOCK_MS,
  FETCH_SERVED_LOG_EVENT,
  FETCH_STRATEGY_MAX_ATTEMPTS,
  HOST_MEMORY_MAX_AGE_MS,
  STRATEGIES_PROMOTABLE_BY_HOST_MEMORY,
  STRATEGIES_TOUCHING_ORIGIN,
} from '../constants/fetch-strategy.constants';
import { FetchEscalationError } from '../errors/fetch-escalation.error';
import { FetchStrategyConfigRepository } from '../repositories/fetch-strategy-config.repository';
import { HostStrategyMemoryRepository } from '../repositories/host-strategy-memory.repository';
import {
  classifyBlockSignal,
  classifyBlockSignalFromError,
} from '../utilities/block-signal-classifier.utility';
import { hasTerminalSignal, isStrategyEligible } from '../utilities/escalation-policy.utility';
import {
  emptyFetchResult,
  hostOf,
  loggablePath,
  longerThin,
  publicConfigOf,
} from '../utilities/escalation-helpers.utility';
import { HostRateLimiter } from '../utilities/host-rate-limiter.utility';
import { FetchStrategyRegistryService } from './fetch-strategy-registry.service';
import type { FetchStrategyConfig } from '../../../generated/prisma';
import type {
  EscalationOptions,
  FetchEscalationResult,
  FetchStrategyAttempt,
  StrategyAttemptOutcome,
  ThinCandidate,
} from '../types/fetch-strategy.types';
import type { FetchRequest, FetchResult } from '../types/fetch.types';
import type { FetchStrategyAdapter } from '../adapters/fetch-strategy-adapter.interface';

/**
 * The escalation chain every live research fetch goes through (ADR-121).
 *
 * Enabled strategies run cheapest tier first; a host's remembered strategy
 * (`HostStrategyMemory`, ≤ 7 days old) runs first when it is still enabled
 * and promotable. Each result is classified (`classifyBlockSignal`) and the
 * escalation policy (`isStrategyEligible`) decides what may still run: a
 * technical block escalates, a refusal stops the chain.
 *
 * Bounded three ways, never by hope: at most `FETCH_STRATEGY_MAX_ATTEMPTS`
 * strategies, at most `FETCH_ESCALATION_WALL_CLOCK_MS` in total (each
 * attempt's timeout is clamped to what is left), and one request per host per
 * politeness interval (or the site's `Crawl-delay`, capped). robots.txt was
 * already checked by the caller.
 *
 * Every served page logs one `fetch.served` line naming the tier that served
 * it — origin and path only, never the query string (tokens live there).
 */
@Injectable()
export class FetchStrategyOrchestratorService {
  private readonly logger = new Logger(FetchStrategyOrchestratorService.name);
  private readonly rateLimiter: HostRateLimiter;

  constructor(
    private readonly configs: FetchStrategyConfigRepository,
    private readonly hostMemory: HostStrategyMemoryRepository,
    private readonly registry: FetchStrategyRegistryService,
    @Optional() rateLimiter?: HostRateLimiter,
  ) {
    this.rateLimiter = rateLimiter ?? new HostRateLimiter();
  }

  async fetchWithEscalation(
    request: FetchRequest,
    options: EscalationOptions = {},
  ): Promise<FetchEscalationResult> {
    const host = hostOf(request.url);
    const deadline = Date.now() + FETCH_ESCALATION_WALL_CLOCK_MS;
    const observed = new Set<BlockSignalKind>(options.initialSignals ?? []);
    const excluded = new Set(options.excludeKinds ?? []);
    const attempts: FetchStrategyAttempt[] = [];
    let bestThin: ThinCandidate | null = null;

    for (const config of await this.buildChain(host)) {
      if (attempts.length >= FETCH_STRATEGY_MAX_ATTEMPTS || hasTerminalSignal(observed)) {
        break;
      }
      const adapter = this.runnableAdapter(config, request.url, observed, excluded);
      if (adapter === null) {
        continue;
      }
      const remaining = deadline - Date.now();
      if (remaining < FETCH_ESCALATION_MIN_ATTEMPT_MS) {
        this.logger.warn(`fetch.budget_exhausted host=${host} attempts=${String(attempts.length)}`);
        break;
      }
      if (STRATEGIES_TOUCHING_ORIGIN.has(config.kind)) {
        await this.rateLimiter.waitForTurn(host, options.minHostIntervalMs ?? null);
      }
      const timeoutMs = Math.min(
        config.timeoutMs,
        request.timeoutMs ?? config.timeoutMs,
        remaining,
      );
      const attempt = await this.tryStrategy(adapter, config, { ...request, timeoutMs });
      attempts.push(attempt.record);

      if (attempt.record.outcome === 'SUCCESS') {
        await this.hostMemory.recordSuccess(host, config.kind);
        this.logServed(request.url, config, attempts, observed, attempt.result);
        return {
          result: { ...attempt.result, servedBy: config.kind },
          winningStrategy: config.kind,
          attempts,
        };
      }
      observed.add(attempt.record.blockSignal);
      if (attempt.record.blockSignal === BlockSignalKind.EMPTY_JS_SHELL) {
        bestThin = longerThin(bestThin, { config, result: attempt.result });
        continue;
      }
      await this.hostMemory.recordFailure(host, config.kind, attempt.record.blockSignal);
    }

    // Every renderer came back thin too: the page really is short. Its live
    // text beats both an error and anyone else's copy of it.
    if (bestThin !== null && !hasTerminalSignal(observed)) {
      this.logServed(request.url, bestThin.config, attempts, observed, bestThin.result);
      return {
        result: { ...bestThin.result, servedBy: bestThin.config.kind },
        winningStrategy: bestThin.config.kind,
        attempts,
      };
    }

    const signals = [...observed];
    const trail = attempts.map((attempt) => `${attempt.kind}=${attempt.blockSignal}`).join(', ');
    this.logger.warn(
      `fetch.failed host=${host} path=${loggablePath(request.url)} attempts=${String(attempts.length)} signals=${signals.join('|')} trail=[${trail}]`,
    );
    throw new FetchEscalationError(
      `No fetch strategy could serve ${loggablePath(request.url)} (${String(attempts.length)} tried: ${trail || 'none eligible'})`,
      attempts,
      signals,
    );
  }

  /** The adapter to run for this config, or null when it must be skipped. */
  private runnableAdapter(
    config: FetchStrategyConfig,
    url: string,
    observed: ReadonlySet<BlockSignalKind>,
    excluded: ReadonlySet<FetchStrategyConfig['kind']>,
  ): FetchStrategyAdapter | null {
    if (excluded.has(config.kind) || !isStrategyEligible(config.kind, observed)) {
      return null;
    }
    const adapter = this.registry.get(config.kind);
    if (adapter === undefined) {
      this.logger.warn(`No adapter registered for enabled strategy ${config.kind}`);
      return null;
    }
    if (adapter.supports !== undefined && !adapter.supports(url)) {
      return null;
    }
    return adapter;
  }

  private async buildChain(host: string): Promise<FetchStrategyConfig[]> {
    const enabled = await this.configs.listEnabledByTier();
    const memory = await this.hostMemory.findByHost(host);
    if (
      memory === null ||
      Date.now() - memory.updatedAt.getTime() > HOST_MEMORY_MAX_AGE_MS ||
      !STRATEGIES_PROMOTABLE_BY_HOST_MEMORY.has(memory.preferredKind)
    ) {
      return enabled;
    }
    const preferred = enabled.find((config) => config.kind === memory.preferredKind);
    if (preferred === undefined) {
      return enabled;
    }
    return [preferred, ...enabled.filter((config) => config !== preferred)];
  }

  private async tryStrategy(
    adapter: FetchStrategyAdapter,
    config: FetchStrategyConfig,
    request: FetchRequest,
  ): Promise<StrategyAttemptOutcome> {
    const start = Date.now();
    try {
      const result = await adapter.fetchPage({
        url: request.url,
        timeoutMs: request.timeoutMs,
        strategyConfig: publicConfigOf(config),
      });
      const blockSignal = classifyBlockSignal(result);
      const outcome = blockSignal === BlockSignalKind.NONE ? 'SUCCESS' : 'BLOCKED';
      this.logger.log(
        `fetch.attempt kind=${config.kind} outcome=${outcome} signal=${blockSignal} status=${String(result.httpStatus)} host=${hostOf(request.url)} ms=${String(Date.now() - start)}`,
      );
      return {
        record: { kind: config.kind, outcome, blockSignal, durationMs: Date.now() - start },
        result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const blockSignal = classifyBlockSignalFromError(error);
      this.logger.log(
        `fetch.attempt kind=${config.kind} outcome=ERROR signal=${blockSignal} host=${hostOf(request.url)} ms=${String(Date.now() - start)} error=${message.slice(0, 160)}`,
      );
      return {
        record: {
          kind: config.kind,
          outcome: 'ERROR',
          blockSignal,
          errorMessage: message,
          durationMs: Date.now() - start,
        },
        result: emptyFetchResult(request.url),
      };
    }
  }

  private logServed(
    url: string,
    config: FetchStrategyConfig,
    attempts: readonly FetchStrategyAttempt[],
    observed: ReadonlySet<BlockSignalKind>,
    result: FetchResult,
  ): void {
    this.logger.log(
      `${FETCH_SERVED_LOG_EVENT} kind=${config.kind} tier=${String(config.tier)} host=${hostOf(url)} path=${loggablePath(url)} attempts=${String(attempts.length)} signalsBefore=${[...observed].join('|') || 'none'} status=${String(result.httpStatus)} chars=${String(result.content.length)}${result.archivedAt === undefined ? '' : ` archivedAt=${result.archivedAt}`}`,
    );
  }
}
