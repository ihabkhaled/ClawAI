import { BillingGateway } from '@claw/shared-types';

import { GatewayCredentialField } from '../enums/gateway-credential-field.enum';
import { GatewayMode } from '../enums/gateway-mode.enum';

export const GATEWAY_CONFIG_VAULT_OWNER = 'gateway-config';
export const GATEWAY_CONFIG_SEED_NAME = 'gateway-config-env-import';
export const GATEWAY_CONFIG_SEED_VERSION = 1;
export const GATEWAY_CONFIG_SEED_CHECKSUM =
  'sha256:1f5238426f43e8ef49149c7dd9194e3abda1ce622b88473197f9cdf2298299bc';
export const GATEWAY_CONFIG_SEED_LOCK_ID = 740_018_001;
export const GATEWAY_RUNTIME_CONFIG_CACHE_MS = 30_000;

export const GATEWAY_CREDENTIAL_FIELDS: Readonly<
  Record<BillingGateway, ReadonlyArray<GatewayCredentialField>>
> = {
  [BillingGateway.PAYPAL]: [
    GatewayCredentialField.CLIENT_ID,
    GatewayCredentialField.CLIENT_SECRET,
    GatewayCredentialField.WEBHOOK_ID,
  ],
  [BillingGateway.PAYMOB]: [
    GatewayCredentialField.SECRET_KEY,
    GatewayCredentialField.PUBLIC_KEY,
    GatewayCredentialField.API_KEY,
    GatewayCredentialField.HMAC_SECRET,
    GatewayCredentialField.CARD_INTEGRATION_ID,
  ],
};

export const GATEWAY_DEFAULT_MODE: Readonly<Record<BillingGateway, GatewayMode>> = {
  [BillingGateway.PAYPAL]: GatewayMode.SANDBOX,
  [BillingGateway.PAYMOB]: GatewayMode.TESTING,
};

export const GATEWAY_PUBLIC_IDENTIFIER_FIELD: Readonly<
  Record<BillingGateway, GatewayCredentialField>
> = {
  [BillingGateway.PAYPAL]: GatewayCredentialField.CLIENT_ID,
  [BillingGateway.PAYMOB]: GatewayCredentialField.PUBLIC_KEY,
};
