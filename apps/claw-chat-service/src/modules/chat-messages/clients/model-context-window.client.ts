import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader } from '../../../common/utilities';
import {
  MODEL_CONTEXT_WINDOW_CACHE_MAX_ENTRIES,
  MODEL_CONTEXT_WINDOW_CACHE_TTL_MS,
  MODEL_CONTEXT_WINDOW_PATH_PREFIX,
  MODEL_CONTEXT_WINDOW_TIMEOUT_MS,
} from '../constants/model-context-window.constants';

const contextWindowResponseSchema = z.object({
  provider: z.string(),
  modelKey: z.string(),
  contextWindowTokens: z.number().int().positive().nullable(),
  maxOutputTokens: z.number().int().positive().nullable(),
  known: z.boolean(),
});

/**
 * The selected model's real context window, read from routing-service.
 *
 * routing-service owns the model catalog; chat-service must not keep a second
 * copy of it, and before this client existed it kept none at all — it budgeted
 * every prompt from the thread's `maxTokens`, an OUTPUT length whose default is
 * 4096. A 256k-window model therefore received about 16k characters of
 * everything combined. ADR-086.
 *
 * FAILS OPEN, deliberately, and this is the opposite of ModelRateClient's
 * choice next door. An unknown price must refuse the request, because
 * proceeding unpriced spends real money. An unknown context window must NOT
 * refuse it: the caller falls back to a conservative window and sends less
 * history, which degrades an answer rather than denying one. Refusing to talk
 * because the catalog is unenriched would be a far worse failure than a shorter
 * prompt.
 */
@Injectable()
export class ModelContextWindowClient {
  private readonly logger = new Logger(ModelContextWindowClient.name);
  // Static so every collaborator holding its own instance shares one answer,
  // matching ModelExposureClient. A model's window does not vary by caller.
  private static readonly cache = new Map<string, { tokens: number | null; expiresAt: number }>();

  /** Drops every cached window. Called after a catalog sync or re-enrichment. */
  static invalidateAll(): void {
    ModelContextWindowClient.cache.clear();
  }

  async findContextWindowTokens(provider: string, model: string): Promise<number | null> {
    const key = `${provider}/${model}`;
    const now = Date.now();
    const hit = ModelContextWindowClient.cache.get(key);
    if (hit !== undefined && hit.expiresAt > now) {
      return hit.tokens;
    }
    const tokens = await this.fetch(provider, model);
    this.remember(key, tokens, now);
    return tokens;
  }

  private async fetch(provider: string, model: string): Promise<number | null> {
    try {
      // Inside the try on purpose. AppConfig.get() throws on a misconfigured
      // environment, and a client documented to fail open must not be the thing
      // that takes a turn down — reading configuration is part of "the lookup
      // failed", not an exception to it.
      const url = `${AppConfig.get().ROUTING_SERVICE_URL}${MODEL_CONTEXT_WINDOW_PATH_PREFIX}/${encodeURIComponent(provider)}/${encodeURIComponent(model)}`;
      const response = await httpRequest<unknown>({
        url,
        method: HttpMethod.GET,
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: MODEL_CONTEXT_WINDOW_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(
          `findContextWindowTokens: routing-service status=${String(response.status)} for ${provider}/${model} — falling back to a conservative window`,
        );
        return null;
      }
      const parsed = contextWindowResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        this.logger.warn(
          `findContextWindowTokens: response failed schema check for ${provider}/${model}`,
        );
        return null;
      }
      if (!parsed.data.known) {
        this.logger.warn(
          `findContextWindowTokens: no catalog row for ${provider}/${model} — the model is executable but unenriched`,
        );
        return null;
      }
      return parsed.data.contextWindowTokens;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`findContextWindowTokens: ${provider}/${model} failed — ${message}`);
      return null;
    }
  }

  private remember(key: string, tokens: number | null, now: number): void {
    if (ModelContextWindowClient.cache.size >= MODEL_CONTEXT_WINDOW_CACHE_MAX_ENTRIES) {
      const oldest = ModelContextWindowClient.cache.keys().next();
      if (oldest.done !== true) {
        ModelContextWindowClient.cache.delete(oldest.value);
      }
    }
    ModelContextWindowClient.cache.set(key, {
      tokens,
      expiresAt: now + MODEL_CONTEXT_WINDOW_CACHE_TTL_MS,
    });
  }
}
