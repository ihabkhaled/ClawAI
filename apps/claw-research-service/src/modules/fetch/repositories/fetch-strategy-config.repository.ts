import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { FetchStrategyConfig, FetchStrategyKind, Prisma } from '../../../generated/prisma';

@Injectable()
export class FetchStrategyConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKind(kind: FetchStrategyKind): Promise<FetchStrategyConfig | null> {
    return this.prisma.fetchStrategyConfig.findUnique({ where: { kind } });
  }

  async create(data: Prisma.FetchStrategyConfigCreateInput): Promise<FetchStrategyConfig> {
    return this.prisma.fetchStrategyConfig.create({ data });
  }

  async update(
    kind: FetchStrategyKind,
    data: Prisma.FetchStrategyConfigUpdateInput,
  ): Promise<FetchStrategyConfig> {
    return this.prisma.fetchStrategyConfig.update({ where: { kind }, data });
  }

  /** Enabled strategies, ordered cheapest-first — the escalation chain. */
  async listEnabledByTier(): Promise<FetchStrategyConfig[]> {
    return this.prisma.fetchStrategyConfig.findMany({
      where: { enabled: true },
      orderBy: { tier: 'asc' },
    });
  }

  /** Full status table for the admin-readable endpoint, enabled or not. */
  async listAll(): Promise<FetchStrategyConfig[]> {
    return this.prisma.fetchStrategyConfig.findMany({ orderBy: { tier: 'asc' } });
  }
}
