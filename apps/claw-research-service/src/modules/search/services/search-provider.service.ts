import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { SearchProviderStatus } from '../../../common/enums/search-provider-status.enum';
import { decryptString, encryptString } from '../../../common/utilities/crypto.utility';
import { SearchAdapterFactory } from '../adapters/search-adapter.factory';
import { SearchProviderRepository } from '../repositories/search-provider.repository';
import { sanitizeProvider, sanitizeProviders } from '../utilities/provider-sanitizer.utility';
import type { SanitizedSearchProvider } from '../types/sanitized-search-provider.types';
import type { SearchAdapterContext, SearchAdapterCredentials } from '../types/search.types';
import type { CreateSearchProviderDto } from '../dto/create-search-provider.dto';
import type { UpdateSearchProviderDto } from '../dto/update-search-provider.dto';
import type { Prisma, SearchProvider } from '../../../generated/prisma';

@Injectable()
export class SearchProviderService {
  private readonly logger = new Logger(SearchProviderService.name);

  constructor(
    private readonly repository: SearchProviderRepository,
    private readonly adapterFactory: SearchAdapterFactory,
  ) {}

  async list(): Promise<SanitizedSearchProvider[]> {
    return sanitizeProviders(await this.repository.list());
  }

  async getById(id: string): Promise<SanitizedSearchProvider> {
    return sanitizeProvider(await this.loadOrThrow(id));
  }

  async create(dto: CreateSearchProviderDto): Promise<SanitizedSearchProvider> {
    const existing = await this.repository.findByName(dto.name);
    if (existing !== null) {
      throw new BusinessException(
        'research.search_provider.name_taken',
        'NAME_TAKEN',
        HttpStatus.CONFLICT,
        { name: dto.name },
      );
    }
    const encryptedSecret = this.encryptSecretConfig(dto.secretConfig);
    const created = await this.repository.create({
      kind: dto.kind,
      name: dto.name,
      description: dto.description,
      baseUrl: dto.baseUrl,
      encryptedSecret,
      secretVersion: encryptedSecret === undefined ? 0 : 1,
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 100,
      publicConfig: (dto.publicConfig ?? {}) as Prisma.InputJsonValue,
      allowlistDomains: dto.allowlistDomains ?? [],
      blocklistDomains: dto.blocklistDomains ?? [],
      timeoutMs: dto.timeoutMs ?? 15_000,
    });
    return sanitizeProvider(created);
  }

  async update(id: string, dto: UpdateSearchProviderDto): Promise<SanitizedSearchProvider> {
    const existing = await this.loadOrThrow(id);
    const data: Prisma.SearchProviderUpdateInput = {
      name: dto.name,
      description: dto.description,
      baseUrl: dto.baseUrl,
      enabled: dto.enabled,
      priority: dto.priority,
      status: dto.status,
      allowlistDomains: dto.allowlistDomains,
      blocklistDomains: dto.blocklistDomains,
      timeoutMs: dto.timeoutMs,
    };
    if (dto.publicConfig !== undefined) {
      data.publicConfig = dto.publicConfig as Prisma.InputJsonValue;
    }
    if (dto.secretConfig !== undefined) {
      const encrypted = this.encryptSecretConfig(dto.secretConfig);
      if (encrypted !== undefined) {
        data.encryptedSecret = encrypted;
        data.secretVersion = existing.secretVersion + 1;
      }
    }
    return sanitizeProvider(await this.repository.update(id, data));
  }

  async delete(id: string): Promise<void> {
    await this.loadOrThrow(id);
    await this.repository.delete(id);
  }

  async testConnection(
    id: string,
  ): Promise<{ healthy: boolean; latencyMs: number; errorMessage?: string }> {
    const provider = await this.loadOrThrow(id);
    const adapter = this.adapterFactory.getAdapter(provider.kind);
    const context = this.buildContext(provider);
    const result = await adapter.healthCheck(context);
    await this.repository.update(id, {
      lastValidatedAt: new Date(),
      validationError: result.errorMessage ?? null,
      status: result.healthy ? SearchProviderStatus.ACTIVE : SearchProviderStatus.INVALID,
    });
    return result;
  }

  /** Build an adapter call context from a DB row — decrypts secrets. */
  buildContext(provider: SearchProvider): SearchAdapterContext {
    const credentials: SearchAdapterCredentials = this.decryptSecretConfig(
      provider.encryptedSecret,
    );
    return {
      baseUrl: provider.baseUrl,
      credentials,
      publicConfig: provider.publicConfig as Record<string, unknown>,
      timeoutMs: provider.timeoutMs,
    };
  }

  private async loadOrThrow(id: string): Promise<SearchProvider> {
    const provider = await this.repository.findById(id);
    if (provider === null) {
      throw new EntityNotFoundException('SearchProvider', id);
    }
    return provider;
  }

  private encryptSecretConfig(secret: Record<string, string> | undefined): string | undefined {
    if (secret === undefined || Object.keys(secret).length === 0) {
      return undefined;
    }
    return encryptString(JSON.stringify(secret));
  }

  private decryptSecretConfig(encrypted: string | null): SearchAdapterCredentials {
    if (encrypted === null) {
      return {};
    }
    try {
      const raw = JSON.parse(decryptString(encrypted)) as Record<string, string>;
      return {
        apiKey: raw['apiKey'],
        username: raw['username'],
        password: raw['password'],
        extra: raw,
      };
    } catch (error) {
      this.logger.warn(`Failed to decrypt search provider secret: ${String(error)}`);
      return {};
    }
  }
}
