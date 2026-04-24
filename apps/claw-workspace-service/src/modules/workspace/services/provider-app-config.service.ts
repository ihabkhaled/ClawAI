import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { decryptString, encryptString } from '../../../common/utilities/crypto.utility';
import { assertSafeOutboundUrl } from '../../../common/utilities/url-safety.utility';
import {
  type Prisma,
  WorkspaceProvider,
  type WorkspaceProviderAppConfig,
  WorkspaceProviderAppConfigStatus,
  WorkspaceProviderAuthMode,
  type WorkspaceProviderDefinition,
} from '../../../generated/prisma';
import type {
  ProviderConfigField,
  ProviderConfigSchema,
} from '../constants/provider-registry.constants';
import { ProviderAppConfigRepository } from '../repositories/provider-app-config.repository';
import type {
  CreateProviderAppConfigInput,
  ProviderAppConfigPublic,
  UpdateProviderAppConfigInput,
} from '../types/provider-config.types';
import { ProviderRegistryService } from './provider-registry.service';

@Injectable()
export class ProviderAppConfigService {
  private readonly logger = new Logger(ProviderAppConfigService.name);

  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly repo: ProviderAppConfigRepository,
  ) {}

  async list(provider?: WorkspaceProvider): Promise<ProviderAppConfigPublic[]> {
    const configs = await this.repo.findAll(provider);
    return configs.map((c) => this.toPublic(c));
  }

  async getById(id: string): Promise<ProviderAppConfigPublic> {
    const config = await this.ensureConfigExists(id);
    return this.toPublic(config);
  }

  async create(
    input: CreateProviderAppConfigInput,
    actorUserId: string,
  ): Promise<ProviderAppConfigPublic> {
    const definition = await this.registry.getByProvider(input.provider);
    this.validateConfigAgainstSchema(
      input.publicConfig,
      input.secretConfig,
      definition,
      input.authMode,
      true,
    );
    await this.ensureUniqueName(input.provider, input.name);
    const encryptedSecret = this.encryptSecretsIfAny(input.secretConfig);
    const created = await this.repo.create({
      provider: input.provider,
      definition: { connect: { id: definition.id } },
      name: input.name.trim(),
      description: input.description?.trim(),
      authMode: input.authMode,
      publicConfig: input.publicConfig as Prisma.InputJsonValue,
      encryptedSecret,
      secretVersion: encryptedSecret === null ? 0 : 1,
      scopes: input.scopes ?? [],
      status: WorkspaceProviderAppConfigStatus.READY,
      createdBy: actorUserId,
    });
    return this.toPublic(created);
  }

  async update(id: string, input: UpdateProviderAppConfigInput): Promise<ProviderAppConfigPublic> {
    const existing = await this.ensureConfigExists(id);
    const definition = await this.registry.getById(existing.definitionId);
    const authMode = input.authMode ?? existing.authMode;
    const publicConfig = input.publicConfig ?? (existing.publicConfig as Record<string, unknown>);
    this.validateConfigAgainstSchema(
      publicConfig,
      input.secretConfig,
      definition,
      authMode,
      input.secretConfig !== undefined,
    );

    let encryptedSecret: string | null | undefined = undefined;
    let secretVersion = existing.secretVersion;
    if (input.secretConfig !== undefined) {
      const encrypted = this.encryptSecretsIfAny(input.secretConfig);
      encryptedSecret = encrypted;
      secretVersion = (existing.secretVersion ?? 0) + 1;
    }

    const updated = await this.repo.update(id, {
      name: input.name?.trim(),
      description: input.description?.trim(),
      authMode: input.authMode,
      publicConfig:
        input.publicConfig !== undefined
          ? (input.publicConfig as Prisma.InputJsonValue)
          : undefined,
      encryptedSecret,
      secretVersion,
      scopes: input.scopes,
      status: input.status,
    });
    return this.toPublic(updated);
  }

  async delete(id: string): Promise<void> {
    await this.ensureConfigExists(id);
    await this.repo.delete(id);
  }

  async getDecryptedSecret(id: string): Promise<Record<string, unknown> | null> {
    const config = await this.ensureConfigExists(id);
    if (config.encryptedSecret === null || config.encryptedSecret.length === 0) {
      return null;
    }
    const { ENCRYPTION_KEY } = AppConfig.get();
    const decoded = decryptString(config.encryptedSecret, ENCRYPTION_KEY);
    try {
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch (error: unknown) {
      this.logger.error(
        `failed to parse decrypted secret for ${id}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  private async ensureConfigExists(id: string): Promise<WorkspaceProviderAppConfig> {
    const config = await this.repo.findById(id);
    if (config === null) {
      throw new EntityNotFoundException('WorkspaceProviderAppConfig', id);
    }
    return config;
  }

  private async ensureUniqueName(provider: WorkspaceProvider, name: string): Promise<void> {
    const existing = await this.repo.findByProviderAndName(provider, name.trim());
    if (existing !== null) {
      throw new BusinessException(
        `A config named "${name}" already exists for ${provider}`,
        'DUPLICATE_APP_CONFIG_NAME',
        HttpStatus.CONFLICT,
      );
    }
  }

  private encryptSecretsIfAny(secretConfig: Record<string, unknown> | undefined): string | null {
    if (secretConfig === undefined) {
      return null;
    }
    const entries = Object.entries(secretConfig).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    );
    if (entries.length === 0) {
      return null;
    }
    const { ENCRYPTION_KEY } = AppConfig.get();
    const plaintext = JSON.stringify(Object.fromEntries(entries));
    return encryptString(plaintext, ENCRYPTION_KEY);
  }

  private validateConfigAgainstSchema(
    publicConfig: Record<string, unknown>,
    secretConfig: Record<string, unknown> | undefined,
    definition: WorkspaceProviderDefinition,
    authMode: WorkspaceProviderAuthMode,
    validateSecrets: boolean,
  ): void {
    const schema = definition.configSchema as unknown as ProviderConfigSchema;
    if (schema === null || typeof schema !== 'object' || !Array.isArray(schema.fields)) {
      throw new BusinessException(
        `Provider ${definition.provider} has an invalid config schema`,
        'INVALID_PROVIDER_SCHEMA',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    if (!definition.authModes.includes(authMode)) {
      throw new BusinessException(
        `Provider ${definition.provider} does not support auth mode ${authMode}`,
        'UNSUPPORTED_AUTH_MODE',
        HttpStatus.BAD_REQUEST,
      );
    }
    const secrets = secretConfig ?? {};
    for (const field of schema.fields) {
      if (field.secret && !validateSecrets) {
        continue;
      }
      this.validateField(field, publicConfig, secrets, authMode, definition.provider);
    }
  }

  private validateField(
    field: ProviderConfigField,
    publicConfig: Record<string, unknown>,
    secretConfig: Record<string, unknown>,
    authMode: WorkspaceProviderAuthMode,
    provider: WorkspaceProvider,
  ): void {
    if (field.appliesToAuthModes !== undefined && !field.appliesToAuthModes.includes(authMode)) {
      return;
    }
    const value = field.secret ? secretConfig[field.key] : publicConfig[field.key];
    if (value === undefined || value === null || value === '') {
      if (field.required) {
        throw new BusinessException(
          `Field "${field.key}" is required for provider ${provider}`,
          'REQUIRED_FIELD_MISSING',
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    }
    if (field.type === 'url' && typeof value === 'string') {
      try {
        // Provider app config URLs (OAuth endpoints, custom server URLs) are
        // admin-controlled — allow self-hosted internal hosts; keep cloud
        // metadata endpoint blocked.
        assertSafeOutboundUrl(value, { allowPrivateHosts: true });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Invalid URL';
        throw new BusinessException(
          `Field "${field.key}" must be a safe URL: ${message}`,
          'UNSAFE_URL_FIELD',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  private toPublic(config: WorkspaceProviderAppConfig): ProviderAppConfigPublic {
    const { encryptedSecret: _encryptedSecret, ...rest } = config;
    return {
      ...rest,
      hasSecret: config.encryptedSecret !== null && config.encryptedSecret.length > 0,
    };
  }
}
