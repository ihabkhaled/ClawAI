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

  // Post-pack hardening — idempotent upsert powering
  // SyncCadenceSeederManager. findAll() previously always returned []
  // (nothing ever wrote to this table), so getCadenceForProvider() silently
  // fell back to FALLBACK_CADENCE_SECONDS on every boot — not a live bug
  // (the fallback is correct), but the DB-level override this table exists
  // for ("DB values ALWAYS win over this constant" per that file's own
  // doc comment) was never actually reachable.
  //
  // `create` bootstraps every field from the current fallback the first
  // time a provider's row doesn't exist yet. `update` deliberately touches
  // ONLY the capability-reflecting fields (supportsDeltaSync/
  // supportsWebhookSync/nativeCursorKind, which describe adapter reality
  // and should stay fresh) — intervalSeconds/backfillWindowDays/priority
  // are the admin-tunable override surface this table exists for, and
  // must never be silently stomped back to the fallback on a later boot.
  async upsertDefault(config: SyncCadenceConfig): Promise<void> {
    await this.prisma.syncCadenceDefault.upsert({
      where: { provider: config.provider as never },
      create: {
        provider: config.provider as never,
        intervalSeconds: config.intervalSeconds,
        backfillWindowDays: config.backfillWindowDays,
        priority: config.priority,
        supportsDeltaSync: config.supportsDeltaSync,
        supportsWebhookSync: config.supportsWebhookSync,
        nativeCursorKind: config.nativeCursorKind,
      },
      update: {
        supportsDeltaSync: config.supportsDeltaSync,
        supportsWebhookSync: config.supportsWebhookSync,
        nativeCursorKind: config.nativeCursorKind,
      },
    });
  }
}
