import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { decryptGatewayToken } from '../../../common/utilities/token-vault.utility';
import type { Subscription } from '../../../generated/prisma';

@Injectable()
export class GatewaySubscriptionVaultService {
  decrypt(subscription: Subscription): string | null {
    if (subscription.encryptedGatewaySubscriptionId === null) {
      return null;
    }
    return decryptGatewayToken(
      subscription.encryptedGatewaySubscriptionId,
      AppConfig.get().PAYMENT_TOKEN_ENCRYPTION_KEY,
      {
        userId: subscription.userId,
        gateway: subscription.gateway,
        // Subscription gateway ids use the same row-bound envelope as payment
        // methods; the subscription row id occupies the generic record-id slot.
        paymentMethodId: subscription.id,
      },
    );
  }
}
