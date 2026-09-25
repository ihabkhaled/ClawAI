import { Injectable } from '@nestjs/common';

import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import { toInputJson } from '../../../common/utilities/prisma-json.utility';
import { FetchStrategyConfigRepository } from '../repositories/fetch-strategy-config.repository';
import type { FetchStrategyConfig, FetchStrategyKind, Prisma } from '../../../generated/prisma';
import type { UpdateFetchStrategyDto } from '../dto/update-fetch-strategy.dto';

/**
 * Admin-facing read/update surface over `FetchStrategyConfig` — the
 * DB-level status table the task calls for instead of a new env var. Every
 * strategy already has a seeded row (`FetchStrategyBootstrapService`), so
 * `list` never returns fewer than `FetchStrategyKind`'s member count.
 */
@Injectable()
export class FetchStrategyStatusService {
  constructor(private readonly configs: FetchStrategyConfigRepository) {}

  async list(): Promise<FetchStrategyConfig[]> {
    return this.configs.listAll();
  }

  async update(kind: FetchStrategyKind, dto: UpdateFetchStrategyDto): Promise<FetchStrategyConfig> {
    const existing = await this.configs.findByKind(kind);
    if (existing === null) {
      throw new EntityNotFoundException('FetchStrategyConfig', kind);
    }
    const data: Prisma.FetchStrategyConfigUpdateInput = {
      enabled: dto.enabled,
      tier: dto.tier,
      timeoutMs: dto.timeoutMs,
      publicConfig: dto.publicConfig !== undefined ? toInputJson(dto.publicConfig) : undefined,
    };
    return this.configs.update(kind, data);
  }
}
