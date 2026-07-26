import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../app/config/app.config';
import { BillingException } from '../../common/errors';
import {
  PLAN_CATALOG_CACHE_TTL_MS,
  PLAN_CATALOG_PATHS,
  PLAN_CATALOG_TIMEOUT_MS,
  PLAN_PRICE_VERSION_CACHE_TTL_MS,
} from './constants/plan-catalog.constants';
import {
  planCatalogResponseSchema,
  planPriceVersionResponseSchema,
} from './schemas/plan-catalog.schema';
import { type PlanCatalogEntry, type PlanPriceVersionView } from './types/plan-catalog.types';
import { RedisService } from '../../infrastructure/redis/redis.service';

// The ONLY place this service learns what a plan costs.
//
// Prices live in auth-service as immutable, versioned rows. Payment stores the
// version *id* on the checkout session and never copies the amount into its own
// catalog — that is what makes a repricing incapable of rewriting what an
// existing subscriber agreed to pay.
//
// Every response is Zod-validated before it is allowed to become a charge. A
// price that does not parse as a non-negative integer is refused outright: no
// charge is far better than a wrong charge.
@Injectable()
export class PlanCatalogClient {
  private readonly logger = new Logger(PlanCatalogClient.name);

  constructor(private readonly redis: RedisService) {}

  async listCatalog(): Promise<PlanCatalogEntry[]> {
    this.logger.debug('listCatalog');
    const cacheKey = 'billing:plan-catalog';
    const cached = await this.readCache(cacheKey);
    if (cached !== null) {
      const parsed = planCatalogResponseSchema.safeParse(cached);
      if (parsed.success) {
        return parsed.data;
      }
      this.logger.warn('listCatalog: cached catalog failed validation — refetching');
    }

    const body = await this.fetch(PLAN_CATALOG_PATHS.CATALOG);
    const parsed = planCatalogResponseSchema.safeParse(body);
    if (!parsed.success) {
      this.logger.error('listCatalog: catalog response failed schema validation');
      throw new BillingException(BillingErrorCode.PLAN_CATALOG_UNAVAILABLE);
    }
    await this.writeCache(cacheKey, parsed.data, PLAN_CATALOG_CACHE_TTL_MS);
    return parsed.data;
  }

  /**
   * Resolves the active price for a plan and interval.
   *
   * Throws rather than returning null when the plan has no such price: reaching
   * checkout for an interval we do not sell is a caller bug, and continuing
   * would mean choosing an amount ourselves.
   */
  async requireActivePrice(planId: string, billingInterval: string): Promise<PlanPriceVersionView> {
    this.logger.debug(`requireActivePrice: plan=${planId} interval=${billingInterval}`);
    const query = new URLSearchParams({ planId, billingInterval }).toString();
    const body = await this.fetch(`${PLAN_CATALOG_PATHS.PRICE}?${query}`);
    const parsed = planPriceVersionResponseSchema.safeParse(body);
    if (!parsed.success || parsed.data === null) {
      this.logger.error(`requireActivePrice: no valid price plan=${planId}`);
      throw new BillingException(BillingErrorCode.PLAN_PRICE_NOT_FOUND);
    }
    return parsed.data;
  }

  /**
   * Resolves a specific price version, active or retired.
   *
   * Cached aggressively because the row is immutable — proration and invoice
   * reproduction read versions that were retired long ago.
   */
  async requirePriceVersion(id: string): Promise<PlanPriceVersionView> {
    this.logger.debug(`requirePriceVersion: ${id}`);
    const cacheKey = `billing:price-version:${id}`;
    const cached = await this.readCache(cacheKey);
    const fromCache = planPriceVersionResponseSchema.safeParse(cached);
    if (fromCache.success && fromCache.data !== null) {
      return fromCache.data;
    }

    const body = await this.fetch(`${PLAN_CATALOG_PATHS.PRICE_VERSION}/${id}`);
    const parsed = planPriceVersionResponseSchema.safeParse(body);
    if (!parsed.success || parsed.data === null) {
      this.logger.error(`requirePriceVersion: not found or invalid id=${id}`);
      throw new BillingException(BillingErrorCode.PLAN_PRICE_NOT_FOUND);
    }
    await this.writeCache(cacheKey, parsed.data, PLAN_PRICE_VERSION_CACHE_TTL_MS);
    return parsed.data;
  }

  private async fetch(path: string): Promise<unknown> {
    const config = AppConfig.get();
    try {
      const response = await httpRequest<unknown>({
        url: `${config.AUTH_SERVICE_URL}${path}`,
        method: HttpMethod.GET,
        headers: { Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}` },
        timeoutMs: PLAN_CATALOG_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.error(`fetch: auth-service returned status=${String(response.status)}`);
        throw new BillingException(BillingErrorCode.PLAN_CATALOG_UNAVAILABLE);
      }
      return response.data;
    } catch (error: unknown) {
      if (error instanceof BillingException) {
        throw error;
      }
      // The message is logged, never the response body — it could carry
      // internal detail we have no business persisting in a log.
      this.logger.error(
        `fetch: plan catalog request failed — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw new BillingException(BillingErrorCode.PLAN_CATALOG_UNAVAILABLE);
    }
  }

  private async readCache(key: string): Promise<unknown> {
    try {
      const raw = await this.redis.get(key);
      return raw === null ? null : (JSON.parse(raw) as unknown);
    } catch (error: unknown) {
      // A cache miss must never fail a checkout. Fall through to the source.
      this.logger.warn(
        `readCache: ${key} unreadable — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  private async writeCache(key: string, value: unknown, ttlMs: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), Math.floor(ttlMs / 1000));
    } catch (error: unknown) {
      this.logger.warn(
        `writeCache: ${key} failed — ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
