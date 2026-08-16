import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import {
  CONNECTOR_CONFIG_PATH,
  CONNECTOR_CONFIG_TIMEOUT_MS,
  CREDENTIAL_CACHE_TTL_MS,
} from '../constants/router-adapter.constants';
import type { CachedCredential, ConnectorCredential } from '../types/router-adapter.types';

/**
 * Resolves provider credentials from connector-service.
 *
 * Credentials never live in routing-service's own tables — the router config
 * stores a connector reference and nothing else. They are cached briefly
 * because a six-entry chain would otherwise make six identical lookups per
 * request, but the TTL is short enough that a rotated key takes effect quickly.
 *
 * Nothing here is logged: the response carries a plaintext API key.
 */
@Injectable()
export class ConnectorCredentialService {
  private readonly logger = new Logger(ConnectorCredentialService.name);
  private readonly cache = new Map<string, CachedCredential>();

  async resolve(
    provider: string,
    now: () => number = Date.now,
  ): Promise<ConnectorCredential | null> {
    const key = provider.toUpperCase();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now()) {
      this.logger.debug(`resolve: cache hit provider=${key}`);
      return cached.credential;
    }

    const config = AppConfig.get();
    const url = `${config.CONNECTOR_SERVICE_URL}${CONNECTOR_CONFIG_PATH}?provider=${encodeURIComponent(key)}`;

    try {
      const response = await httpRequest<ConnectorCredential>({
        url,
        method: 'GET',
        timeoutMs: CONNECTOR_CONFIG_TIMEOUT_MS,
      });

      if (!response.ok || !response.data.apiKey) {
        this.logger.warn(
          `resolve: no usable credential for provider=${key} status=${String(response.status)}`,
        );
        return null;
      }

      this.cache.set(key, {
        credential: response.data,
        expiresAt: now() + CREDENTIAL_CACHE_TTL_MS,
      });
      this.logger.debug(`resolve: cached credential provider=${key}`);
      return response.data;
    } catch (error: unknown) {
      // The message may embed the request URL, which carries no secret, but the
      // error is still summarised rather than forwarded.
      const message = error instanceof Error ? error.name : 'unknown';
      this.logger.warn(`resolve: credential lookup failed provider=${key} error=${message}`);
      return null;
    }
  }

  /** Drops cached credentials so a rotation takes effect immediately. */
  invalidate(provider?: string): void {
    if (provider) {
      this.cache.delete(provider.toUpperCase());
      return;
    }
    this.cache.clear();
  }
}
