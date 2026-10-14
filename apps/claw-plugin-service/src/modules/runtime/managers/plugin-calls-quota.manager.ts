import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { InvokeErrorCode } from '../../../common/enums/invoke-error-code.enum';
import { QuotaSettlement } from '../../../common/enums/quota-settlement.enum';
import {
  QUOTA_FEATURE,
  QUOTA_REQUEST_PREFIX,
  QUOTA_RESERVE_PATH,
  QUOTA_SETTLE_PATH,
  QUOTA_TIMEOUT_MS,
} from '../constants/runtime.constants';
import { reservationSchema } from '../schemas/quota.schema';
import { type QuotaDecision } from '../types/invoke.types';

/**
 * Holds one PLUGIN_CALLS run with auth-service before a tool runs and settles it after: CONSUME
 * when the tool delivered a result, RELEASE when it failed, so a broken tool never costs a call.
 * The request id is the call id, so a retry of the same call reuses its hold instead of taking a
 * second one. If auth-service cannot answer, the call does NOT run: no answer is never "allowed".
 * The shared EntitlementsAdapter only names FILE_GENERATION as a reservable feature, so this
 * manager talks to the same internal routes directly.
 */
@Injectable()
export class PluginCallsQuotaManager {
  private readonly logger = new Logger(PluginCallsQuotaManager.name);

  async reserve(userId: string, callId: string): Promise<QuotaDecision> {
    const payload = await this.post(QUOTA_RESERVE_PATH, {
      userId,
      feature: QUOTA_FEATURE,
      requestId: `${QUOTA_REQUEST_PREFIX}${callId}`,
    });
    const parsed = reservationSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.error('reserve: auth-service answered with an unreadable decision');
      throw this.unavailable();
    }
    if (parsed.data.allowed) {
      return { allowed: true, reservationId: parsed.data.reservationId };
    }
    const { reason, used, limit, window } = parsed.data;
    return {
      allowed: false,
      errorCode:
        reason === 'FEATURE_DISABLED'
          ? InvokeErrorCode.CALLS_DISABLED
          : InvokeErrorCode.CALLS_EXHAUSTED,
      detail: { used, limit, window },
    };
  }

  /** Never throws: a failed settle is logged for reconciliation, it must not turn a delivered result into an error. */
  async settle(reservationId: string, outcome: QuotaSettlement): Promise<void> {
    try {
      await this.post(QUOTA_SETTLE_PATH, { reservationId, outcome });
    } catch {
      this.logger.error(`settle: could not ${outcome} reservation ${reservationId}`);
    }
  }

  private async post(path: string, body: Record<string, string>): Promise<unknown> {
    const config = AppConfig.get();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, QUOTA_TIMEOUT_MS);
    try {
      const url = assertSafeRequestUrl(
        `${config.AUTH_SERVICE_URL}${path}`,
        declaredHost(config.AUTH_SERVICE_URL),
      );
      const response = await fetch(url.href, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        this.logger.error(`post: auth-service answered ${String(response.status)} for ${path}`);
        throw this.unavailable();
      }
      return response.status === 204 ? null : ((await response.json()) as unknown);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`post: auth-service unreachable for ${path}`);
      throw this.unavailable();
    } finally {
      clearTimeout(timer);
    }
  }

  private unavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      message: 'Your plugin call allowance could not be checked right now',
      errorCode: InvokeErrorCode.QUOTA_UNAVAILABLE,
    });
  }
}
