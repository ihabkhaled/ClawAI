import { HttpStatus, Injectable, type OnModuleInit } from '@nestjs/common';
import { BillingGateway } from '@claw/shared-types';
import type { Prisma } from '../../../generated/prisma';

import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import { encryptGatewayToken } from '../../../common/utilities/token-vault.utility';
import {
  GATEWAY_CONFIG_SEED_CHECKSUM,
  GATEWAY_CONFIG_SEED_NAME,
  GATEWAY_CONFIG_SEED_VERSION,
  GATEWAY_CONFIG_VAULT_OWNER,
} from '../constants/gateway-config.constants';
import { GatewayConfigErrorCode } from '../enums/gateway-config-error-code.enum';
import { GatewayCredentialField } from '../enums/gateway-credential-field.enum';
import { GatewayMode } from '../enums/gateway-mode.enum';
import { GatewayConfigRepository } from '../repositories/gateway-config.repository';
import type {
  EncryptedGatewayCredentials,
  GatewayBootstrapConfiguration,
  GatewaySeedCredential,
} from '../types/gateway-config.types';

@Injectable()
export class GatewayConfigBootstrapService implements OnModuleInit {
  constructor(private readonly repository: GatewayConfigRepository) {}

  async onModuleInit(): Promise<void> {
    const config = AppConfig.get();
    const outcome = await this.repository.importEnvironmentOnce({
      name: GATEWAY_CONFIG_SEED_NAME,
      version: GATEWAY_CONFIG_SEED_VERSION,
      checksum: GATEWAY_CONFIG_SEED_CHECKSUM,
      configurations: [
        this.configuration(
          BillingGateway.PAYPAL,
          config.PAYPAL_ENV === 'live' ? GatewayMode.LIVE : GatewayMode.SANDBOX,
          [
            [GatewayCredentialField.CLIENT_ID, config.PAYPAL_CLIENT_ID],
            [GatewayCredentialField.CLIENT_SECRET, config.PAYPAL_CLIENT_SECRET],
            [GatewayCredentialField.WEBHOOK_ID, config.PAYPAL_WEBHOOK_ID],
          ],
          {},
        ),
        this.configuration(
          BillingGateway.PAYMOB,
          GatewayMode.TESTING,
          [
            [GatewayCredentialField.SECRET_KEY, config.PAYMOB_SECRET_KEY],
            [GatewayCredentialField.PUBLIC_KEY, config.PAYMOB_PUBLIC_KEY],
            [GatewayCredentialField.API_KEY, config.PAYMOB_API_KEY],
            [GatewayCredentialField.HMAC_SECRET, config.PAYMOB_HMAC_SECRET],
            [GatewayCredentialField.CARD_INTEGRATION_ID, config.PAYMOB_CARD_INTEGRATION_ID],
          ],
          { currency: config.PAYMOB_CURRENCY, webhookUrl: config.PAYMOB_WEBHOOK_URL },
        ),
      ],
    });
    if (outcome === 'CHECKSUM_MISMATCH') {
      throw new BusinessException(
        'billing.errors.gatewayConfigSeedMismatch',
        GatewayConfigErrorCode.SEED_CHECKSUM_MISMATCH,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private configuration(
    gateway: BillingGateway,
    mode: GatewayMode,
    credentials: GatewaySeedCredential[],
    options: { currency?: string; webhookUrl?: string },
  ): GatewayBootstrapConfiguration {
    const config = AppConfig.get();
    const encryptedCredentials: EncryptedGatewayCredentials = {};
    let configuredCount = 0;
    for (const [field, value] of credentials) {
      if (value === undefined) continue;
      configuredCount += 1;
      encryptedCredentials[field] = encryptGatewayToken(
        value,
        config.PAYMENT_TOKEN_ENCRYPTION_KEY,
        config.PAYMENT_TOKEN_KEY_VERSION,
        { userId: GATEWAY_CONFIG_VAULT_OWNER, gateway, paymentMethodId: field },
      );
    }
    const compactOptions = Object.fromEntries(
      Object.entries(options).filter((entry) => entry[1] !== undefined),
    );
    return {
      gateway,
      isEnabled: configuredCount === credentials.length,
      mode,
      encryptedCredentials: encryptedCredentials as Prisma.InputJsonObject,
      options: compactOptions as Prisma.InputJsonObject,
      encryptionKeyVersion: config.PAYMENT_TOKEN_KEY_VERSION,
    };
  }
}
