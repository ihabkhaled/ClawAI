import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ENTITLEMENTS_ADAPTER,
  EntitlementsAdapter,
  hasPlanFeature,
} from '@claw/shared-entitlements';

import { InvokeErrorCode } from '../../../common/enums/invoke-error-code.enum';

/**
 * The plan gate for calling a tool: `allowPlugins` must be on. The per-day call cap is a separate
 * thing, held with auth-service (PLUGIN_CALLS). Fails CLOSED when auth-service cannot answer.
 */
@Injectable()
export class RuntimePlanGateManager {
  private readonly logger = new Logger(RuntimePlanGateManager.name);

  constructor(@Inject(ENTITLEMENTS_ADAPTER) private readonly entitlements: EntitlementsAdapter) {}

  async assertAllowed(userId: string): Promise<void> {
    let allowed: boolean;
    try {
      allowed = hasPlanFeature(await this.entitlements.getEntitlements(userId), 'allowPlugins');
    } catch {
      this.logger.error('assertAllowed: entitlements lookup failed, failing closed');
      throw new ServiceUnavailableException({
        message: 'Your plan could not be checked right now',
        errorCode: InvokeErrorCode.QUOTA_UNAVAILABLE,
      });
    }
    if (!allowed) {
      throw new ForbiddenException({
        message: 'Plugins are not available on your plan',
        errorCode: InvokeErrorCode.PLAN_DISABLED,
      });
    }
  }
}
