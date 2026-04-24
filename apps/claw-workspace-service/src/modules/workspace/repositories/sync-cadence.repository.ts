import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import type { SyncCadenceConfig } from '../types/sync-cadence.types';

@Injectable()
export class SyncCadenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SyncCadenceConfig[]> {
    const rows = await this.prisma.syncCadenceDefault.findMany();
    return rows.map((row) => ({
      provider: row.provider as WorkspaceProvider,
      intervalSeconds: row.intervalSeconds,
      backfillWindowDays: row.backfillWindowDays,
      priority: row.priority,
      supportsDeltaSync: row.supportsDeltaSync,
      supportsWebhookSync: row.supportsWebhookSync,
      nativeCursorKind: row.nativeCursorKind,
    }));
  }

  async findByProvider(provider: WorkspaceProvider): Promise<SyncCadenceConfig | null> {
    const row = await this.prisma.syncCadenceDefault.findUnique({
      where: { provider: provider as never },
    });
    if (row === null) {
      return null;
    }
    return {
      provider: row.provider as WorkspaceProvider,
      intervalSeconds: row.intervalSeconds,
      backfillWindowDays: row.backfillWindowDays,
      priority: row.priority,
      supportsDeltaSync: row.supportsDeltaSync,
      supportsWebhookSync: row.supportsWebhookSync,
      nativeCursorKind: row.nativeCursorKind,
    };
  }
}
