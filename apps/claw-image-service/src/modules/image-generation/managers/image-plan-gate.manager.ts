import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import {
  ENTITLEMENTS_ADAPTER,
  EntitlementsAdapter,
  EntitlementsRequestError,
  hasPlanFeature,
  type UserEntitlements,
} from '@claw/shared-entitlements';

import { BusinessException } from '../../../common/errors';
import {
  IMAGE_ENTITLEMENTS_UNAVAILABLE_CODE,
  IMAGE_ENTITLEMENTS_UNAVAILABLE_MESSAGE,
  IMAGE_ENTITLEMENTS_UNAVAILABLE_STATUS,
  IMAGE_GENERATION_PLAN_FEATURE,
  IMAGE_PLAN_FEATURE_DISABLED_CODE,
  IMAGE_PLAN_FEATURE_DISABLED_MESSAGE,
} from '../constants/image-plan-gate.constants';

/**
 * The plan gate for image generation and image edit (ADR-122).
 *
 * image-service is the service that EXECUTES the work, so it is the service
 * that refuses: chat-service's check is a courtesy that turns the refusal into
 * a clean in-chat notice, and a caller that skips chat (a retry, a direct
 * internal call) still meets this one. It runs before a row is written, before
 * any PAYG hold and before any provider is dialled.
 *
 * Fails CLOSED, the chat-service convention for plan features: when
 * auth-service cannot answer, nothing paid is unlocked. A stated refusal from
 * auth-service (PLAN_TRIAL_EXPIRED) keeps its own code and status. ADMIN
 * passes through `hasPlanFeature`.
 */
@Injectable()
export class ImagePlanGateManager {
  private readonly logger = new Logger(ImagePlanGateManager.name);

  constructor(@Inject(ENTITLEMENTS_ADAPTER) private readonly entitlements: EntitlementsAdapter) {}

  async assertCanGenerate(userId: string): Promise<void> {
    const ent = await this.resolve(userId);
    if (hasPlanFeature(ent, IMAGE_GENERATION_PLAN_FEATURE)) {
      return;
    }
    this.logger.warn(
      `assertCanGenerate: plan feature locked user=${userId} feature=${IMAGE_GENERATION_PLAN_FEATURE}`,
    );
    throw new BusinessException(
      IMAGE_PLAN_FEATURE_DISABLED_MESSAGE,
      IMAGE_PLAN_FEATURE_DISABLED_CODE,
      HttpStatus.FORBIDDEN,
    );
  }

  private async resolve(userId: string): Promise<UserEntitlements> {
    try {
      return await this.entitlements.getEntitlements(userId);
    } catch (error: unknown) {
      if (error instanceof EntitlementsRequestError) {
        throw new BusinessException(error.message, error.errorCode, error.status as HttpStatus);
      }
      this.logger.error(
        `assertCanGenerate: entitlements unavailable user=${userId} — ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BusinessException(
        IMAGE_ENTITLEMENTS_UNAVAILABLE_MESSAGE,
        IMAGE_ENTITLEMENTS_UNAVAILABLE_CODE,
        IMAGE_ENTITLEMENTS_UNAVAILABLE_STATUS,
      );
    }
  }
}
