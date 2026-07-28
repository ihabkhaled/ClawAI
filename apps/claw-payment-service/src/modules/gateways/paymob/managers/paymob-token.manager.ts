import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../../app/config/app.config';
import { BillingException } from '../../../../common/errors';
import {
  PAYMOB_ACCESS_TOKEN_CACHE_MS,
  PAYMOB_BASE_URL,
  PAYMOB_PATHS,
} from '../constants/paymob.constants';
import { paymobTokenResponseSchema } from '../schemas/paymob-response.schema';

/**
 * Exchanges Paymob's long-lived API key for the short-lived access token used
 * by transaction inquiry endpoints. The access token is never logged.
 */
@Injectable()
export class PaymobTokenManager {
  private readonly logger = new Logger(PaymobTokenManager.name);
  private cachedToken: string | null = null;
  private expiresAtMs = 0;

  async getAccessToken(nowMs: number = Date.now()): Promise<string> {
    if (this.cachedToken !== null && nowMs < this.expiresAtMs) {
      return this.cachedToken;
    }

    const config = AppConfig.get();
    if (config.PAYMOB_API_KEY === undefined) {
      throw new BillingException(BillingErrorCode.PAYMENT_METHOD_UNAVAILABLE);
    }
    const response = await httpRequest<unknown>({
      url: `${PAYMOB_BASE_URL}${PAYMOB_PATHS.AUTH_TOKEN}`,
      method: HttpMethod.POST,
      headers: { 'Content-Type': 'application/json' },
      body: { api_key: config.PAYMOB_API_KEY },
      timeoutMs: config.PAYMENT_GATEWAY_TIMEOUT_MS,
    });
    if (!response.ok) {
      this.logger.error(`getAccessToken: Paymob auth failed status=${String(response.status)}`);
      throw new BillingException(BillingErrorCode.GATEWAY_UNAVAILABLE);
    }
    const parsed = paymobTokenResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      this.logger.error('getAccessToken: Paymob auth response failed schema validation');
      throw new BillingException(BillingErrorCode.PAYMENT_NOT_VERIFIED);
    }

    this.cachedToken = parsed.data.token;
    this.expiresAtMs = nowMs + PAYMOB_ACCESS_TOKEN_CACHE_MS;
    this.logger.log('getAccessToken: obtained Paymob inquiry token');
    return this.cachedToken;
  }
}
