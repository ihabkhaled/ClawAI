import { Injectable, Logger } from '@nestjs/common';

import {
  CREDIT_HEADROOM_CACHE_MAX_ENTRIES,
  CREDIT_HEADROOM_CACHE_TTL_MS,
  UNKNOWN_CREDIT_HEADROOM,
} from '../constants/credit-headroom.constants';
import { type ProviderCreditHeadroom } from '../types/credit-headroom.types';
import { getAdapter } from './adapters/adapter-factory';
import { type ConnectorConfig } from './provider-adapter.interface';
import { type ConnectorProvider } from '../../../generated/prisma';

/**
 * One connector's key balance, read through its adapter and reused for
 * CREDIT_HEADROOM_CACHE_TTL_MS.
 *
 * The cache holds the PROMISE, so a burst of chat turns on a cold cache makes
 * one provider call, not one each. A failed read resolves to unknown and is
 * cached too — retrying a down endpoint on every turn would add its timeout
 * to every turn.
 */
@Injectable()
export class CreditHeadroomManager {
  private readonly logger = new Logger(CreditHeadroomManager.name);
  private readonly cache = new Map<
    string,
    { reading: Promise<ProviderCreditHeadroom>; expiresAt: number }
  >();

  async read(
    connectorId: string,
    provider: ConnectorProvider,
    config: ConnectorConfig,
  ): Promise<ProviderCreditHeadroom> {
    const now = Date.now();
    const hit = this.cache.get(connectorId);
    if (hit !== undefined && hit.expiresAt > now) {
      return hit.reading;
    }
    const reading = this.fetch(provider, config);
    this.remember(connectorId, reading, now);
    return reading;
  }

  private async fetch(
    provider: ConnectorProvider,
    config: ConnectorConfig,
  ): Promise<ProviderCreditHeadroom> {
    const adapter = getAdapter(provider);
    if (adapter.getCreditHeadroom === undefined) {
      return UNKNOWN_CREDIT_HEADROOM;
    }
    try {
      return await adapter.getCreditHeadroom(config);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.name : 'unknown';
      this.logger.warn(`fetch: ${provider} credit headroom unreadable (${reason})`);
      return UNKNOWN_CREDIT_HEADROOM;
    }
  }

  private remember(
    connectorId: string,
    reading: Promise<ProviderCreditHeadroom>,
    now: number,
  ): void {
    if (this.cache.size >= CREDIT_HEADROOM_CACHE_MAX_ENTRIES && !this.cache.has(connectorId)) {
      const oldest = this.cache.keys().next();
      if (oldest.done !== true) {
        this.cache.delete(oldest.value);
      }
    }
    this.cache.set(connectorId, { reading, expiresAt: now + CREDIT_HEADROOM_CACHE_TTL_MS });
  }
}
