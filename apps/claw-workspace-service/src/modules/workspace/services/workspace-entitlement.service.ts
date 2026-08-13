import { HttpStatus, Injectable } from '@nestjs/common';
import { EntitlementsAdapter, type UserEntitlements } from '@claw/shared-entitlements';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors/business.exception';

@Injectable()
export class WorkspaceEntitlementService {
  private readonly adapter = new EntitlementsAdapter({
    authServiceUrl: AppConfig.get().AUTH_SERVICE_URL,
  });

  async resolve(userId: string): Promise<UserEntitlements> {
    try {
      return await this.adapter.getEntitlements(userId);
    } catch {
      throw new BusinessException(
        'Entitlements are temporarily unavailable',
        'ENTITLEMENTS_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
