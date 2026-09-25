import { Injectable, Logger } from '@nestjs/common';

import { ProviderCircuitBreakerManager } from '../managers/provider-circuit-breaker.manager';
import {
  type ClearProviderBreakerResponse,
  type SkippedProvidersResponse,
} from '../types/provider-circuit-breaker.types';

/**
 * Admin view of the account-exhaustion breaker (ADR-125 addendum): which
 * providers AUTO is skipping right now, and a manual clear for when the
 * operator has topped the account up and does not want to wait out the
 * window. RBAC is on the controller (ADMIN only).
 */
@Injectable()
export class ProviderBreakerAdminService {
  private readonly logger = new Logger(ProviderBreakerAdminService.name);

  constructor(private readonly breaker: ProviderCircuitBreakerManager) {}

  async listSkipped(): Promise<SkippedProvidersResponse> {
    return this.breaker.list();
  }

  async clear(provider: string, adminUserId: string): Promise<ClearProviderBreakerResponse> {
    const result = await this.breaker.clear(provider);
    this.logger.log(
      `clear: admin ${adminUserId} cleared the ${provider} breaker (was open: ${String(result.cleared)})`,
    );
    return result;
  }
}
