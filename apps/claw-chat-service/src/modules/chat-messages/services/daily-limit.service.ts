import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EntitlementsAdapter, type UserEntitlements } from '@claw/shared-entitlements';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';

@Injectable()
export class DailyLimitService {
  private readonly logger = new Logger(DailyLimitService.name);
  private readonly adapter = new EntitlementsAdapter({
    authServiceUrl: AppConfig.get().AUTH_SERVICE_URL,
  });

  async resolve(userId: string): Promise<UserEntitlements> {
    try {
      return await this.adapter.getEntitlements(userId);
    } catch {
      this.logger.error(`Daily-limit entitlement lookup failed for user=${userId}`);
      throw new BusinessException(
        'Entitlements are temporarily unavailable',
        'ENTITLEMENTS_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
