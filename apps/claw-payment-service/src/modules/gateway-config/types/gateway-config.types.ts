import type { BillingGateway } from '@claw/shared-types';
import type { GatewayConfiguration, Prisma } from '../../../generated/prisma';

import type { GatewayCredentialField } from '../enums/gateway-credential-field.enum';
import type { GatewayMode } from '../enums/gateway-mode.enum';

export type EncryptedGatewayCredentials = Partial<Record<GatewayCredentialField, string>>;

export type GatewayConfigurationOptions = {
  currency?: string;
  webhookUrl?: string;
};

export type GatewayConfigurationWrite = {
  isEnabled: boolean;
  mode: GatewayMode;
  encryptedCredentials: Prisma.InputJsonObject;
  options: Prisma.InputJsonObject;
  encryptionKeyVersion: number;
};

export type GatewayFieldView = {
  key: GatewayCredentialField;
  configured: boolean;
};

export type GatewayAdminView = {
  gateway: BillingGateway;
  isEnabled: boolean;
  mode: GatewayMode;
  fields: GatewayFieldView[];
  options: GatewayConfigurationOptions;
  updatedAt: string;
};

export type CheckoutGatewayView = {
  gateway: BillingGateway;
  mode: GatewayMode;
  testingSoon: boolean;
  publicIdentifier: string | null;
  // The currency this gateway actually settles in, or null when it settles in
  // the plan's own currency.
  //
  // Exposed so checkout can state the truth beside a localized estimate: a
  // visitor shown "≈ EGP 515" needs to know PayPal will charge USD. The
  // frontend must not derive this — hardcoding "PayPal supports EGP" from
  // PayPal's published currency list is how a UI ends up promising a
  // settlement the merchant account cannot do.
  settlementCurrency: string | null;
};

export type GatewayConfigurationRecord = GatewayConfiguration;

export type GatewayBootstrapConfiguration = GatewayConfigurationWrite & {
  gateway: BillingGateway;
};

export type GatewayBootstrapInput = {
  name: string;
  version: number;
  checksum: string;
  configurations: GatewayBootstrapConfiguration[];
};

export type GatewayBootstrapOutcome = 'APPLIED' | 'ALREADY_APPLIED' | 'CHECKSUM_MISMATCH';

export type GatewaySeedCredential = readonly [GatewayCredentialField, string | undefined];

export type PaypalRuntimeConfig = {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  mode: GatewayMode;
};

export type PaymobRuntimeConfig = {
  secretKey: string;
  publicKey: string;
  apiKey: string;
  hmacSecret: string;
  cardIntegrationId: string;
  currency: string;
  webhookUrl?: string;
};

export type CachedGatewayRecord = {
  record: GatewayConfigurationRecord | null;
  expiresAt: number;
};
