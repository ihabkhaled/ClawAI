import { Injectable, Logger } from '@nestjs/common';
import { type AuthoritativeBillingEntitlement, HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader } from '../../../common/utilities';
import {
  PAYMENT_ENTITLEMENT_PATH_PREFIX,
  PAYMENT_ENTITLEMENT_TIMEOUT_MS,
} from '../constants/payment-entitlement.constants';
import { authoritativeBillingEntitlementSchema } from '../schemas/payment-entitlement.schema';

@Injectable()
export class PaymentEntitlementClient {
  private readonly logger = new Logger(PaymentEntitlementClient.name);

  async getAuthoritativeEntitlement(userId: string): Promise<AuthoritativeBillingEntitlement> {
    const path = `${PAYMENT_ENTITLEMENT_PATH_PREFIX}/${encodeURIComponent(userId)}/entitlement`;
    const response = await httpRequest<unknown>({
      url: `${AppConfig.get().PAYMENT_SERVICE_URL}${path}`,
      method: HttpMethod.GET,
      headers: { Authorization: buildInterServiceAuthHeader() },
      timeoutMs: PAYMENT_ENTITLEMENT_TIMEOUT_MS,
    });
    if (!response.ok) {
      this.logger.error(`getAuthoritativeEntitlement: payment status=${String(response.status)}`);
      throw new Error('Payment entitlement lookup failed');
    }
    const parsed = authoritativeBillingEntitlementSchema.safeParse(response.data);
    if (!parsed.success || parsed.data.userId !== userId) {
      this.logger.error('getAuthoritativeEntitlement: response failed schema or ownership check');
      throw new Error('Payment entitlement response invalid');
    }
    return parsed.data;
  }
}
