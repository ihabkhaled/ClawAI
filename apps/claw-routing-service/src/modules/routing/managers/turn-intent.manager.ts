import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import type { RouterProvider } from '../../../generated/prisma';
import { GeminiRouterAdapter } from '../adapters/gemini-router.adapter';
import { LegacyLocalRouterAdapter } from '../adapters/legacy-local-router.adapter';
import { OllamaCloudRouterAdapter } from '../adapters/ollama-cloud-router.adapter';
import {
  TURN_INTENT_CACHE_MAX_ENTRIES,
  TURN_INTENT_CACHE_TTL_MS,
  TURN_INTENT_DEADLINE_MS,
  TURN_INTENT_MIN_CONFIDENCE,
} from '../constants/turn-intent.constants';
import { RouterConfigurationRepository } from '../repositories/router-configuration.repository';
import type { RouterInferenceProvider } from '../types/router-inference.types';
import type {
  TurnIntentAnswer,
  TurnIntentCacheEntry,
  TurnIntentRequest,
} from '../types/turn-intent.types';
import { isChainServiceable, resolveChain } from '../utilities/router-chain-resolution.utility';
import {
  buildTurnIntentPrompt,
  preferTurnIntentModels,
  turnIntentCacheKey,
  turnIntentValidator,
} from '../utilities/turn-intent.utility';
import { RouterInferenceCoordinatorManager } from './router-inference-coordinator.manager';

/**
 * Asks a model what a turn wants PRODUCED — text, an image, a file… — in any
 * language (ADR-218). Keyword tables misrouted pasted code, rewrites and
 * non-English posts to file and image jobs; a model reads the request.
 *
 * It rides the cloud router's published chain, adapters and coordinator, so it
 * is metered against the user's wallet exactly like a router call and obeys
 * the same deadline, retry and repair rules. Every failure — no published or
 * enabled configuration, nothing runnable, timeout, malformed answer, a
 * thrown error — is `null`, and the caller falls back to the keyword path.
 * It never throws into routing.
 */
@Injectable()
export class TurnIntentManager {
  private readonly logger = new Logger(TurnIntentManager.name);
  private readonly cache = new Map<string, TurnIntentCacheEntry>();

  constructor(
    private readonly configurations: RouterConfigurationRepository,
    private readonly coordinator: RouterInferenceCoordinatorManager,
    private readonly gemini: GeminiRouterAdapter,
    private readonly ollamaCloud: OllamaCloudRouterAdapter,
    private readonly legacyLocal: LegacyLocalRouterAdapter,
  ) {}

  async classify(
    request: TurnIntentRequest,
    now: () => number = Date.now,
  ): Promise<TurnIntentAnswer | null> {
    const key = turnIntentCacheKey(request);
    const cached = this.cache.get(key);
    if (cached !== undefined && cached.expiresAt > now()) {
      return cached.answer;
    }
    const answer = await this.askSafely(request);
    this.remember(key, answer, now());
    return answer;
  }

  /** Same adapter set as CloudRouterManager: one per router provider. */
  private get providers(): ReadonlyMap<RouterProvider, RouterInferenceProvider> {
    return new Map<RouterProvider, RouterInferenceProvider>([
      [this.gemini.provider, this.gemini],
      [this.ollamaCloud.provider, this.ollamaCloud],
      [this.legacyLocal.provider, this.legacyLocal],
    ]);
  }

  private async askSafely(request: TurnIntentRequest): Promise<TurnIntentAnswer | null> {
    try {
      return await this.ask(request);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`classify: turn intent failed - ${message} — keywords decide`);
      return null;
    }
  }

  private async ask(request: TurnIntentRequest): Promise<TurnIntentAnswer | null> {
    const snapshot = await this.configurations.findPublishedSnapshot();
    if (!snapshot?.enabled) {
      this.logger.debug('classify: no enabled router configuration — keywords decide');
      return null;
    }
    const providers = this.providers;
    const resolution = resolveChain(snapshot, new Set(providers.keys()));
    if (!isChainServiceable(snapshot, resolution)) {
      this.logger.debug('classify: no runnable router chain entry — keywords decide');
      return null;
    }

    const outcome = await this.coordinator.runValidated(providers, {
      traceId: randomUUID(),
      // Carried, never derived: the classifier is a paid router call and is
      // metered against the sender's wallet; no user = unmetered (owner decision).
      userId: request.userId,
      prompt: buildTurnIntentPrompt(request),
      chain: preferTurnIntentModels(resolution.runnable),
      totalDeadlineMs: Math.min(TURN_INTENT_DEADLINE_MS, snapshot.totalDeadlineMs),
      maxAttempts: snapshot.maxAttempts,
      minConfidence: TURN_INTENT_MIN_CONFIDENCE,
      validator: turnIntentValidator(),
    });
    if (!outcome.ok) {
      this.logger.warn(`classify: turn intent chain failed (${outcome.code}) — keywords decide`);
      return null;
    }
    this.logger.log(
      `classify: turn intent=${outcome.decision.intent} confidence=${String(outcome.decision.confidence)}`,
    );
    return outcome.decision;
  }

  /** A bounded Map: the oldest entry goes first once the cap is reached. */
  private remember(key: string, answer: TurnIntentAnswer | null, at: number): void {
    if (this.cache.size >= TURN_INTENT_CACHE_MAX_ENTRIES && !this.cache.has(key)) {
      const oldest = this.cache.keys().next();
      if (oldest.done !== true) this.cache.delete(oldest.value);
    }
    this.cache.set(key, { answer, expiresAt: at + TURN_INTENT_CACHE_TTL_MS });
  }
}
