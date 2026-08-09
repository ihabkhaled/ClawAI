import { Injectable } from '@nestjs/common';
import { BillingErrorCode, BillingGateway } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { BillingException } from '../../../common/errors';
import { decryptGatewayToken } from '../../../common/utilities/token-vault.utility';
import {
  GATEWAY_CONFIG_VAULT_OWNER,
  GATEWAY_RUNTIME_CONFIG_CACHE_MS,
} from '../constants/gateway-config.constants';
import { GatewayCredentialField } from '../enums/gateway-credential-field.enum';
import { GatewayMode } from '../enums/gateway-mode.enum';
import { GatewayConfigRepository } from '../repositories/gateway-config.repository';
import type {
  CachedGatewayRecord,
  GatewayConfigurationRecord,
  PaymobRuntimeConfig,
  PaypalRuntimeConfig,
} from '../types/gateway-config.types';
import {
  parseEncryptedCredentials,
  parseGatewayOptions,
} from '../utilities/gateway-config-json.utility';

@Injectable()
export class GatewayRuntimeConfigService {
  private paypalCache: CachedGatewayRecord | null = null;
  private paymobCache: CachedGatewayRecord | null = null;

  constructor(private readonly repository: GatewayConfigRepository) {}

  getPaypalCheckout(): Promise<PaypalRuntimeConfig> {
    return this.getPaypal(true);
  }

  getPaypalOperations(): Promise<PaypalRuntimeConfig> {
    return this.getPaypal(false);
  }

  getPaymobCheckout(): Promise<PaymobRuntimeConfig> {
    return this.getPaymob(true);
  }

  getPaymobOperations(): Promise<PaymobRuntimeConfig> {
    return this.getPaymob(false);
  }

  invalidate(): void {
    this.paypalCache = null;
    this.paymobCache = null;
  }

  private async getPaypal(requireEnabled: boolean): Promise<PaypalRuntimeConfig> {
    const record = await this.record(BillingGateway.PAYPAL);
    this.assertAvailable(record, requireEnabled);
    return {
      clientId: this.credential(record, GatewayCredentialField.CLIENT_ID),
      clientSecret: this.credential(record, GatewayCredentialField.CLIENT_SECRET),
      webhookId: this.credential(record, GatewayCredentialField.WEBHOOK_ID),
      mode: record.mode as GatewayMode,
    };
  }

  private async getPaymob(requireEnabled: boolean): Promise<PaymobRuntimeConfig> {
    const record = await this.record(BillingGateway.PAYMOB);
    this.assertAvailable(record, requireEnabled);
    const options = parseGatewayOptions(record.options);
    return {
      secretKey: this.credential(record, GatewayCredentialField.SECRET_KEY),
      publicKey: this.credential(record, GatewayCredentialField.PUBLIC_KEY),
      apiKey: this.credential(record, GatewayCredentialField.API_KEY),
      hmacSecret: this.credential(record, GatewayCredentialField.HMAC_SECRET),
      cardIntegrationId: this.credential(record, GatewayCredentialField.CARD_INTEGRATION_ID),
      currency: options.currency ?? 'EGP',
      ...(options.webhookUrl === undefined ? {} : { webhookUrl: options.webhookUrl }),
    };
  }

  private async record(gateway: BillingGateway): Promise<GatewayConfigurationRecord | null> {
    const now = Date.now();
    const cached = gateway === BillingGateway.PAYPAL ? this.paypalCache : this.paymobCache;
    if (cached !== null && cached.expiresAt > now) return cached.record;
    const record = await this.repository.findByGateway(gateway);
    const value = { record, expiresAt: now + GATEWAY_RUNTIME_CONFIG_CACHE_MS };
    if (gateway === BillingGateway.PAYPAL) this.paypalCache = value;
    else this.paymobCache = value;
    return record;
  }

  private assertAvailable(
    record: GatewayConfigurationRecord | null,
    requireEnabled: boolean,
  ): asserts record is GatewayConfigurationRecord {
    if (record === null || (requireEnabled && !record.isEnabled)) {
      throw new BillingException(BillingErrorCode.PAYMENT_METHOD_UNAVAILABLE);
    }
  }

  private credential(record: GatewayConfigurationRecord, field: GatewayCredentialField): string {
    const envelope = parseEncryptedCredentials(record.encryptedCredentials)[field];
    if (envelope === undefined) {
      throw new BillingException(BillingErrorCode.PAYMENT_METHOD_UNAVAILABLE);
    }
    return decryptGatewayToken(envelope, AppConfig.get().PAYMENT_TOKEN_ENCRYPTION_KEY, {
      userId: GATEWAY_CONFIG_VAULT_OWNER,
      gateway: record.gateway,
      paymentMethodId: field,
    });
  }
}
