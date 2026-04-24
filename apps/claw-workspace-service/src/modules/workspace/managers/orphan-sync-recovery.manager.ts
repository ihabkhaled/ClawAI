import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { AppConfig } from '../../../app/config/app.config';
import {
  ORPHAN_RUN_MAX_AGE_MS,
  ORPHAN_RUN_RECOVERY_CRON,
} from '../constants/sync-cadence.constants';
import { WorkspaceConnectorRepository } from '../repositories/workspace-connector.repository';

/**
 * Sweeps WorkspaceSyncRun rows stuck in status=RUNNING longer than
 * ORPHAN_RUN_MAX_AGE_MS and marks them FAILED. Without this, a process
 * crash mid-sync leaves an orphan row that blocks the scheduler's
 * in-flight-lock check forever, and the connector never syncs again.
 *
 * Also runs once on module init to clean up state left by a previous
 * container incarnation before the first scheduler tick fires.
 */
@Injectable()
export class OrphanSyncRecoveryManager implements OnModuleInit {
  private readonly logger = new Logger(OrphanSyncRecoveryManager.name);
  private readonly enabled: boolean;

  constructor(private readonly connectorRepository: WorkspaceConnectorRepository) {
    const cfg = AppConfig.get();
    this.enabled = cfg.WORKSPACE_SCHEDULER_ENABLED;
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    try {
      const recovered = await this.sweep();
      if (recovered > 0) {
        this.logger.warn(`Startup orphan sweep recovered ${recovered} stuck RUNNING sync runs`);
      }
    } catch (error) {
      this.logger.error('Startup orphan sweep failed', this.formatError(error));
    }
  }

  @Cron(ORPHAN_RUN_RECOVERY_CRON, { name: 'workspace.sync.orphan_recovery' })
  async recover(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    try {
      const recovered = await this.sweep();
      if (recovered > 0) {
        this.logger.warn(`Orphan recovery swept ${recovered} stuck RUNNING sync runs`);
      }
    } catch (error) {
      this.logger.error('Orphan recovery failed', this.formatError(error));
    }
  }

  async sweep(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - ORPHAN_RUN_MAX_AGE_MS);
    return this.connectorRepository.markOrphanedRunsAsFailed(
      cutoff,
      `Orphaned run recovered — exceeded ${String(ORPHAN_RUN_MAX_AGE_MS)}ms age threshold`,
    );
  }

  private formatError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return { message: error.message, name: error.name };
    }
    return { error: String(error) };
  }
}
