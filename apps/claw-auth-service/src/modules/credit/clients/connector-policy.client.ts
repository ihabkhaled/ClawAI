import { Injectable, Logger } from '@nestjs/common';
import {
  PAYG_DEFAULT_PROVIDERS,
  PAYG_POLICY_CACHE_PREFIX,
  PAYG_POLICY_CACHE_TTL_SECONDS,
} from '@claw/shared-constants';
import { HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader } from '../../../common/utilities';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import {
  CONNECTOR_PAYG_POLICY_PATH,
  CONNECTOR_PAYG_POLICY_TIMEOUT_MS,
} from '../constants/credit.constants';
import { connectorPaygPolicyResponseSchema } from '../schemas/connector-policy-response.schema';

/**
 * Which providers cost real money, according to the administrator.
 *
 * `Connector.isPayAsYouGo` is the runtime authority and is admin-editable, so
 * this decision cannot live in `@claw/shared-constants` — a predicate compiled
 * into six copies of a shared package changes only on a six-container rebuild,
 * which would make the admin toggle unenforceable (ADR-082).
 *
 * Cached for one minute so a toggle takes effect quickly without putting an
 * HTTP hop in front of every chat message.
 *
 * On an outage this falls back to `PAYG_DEFAULT_PROVIDERS` rather than to "no
 * provider is metered". The fallback is the same default the connector
 * migration applied, and it errs toward METERING a known paid cloud provider —
 * an outage must not become a window of free frontier-model inference. It is
 * still not a licence to bill: the rate lookup fails closed separately, so an
 * unreachable routing-service refuses the request outright.
 */
@Injectable()
export class ConnectorPolicyClient {
  private readonly logger = new Logger(ConnectorPolicyClient.name);

  constructor(private readonly redis: RedisService) {}

  async getPolicy(): Promise<Record<string, boolean>> {
    this.logger.debug('getPolicy: resolving provider PAYG policy');
    const cached = await this.readCache();
    if (cached !== null) {
      return cached;
    }
    const fetched = await this.fetchPolicy();
    if (fetched === null) {
      this.logger.warn('getPolicy: connector unreachable — falling back to the seeded defaults');
      return ConnectorPolicyClient.defaultPolicy();
    }
    await this.writeCache(fetched);
    return fetched;
  }

  /**
   * What a provider defaults to when connector-service has no row for it.
   *
   * Exposed so the classifier can distinguish "explicitly not metered" from
   * "nobody has classified this yet" without re-deriving the list.
   */
  static defaultForProvider(provider: string): boolean {
    const normalized = provider.trim().toUpperCase();
    return PAYG_DEFAULT_PROVIDERS.some((known) => known.toUpperCase() === normalized);
  }

  private static defaultPolicy(): Record<string, boolean> {
    return Object.fromEntries(PAYG_DEFAULT_PROVIDERS.map((provider) => [provider, true]));
  }

  private static cacheKey(): string {
    return `${PAYG_POLICY_CACHE_PREFIX}providers`;
  }

  private async fetchPolicy(): Promise<Record<string, boolean> | null> {
    const url = `${AppConfig.get().CONNECTOR_SERVICE_URL}${CONNECTOR_PAYG_POLICY_PATH}`;
    try {
      const response = await httpRequest<unknown>({
        url,
        method: HttpMethod.GET,
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: CONNECTOR_PAYG_POLICY_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.error(`fetchPolicy: connector status=${String(response.status)}`);
        return null;
      }
      const parsed = connectorPaygPolicyResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        this.logger.error('fetchPolicy: connector response failed schema check');
        return null;
      }
      return parsed.data.providers;
    } catch (error) {
      this.logger.error(`fetchPolicy: connector unreachable — ${(error as Error).message}`);
      return null;
    }
  }

  private async readCache(): Promise<Record<string, boolean> | null> {
    try {
      const raw = await this.redis.get(ConnectorPolicyClient.cacheKey());
      if (raw === null) {
        return null;
      }
      const parsed = connectorPaygPolicyResponseSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data.providers : null;
    } catch (error) {
      this.logger.warn(`readCache: unusable cache entry — ${(error as Error).message}`);
      return null;
    }
  }

  private async writeCache(providers: Record<string, boolean>): Promise<void> {
    try {
      await this.redis.set(
        ConnectorPolicyClient.cacheKey(),
        JSON.stringify({ providers }),
        PAYG_POLICY_CACHE_TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn(`writeCache: could not cache policy — ${(error as Error).message}`);
    }
  }
}
