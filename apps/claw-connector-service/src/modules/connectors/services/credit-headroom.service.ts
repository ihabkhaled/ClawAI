import { Injectable, Logger } from '@nestjs/common';

import { UNKNOWN_CREDIT_HEADROOM } from '../constants/credit-headroom.constants';
import { ConnectorsManager } from '../managers/connectors.manager';
import { CreditHeadroomManager } from '../managers/credit-headroom.manager';
import { ConnectorsRepository } from '../repositories/connectors.repository';
import { type ProviderCreditHeadroom } from '../types/credit-headroom.types';

/**
 * How much the executing connector's API key can still spend.
 *
 * chat-service asks before dialling a provider that pre-authorizes output
 * against the key (OpenRouter), so it can send a `max_tokens` the key can pay
 * for instead of receiving a 402. It is the OPERATOR's balance at the
 * provider, never a user's wallet.
 *
 * Fails OPEN to "unknown" on every path: the provider still enforces its own
 * limit, so an unreadable balance only costs the pre-flight cap. The same
 * connector row `getConnectorConfig` hands chat-service for execution is the
 * one read here, so the balance belongs to the key that will be used.
 */
@Injectable()
export class CreditHeadroomService {
  private readonly logger = new Logger(CreditHeadroomService.name);

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    private readonly connectorsManager: ConnectorsManager,
    private readonly creditHeadroomManager: CreditHeadroomManager,
  ) {}

  async getCreditHeadroom(provider: string): Promise<ProviderCreditHeadroom> {
    const connector = await this.connectorsRepository.findByProvider(provider);
    if (connector === null) {
      return UNKNOWN_CREDIT_HEADROOM;
    }
    try {
      const config = this.connectorsManager.getExecutionConfig(connector);
      return await this.creditHeadroomManager.read(connector.id, connector.provider, config);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.name : 'unknown';
      this.logger.warn(`getCreditHeadroom: ${provider} unreadable (${reason}) — no pre-flight cap`);
      return UNKNOWN_CREDIT_HEADROOM;
    }
  }
}
