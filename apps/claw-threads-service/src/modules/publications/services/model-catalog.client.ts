import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import {
  MODEL_CATALOG_CACHE_TTL_MS,
  MODEL_CATALOG_LOOKUP_TIMEOUT_MS,
  MODEL_CATALOG_PATH,
} from '../constants/generation-preflight.constants';
import type { ModelRef } from '../types/generation-preflight.types';
import type { CatalogIndex, CatalogModel } from '../types/recommended-team.types';

const catalogSchema = z.object({
  providers: z.array(
    z.object({
      provider: z.string(),
      models: z.array(
        z.object({
          modelKey: z.string(),
          maxContextTokens: z.number().int().positive().nullish(),
          usageTier: z.string().nullish(),
        }),
      ),
    }),
  ),
});

/** Gemini decorates its ids as `models/<id>`; the prefix names no different model. */
function bareModelId(model: string): string {
  return model.replace(/^models\//u, '');
}

function catalogKey(provider: string, model: string): string {
  return `${provider.toUpperCase()}/${bareModelId(model)}`;
}

/**
 * Answers whether a provider/model is one the model picker offers, by exact match against
 * connector-service's public catalog (the picker's own query: connector enabled, model active,
 * exposed, chat). It is NOT the routing context-window lookup: that one answers "known" for any
 * name that fits a family pattern such as `gemini-*`, so `gemini-nope-9` passed. The catalog is
 * read once per `MODEL_CATALOG_CACHE_TTL_MS` and shared by concurrent callers; it never calls a
 * model. Unreadable catalog -> 503 (fail closed). `listModels` serves the recommended team from
 * the same cached read.
 */
@Injectable()
export class ModelCatalogClient {
  private index: (CatalogIndex & { expiresAt: number }) | undefined;
  private inFlight: Promise<CatalogIndex> | undefined;

  async isKnown({ provider, model }: ModelRef): Promise<boolean> {
    return (await this.read()).keys.has(catalogKey(provider, model));
  }

  /** Every model the picker offers, with the window and cost band the catalog publishes. */
  async listModels(): Promise<readonly CatalogModel[]> {
    return (await this.read()).models;
  }

  private read(): Promise<CatalogIndex> {
    if (this.index && this.index.expiresAt > Date.now()) return Promise.resolve(this.index);
    this.inFlight ??= this.load().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async load(): Promise<CatalogIndex> {
    const config = AppConfig.get();
    const url = `${config.CONNECTOR_SERVICE_URL}${MODEL_CATALOG_PATH}`;
    assertSafeRequestUrl(url, declaredHost(config.CONNECTOR_SERVICE_URL));
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'error',
        headers: { Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}` },
        signal: AbortSignal.timeout(MODEL_CATALOG_LOOKUP_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException('Model catalog is unavailable');
    }
    if (!response.ok) throw new ServiceUnavailableException('Model catalog is unavailable');
    const parsed = catalogSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new ServiceUnavailableException('Model catalog response is invalid');
    const keys = new Set<string>();
    const models: CatalogModel[] = [];
    for (const { provider, models: entries } of parsed.data.providers) {
      for (const { modelKey, maxContextTokens, usageTier } of entries) {
        keys.add(catalogKey(provider, modelKey));
        models.push({
          provider: provider.toUpperCase(),
          model: bareModelId(modelKey),
          windowTokens: maxContextTokens ?? null,
          usageTier: usageTier ?? null,
        });
      }
    }
    const index: CatalogIndex = { keys, models };
    this.index = { ...index, expiresAt: Date.now() + MODEL_CATALOG_CACHE_TTL_MS };
    return index;
  }
}
