import { Injectable, Logger } from '@nestjs/common';
import { EntitlementsAdapter, type UserEntitlements } from '@claw/shared-entitlements';
import { AppConfig } from '../../../app/config/app.config';
import { toEntitlementsException } from '../../../common/utilities/entitlements-error.utility';

@Injectable()
export class DailyLimitService {
  private readonly logger = new Logger(DailyLimitService.name);
  private readonly adapter = new EntitlementsAdapter({
    authServiceUrl: AppConfig.get().AUTH_SERVICE_URL,
  });

  async resolve(userId: string): Promise<UserEntitlements> {
    try {
      return await this.adapter.getEntitlements(userId);
    } catch (error: unknown) {
      this.logger.error(`Daily-limit entitlement lookup failed for user=${userId}`);
      throw toEntitlementsException(error);
    }
  }
}
