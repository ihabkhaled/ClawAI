import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  ENTITLEMENTS_ADAPTER,
  type EntitlementsAdapter,
  hasPlanFeature,
} from '@claw/shared-entitlements';

import { ResearchErrorCode } from '../../../common/enums/research-error-code.enum';
import { BusinessException } from '../../../common/errors/business.exception';
import { RUNTIME_CRAWL_PLAN_FEATURE } from '../constants/runtime-crawl.constants';
import type { GuardedRuntimeRequest } from '../types/runtime-crawl.types';

/**
 * The plan's research unlock (`allowResearchMode`), asked BEFORE anything else
 * on every runtime-crawl route: before body validation, before the URL is
 * looked at, before a config row or a run row is read (rule 50 item 2).
 *
 * research-service deliberately does not enforce the plan on its other user
 * routes (see `ResearchInternalController`); these routes are reachable by
 * runtime clients holding only a user token, so they enforce it here. ADMIN
 * passes through `hasPlanFeature`. Fails CLOSED: an entitlements outage is a
 * 503, never a quiet unlock.
 */
@Injectable()
export class ResearchAccessGuard implements CanActivate {
  private readonly logger = new Logger(ResearchAccessGuard.name);

  constructor(@Inject(ENTITLEMENTS_ADAPTER) private readonly adapter: EntitlementsAdapter) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<GuardedRuntimeRequest>();
    const userId = request.user?.id ?? request.user?.sub;
    if (userId === undefined) {
      throw new BusinessException(
        'errors.auth.unauthorized',
        'UNAUTHORIZED',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const entitlements = await this.adapter
      .getEntitlements(userId, { enforceTrial: false })
      .catch((error: unknown) => {
        this.logger.warn(
          `research_access.unavailable user=${userId}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
        throw new BusinessException(
          'errors.permissions.unavailable',
          ResearchErrorCode.ENTITLEMENTS_UNAVAILABLE,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      });
    if (!hasPlanFeature(entitlements, RUNTIME_CRAWL_PLAN_FEATURE)) {
      this.logger.log(
        `research_access.denied user=${userId} feature=${RUNTIME_CRAWL_PLAN_FEATURE}`,
      );
      throw new BusinessException(
        'errors.plan.featureDisabled',
        ResearchErrorCode.PLAN_FEATURE_DISABLED,
        HttpStatus.FORBIDDEN,
        { feature: RUNTIME_CRAWL_PLAN_FEATURE },
      );
    }
    return true;
  }
}
