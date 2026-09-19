import { HttpStatus, Injectable } from '@nestjs/common';
import { EntitlementsAdapter, type UserEntitlements } from '@claw/shared-entitlements';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors/business.exception';

@Injectable()
export class WorkspaceEntitlementService {
  private readonly adapter = new EntitlementsAdapter({
    authServiceUrl: AppConfig.get().AUTH_SERVICE_URL,
    serviceToken: AppConfig.get().INTER_SERVICE_AUTH_TOKEN,
  });

  async resolve(userId: string): Promise<UserEntitlements> {
    try {
      // Feature gates, not AI spend: an expired trial falls back to its plan,
      // whose own workspace gate then decides.
      return await this.adapter.getEntitlements(userId, { enforceTrial: false });
    } catch {
      throw new BusinessException(
        'Entitlements are temporarily unavailable',
        'ENTITLEMENTS_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
