import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  EntitlementsAdapter,
  isModelAllowedForUsage,
  ModelUsageType,
  type UserEntitlements,
} from '@claw/shared-entitlements';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import { type SendMessageAccessOptions } from '../types/access-control.types';

// Backend enforcement of plan model-access + daily token quota at the chat
// entry point. Fail-OPEN on entitlement-service errors so an auth outage never
// takes chat down — the auth-service itself is the hard source of truth and
// blocks anything truly forbidden once reachable.
@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);
  private readonly adapter: EntitlementsAdapter;

  constructor() {
    this.adapter = new EntitlementsAdapter({ authServiceUrl: AppConfig.get().AUTH_SERVICE_URL });
  }

  // Throws 403 if a manually-selected model is not in the user's plan, or 429
  // if the daily quota is exhausted. ADMIN / unlimited / unrestricted pass.
  async assertCanSendMessage(userId: string, opts: SendMessageAccessOptions = {}): Promise<void> {
    const ent = await this.resolve(userId);
    if (!ent) {
      return; // fail-open
    }
    if (opts.provider && opts.model) {
      const allowed = isModelAllowedForUsage(
        ent,
        opts.provider,
        opts.model,
        ModelUsageType.PRIMARY,
      );
      if (!allowed) {
        this.logger.warn(
          `assertCanSendMessage: forbidden model user=${userId} ${opts.provider}/${opts.model}`,
        );
        throw new BusinessException(
          'The selected model is not available on your plan',
          'MODEL_NOT_ALLOWED_FOR_PLAN',
          HttpStatus.FORBIDDEN,
        );
      }
    }
    if (!ent.quota.unlimited && ent.quota.remaining <= 0) {
      this.logger.warn(`assertCanSendMessage: quota exceeded user=${userId}`);
      throw new BusinessException(
        'Daily token quota exceeded',
        'quota.dailyLimitExceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // Records actual token usage to the durable ledger after a completed message.
  // Fail-soft: a recording error must never break the user's response.
  async recordUsage(params: {
    userId: string;
    planId: string | null;
    inputTokens: number;
    outputTokens: number;
    provider: string;
    model: string;
  }): Promise<void> {
    try {
      await this.adapter.finalizeQuota({
        userId: params.userId,
        planId: params.planId,
        estimatedTokens: 0,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        provider: params.provider,
        model: params.model,
      });
    } catch (error) {
      this.logger.warn(
        `recordUsage: failed for user=${params.userId} — ${(error as Error).message}`,
      );
    }
  }

  private async resolve(userId: string): Promise<UserEntitlements | null> {
    try {
      return await this.adapter.getEntitlements(userId);
    } catch (error) {
      this.logger.warn(
        `resolve: entitlements unavailable for user=${userId} — failing open: ${(error as Error).message}`,
      );
      return null;
    }
  }
}
