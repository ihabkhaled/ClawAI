import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode } from '@claw/shared-types';

import { AppConfig } from '../../../../app/config/app.config';
import { BillingException } from '../../../../common/errors';
import { GatewayMode } from '../../../gateway-config/enums/gateway-mode.enum';
import { GatewayRuntimeConfigService } from '../../../gateway-config/services/gateway-runtime-config.service';
import {
  PAYPAL_LIVE_BASE_URL,
  PAYPAL_PATHS,
  PAYPAL_SANDBOX_BASE_URL,
  PAYPAL_TOKEN_EXPIRY_MARGIN_SECONDS,
} from '../constants/paypal.constants';
import { paypalTokenResponseSchema } from '../schemas/paypal-response.schema';

// Caches the PayPal OAuth token and refreshes it slightly BEFORE expiry.
//
// Without the margin a token can expire in flight — valid when checked,
// expired by the time the request lands — which surfaces as a random 401 in
// the middle of a payment and is very hard to diagnose after the fact.
//
// The token itself is never logged, and the Basic credential is built per
// request rather than held on the instance.
@Injectable()
export class PaypalTokenManager {
  private readonly logger = new Logger(PaypalTokenManager.name);
  private cachedToken: string | null = null;
  private expiresAtMs = 0;

  constructor(private readonly runtimeConfig: GatewayRuntimeConfigService) {}

  static baseUrl(mode: GatewayMode): string {
    return mode === GatewayMode.LIVE ? PAYPAL_LIVE_BASE_URL : PAYPAL_SANDBOX_BASE_URL;
  }

  async getAccessToken(nowMs: number = Date.now()): Promise<string> {
    if (this.cachedToken !== null && nowMs < this.expiresAtMs) {
      return this.cachedToken;
    }
    return this.fetchToken(nowMs);
  }

  // Forces the next call to re-authenticate. Used when PayPal rejects a token
  // we believed was valid — retrying with the same dead token would just fail
  // again.
  invalidate(): void {
    this.cachedToken = null;
    this.expiresAtMs = 0;
  }

  private async fetchToken(nowMs: number): Promise<string> {
    const config = AppConfig.get();
    const paypal = await this.runtimeConfig.getPaypalOperations();
    const credential = Buffer.from(`${paypal.clientId}:${paypal.clientSecret}`).toString('base64');

    const response = await fetch(
      `${PaypalTokenManager.baseUrl(paypal.mode)}${PAYPAL_PATHS.OAUTH_TOKEN}`,
      {
        method: 'POST',
        headers: {
          // The token endpoint is form-encoded, not JSON.
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credential}`,
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(config.PAYMENT_GATEWAY_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      // Status only — the body may echo credentials back.
      this.logger.error(`fetchToken: PayPal auth failed status=${String(response.status)}`);
      throw new BillingException(BillingErrorCode.PAYMENT_NOT_VERIFIED);
    }

    const parsed = paypalTokenResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      this.logger.error('fetchToken: PayPal token response failed schema validation');
      throw new BillingException(BillingErrorCode.PAYMENT_NOT_VERIFIED);
    }

    this.cachedToken = parsed.data.access_token;
    this.expiresAtMs = nowMs + (parsed.data.expires_in - PAYPAL_TOKEN_EXPIRY_MARGIN_SECONDS) * 1000;
    this.logger.log(
      `fetchToken: obtained PayPal token, expires_in=${String(parsed.data.expires_in)}s`,
    );
    return this.cachedToken;
  }
}
