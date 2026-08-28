import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  describeEntitlementsFailure,
  EntitlementsAdapter,
  type UserEntitlements,
} from '@claw/shared-entitlements';
import { AppConfig } from '../../app/config/app.config';
import { ENTITLEMENTS_TIMEOUT_MS } from '../constants';
import { BusinessException } from '../errors';

@Injectable()
export class ResourceEntitlementService {
  private readonly logger = new Logger(ResourceEntitlementService.name);
  private readonly timeoutMs = ENTITLEMENTS_TIMEOUT_MS;
  private readonly adapter = new EntitlementsAdapter({
    authServiceUrl: AppConfig.get().AUTH_SERVICE_URL,
    timeoutMs: ENTITLEMENTS_TIMEOUT_MS,
  });

  async resolve(userId: string): Promise<UserEntitlements> {
    try {
      return await this.adapter.getEntitlements(userId);
    } catch (error: unknown) {
      // The reason used to be discarded here, which made an intermittent 503
      // impossible to tell apart from a timeout, a refused connection or a 500
      // upstream. Never swallow this again.
      this.logger.error(
        `resolve: entitlements unavailable for user=${userId} — ${describeEntitlementsFailure(
          error,
          this.timeoutMs,
        )}`,
      );
      throw new BusinessException(
        'Entitlements are temporarily unavailable',
        'ENTITLEMENTS_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
