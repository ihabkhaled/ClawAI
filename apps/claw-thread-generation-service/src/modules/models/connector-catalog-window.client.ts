import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';
import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../app/config/app.config';
import {
  CONNECTOR_CATALOG_PATH,
  CONNECTOR_CATALOG_RETRY_AFTER_FAILURE_MS,
  CONNECTOR_CATALOG_TIMEOUT_MS,
  MODEL_WINDOW_CACHE_TTL_MS,
} from './constants/model-context.constants';
import { connectorCatalogSchema } from './schemas/connector-catalog.schema';
import type { ConnectorWindowIndex } from './types/model-context.types';

/**
 * The context window the model picker shows, read from the picker's own source.
 *
 * connector-service's public catalog is built with the query that fills the in-app picker
 * (exposed, active, chat models), so a window a user sees there is the window used here.
 * It is the first source because it knows providers the router registry has no rows for
 * (GROQ, OPENROUTER, NVIDIANIM, ...). It FAILS OPEN: any failure answers `undefined` and the
 * caller moves on to the router, so an unreachable connector-service never blocks a job.
 */
@Injectable()
export class ConnectorCatalogWindowClient {
  private index: ConnectorWindowIndex | undefined;
  private retryNotBefore = 0;
  private inFlight: Promise<ReadonlyMap<string, number>> | undefined;

  /** The catalog's stated window, or `undefined` when it states none or cannot be read. */
  async findWindow(provider: string, model: string): Promise<number | undefined> {
    const windows = await this.windows();
    return windows.get(windowKey(provider, model));
  }

  private async windows(): Promise<ReadonlyMap<string, number>> {
    const now = Date.now();
    if (this.index !== undefined && this.index.expiresAt > now) return this.index.windows;
    if (this.retryNotBefore > now) return EMPTY_WINDOWS;
    // One in-flight read serves every role that asks while it is pending.
    this.inFlight ??= this.load().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async load(): Promise<ReadonlyMap<string, number>> {
    try {
      const config = AppConfig.get();
      const url = `${config.CONNECTOR_SERVICE_URL}${CONNECTOR_CATALOG_PATH}`;
      assertSafeRequestUrl(url, declaredHost(config.CONNECTOR_SERVICE_URL));
      const response = await fetch(url, {
        redirect: 'error',
        headers: { Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}` },
        signal: AbortSignal.timeout(CONNECTOR_CATALOG_TIMEOUT_MS),
      });
      const parsed = response.ok
        ? connectorCatalogSchema.safeParse(await response.json().catch(() => null))
        : undefined;
      if (parsed?.success !== true) return this.failed();
      const windows = new Map<string, number>();
      for (const provider of parsed.data.providers) {
        for (const model of provider.models) {
          if (model.maxContextTokens !== null) {
            windows.set(windowKey(provider.provider, model.modelKey), model.maxContextTokens);
          }
        }
      }
      this.index = { windows, expiresAt: Date.now() + MODEL_WINDOW_CACHE_TTL_MS };
      return windows;
    } catch {
      return this.failed();
    }
  }

  private failed(): ReadonlyMap<string, number> {
    this.retryNotBefore = Date.now() + CONNECTOR_CATALOG_RETRY_AFTER_FAILURE_MS;
    return EMPTY_WINDOWS;
  }
}

const EMPTY_WINDOWS: ReadonlyMap<string, number> = new Map();

function windowKey(provider: string, model: string): string {
  return `${provider.toUpperCase()}/${model}`;
}
