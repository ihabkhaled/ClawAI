import { HttpStatus, Injectable } from '@nestjs/common';
import { BillingGateway } from '@claw/shared-types';
import type { Prisma } from '../../../generated/prisma';

import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors';
import type { TokenVaultContext } from '../../../common/types/token-vault.types';
import {
  decryptGatewayToken,
  encryptGatewayToken,
} from '../../../common/utilities/token-vault.utility';
import {
  GATEWAY_CONFIG_VAULT_OWNER,
  GATEWAY_CREDENTIAL_FIELDS,
  GATEWAY_DEFAULT_MODE,
  GATEWAY_PUBLIC_IDENTIFIER_FIELD,
} from '../constants/gateway-config.constants';
import type { UpdateGatewayConfigurationDto } from '../dto/gateway-config.dto';
import { GatewayConfigErrorCode } from '../enums/gateway-config-error-code.enum';
import { GatewayCredentialField } from '../enums/gateway-credential-field.enum';
import { GatewayMode } from '../enums/gateway-mode.enum';
import { GatewayConfigRepository } from '../repositories/gateway-config.repository';
import type {
  CheckoutGatewayView,
  EncryptedGatewayCredentials,
  GatewayAdminView,
  GatewayConfigurationOptions,
  GatewayConfigurationRecord,
} from '../types/gateway-config.types';
import {
  parseEncryptedCredentials,
  parseGatewayOptions,
} from '../utilities/gateway-config-json.utility';

@Injectable()
export class GatewayConfigService {
  constructor(private readonly repository: GatewayConfigRepository) {}

  async listAdmin(): Promise<GatewayAdminView[]> {
    return (await this.repository.findAll()).map((record) => this.toAdminView(record));
  }

  async listCheckout(): Promise<CheckoutGatewayView[]> {
    return (await this.repository.findEnabled()).map((record) => ({
      gateway: record.gateway as BillingGateway,
      mode: record.mode as GatewayMode,
      testingSoon: record.gateway === BillingGateway.PAYMOB,
      publicIdentifier: this.decryptPublicIdentifier(record),
    }));
  }

  async update(
    gateway: BillingGateway,
    input: UpdateGatewayConfigurationDto,
  ): Promise<GatewayAdminView> {
    const existing = await this.repository.findByGateway(gateway);
    const encryptedCredentials = this.mergeCredentials(gateway, existing, input);
    const options = this.mergeOptions(existing, input);
    const record = await this.repository.upsert(gateway, {
      isEnabled: input.isEnabled ?? existing?.isEnabled ?? false,
      mode:
        input.mode ?? (existing?.mode as GatewayMode | undefined) ?? GATEWAY_DEFAULT_MODE[gateway],
      encryptedCredentials: encryptedCredentials as Prisma.InputJsonObject,
      options: options as Prisma.InputJsonObject,
      encryptionKeyVersion: AppConfig.get().PAYMENT_TOKEN_KEY_VERSION,
    });
    return this.toAdminView(record);
  }

  private toAdminView(record: GatewayConfigurationRecord): GatewayAdminView {
    const gateway = record.gateway as BillingGateway;
    const credentials = parseEncryptedCredentials(record.encryptedCredentials);
    return {
      gateway,
      isEnabled: record.isEnabled,
      mode: record.mode as GatewayMode,
      fields: GATEWAY_CREDENTIAL_FIELDS[gateway].map((key) => ({
        key,
        configured: credentials[key] !== undefined,
      })),
      options: parseGatewayOptions(record.options),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private mergeCredentials(
    gateway: BillingGateway,
    existing: GatewayConfigurationRecord | null,
    input: UpdateGatewayConfigurationDto,
  ): EncryptedGatewayCredentials {
    const merged = parseEncryptedCredentials(existing?.encryptedCredentials);
    const supplied = input.credentials ?? {};
    const allowed = GATEWAY_CREDENTIAL_FIELDS[gateway];
    for (const [rawField, rawValue] of Object.entries(supplied)) {
      const field = rawField as GatewayCredentialField;
      if (!allowed.includes(field)) {
        throw new BusinessException(
          'billing.errors.gatewayConfigInvalidFields',
          GatewayConfigErrorCode.INVALID_FIELDS,
          HttpStatus.BAD_REQUEST,
        );
      }
      const value = rawValue.trim();
      if (value.length === 0) continue;
      merged[field] = encryptGatewayToken(
        value,
        AppConfig.get().PAYMENT_TOKEN_ENCRYPTION_KEY,
        AppConfig.get().PAYMENT_TOKEN_KEY_VERSION,
        this.vaultContext(gateway, field),
      );
    }
    return merged;
  }

  private mergeOptions(
    existing: GatewayConfigurationRecord | null,
    input: UpdateGatewayConfigurationDto,
  ): GatewayConfigurationOptions {
    return { ...parseGatewayOptions(existing?.options), ...(input.options ?? {}) };
  }

  private decryptPublicIdentifier(record: GatewayConfigurationRecord): string | null {
    const gateway = record.gateway as BillingGateway;
    const field = GATEWAY_PUBLIC_IDENTIFIER_FIELD[gateway];
    const envelope = parseEncryptedCredentials(record.encryptedCredentials)[field];
    return envelope === undefined ? null : this.decrypt(gateway, field, envelope);
  }

  private decrypt(
    gateway: BillingGateway,
    field: GatewayCredentialField,
    envelope: string,
  ): string {
    return decryptGatewayToken(
      envelope,
      AppConfig.get().PAYMENT_TOKEN_ENCRYPTION_KEY,
      this.vaultContext(gateway, field),
    );
  }

  private vaultContext(gateway: BillingGateway, field: GatewayCredentialField): TokenVaultContext {
    return {
      userId: GATEWAY_CONFIG_VAULT_OWNER,
      gateway,
      paymentMethodId: field,
    };
  }
}
