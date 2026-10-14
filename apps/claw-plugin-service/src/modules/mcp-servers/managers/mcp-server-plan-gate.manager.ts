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
  resolvePlanLimit,
  type UserEntitlements,
} from '@claw/shared-entitlements';

import { PluginErrorCode } from '../../../common/enums/plugin-error-code.enum';

/**
 * The plan side of registering a server: the allowPlugins gate and the maxUserMcpServers cap.
 * `null` is unlimited (and every ADMIN), `0` is disabled. Fails CLOSED when auth-service cannot
 * answer or returns a cap it cannot read, so an outage never grants servers.
 */
@Injectable()
export class McpServerPlanGateManager {
  private readonly logger = new Logger(McpServerPlanGateManager.name);

  constructor(@Inject(ENTITLEMENTS_ADAPTER) private readonly entitlements: EntitlementsAdapter) {}

  async resolveServerCap(userId: string): Promise<number | null> {
    const ent = await this.load(userId);
    if (!hasPlanFeature(ent, 'allowPlugins')) {
      throw new ForbiddenException({
        message: 'Plugins are not available on your plan',
        errorCode: PluginErrorCode.PLAN_DISABLED,
      });
    }
    const cap: unknown = resolvePlanLimit(ent, (limits) => limits.maxUserMcpServers);
    if (cap === null) return null;
    if (typeof cap === 'number' && Number.isInteger(cap) && cap >= 0) return cap;
    this.logger.warn('resolveServerCap: plan cap unreadable, failing closed');
    throw this.unavailable();
  }

  private async load(userId: string): Promise<UserEntitlements> {
    try {
      return await this.entitlements.getEntitlements(userId);
    } catch {
      this.logger.error('load: entitlements lookup failed, failing closed');
      throw this.unavailable();
    }
  }

  private unavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      message: 'Your plan could not be checked right now',
      errorCode: PluginErrorCode.ENTITLEMENTS_UNAVAILABLE,
    });
  }
}
