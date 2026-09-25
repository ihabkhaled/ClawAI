import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { FetchStrategyKind, HostStrategyMemory } from '../../../generated/prisma';

@Injectable()
export class HostStrategyMemoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByHost(host: string): Promise<HostStrategyMemory | null> {
    return this.prisma.hostStrategyMemory.findUnique({ where: { host } });
  }

  /**
   * Records a successful fetch for `host` with `kind`: sets it as the
   * preferred strategy, bumps `successCount`, resets `consecutiveFailures`.
   */
  async recordSuccess(host: string, kind: FetchStrategyKind): Promise<void> {
    await this.prisma.hostStrategyMemory.upsert({
      where: { host },
      create: { host, preferredKind: kind, successCount: 1, consecutiveFailures: 0 },
      update: {
        preferredKind: kind,
        successCount: { increment: 1 },
        consecutiveFailures: 0,
        lastBlockSignal: null,
      },
    });
  }

  /**
   * Records a failed attempt for `host` with `kind` and why. Does not
   * change `preferredKind` — a failure on the currently-preferred strategy
   * is left in place until a DIFFERENT strategy succeeds, so a one-off
   * blip does not thrash the memory.
   */
  async recordFailure(host: string, kind: FetchStrategyKind, blockSignal: string): Promise<void> {
    await this.prisma.hostStrategyMemory.upsert({
      where: { host },
      create: {
        host,
        preferredKind: kind,
        successCount: 0,
        consecutiveFailures: 1,
        lastBlockSignal: blockSignal,
      },
      update: { consecutiveFailures: { increment: 1 }, lastBlockSignal: blockSignal },
    });
  }
}
