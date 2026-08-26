import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { AppConfig } from '../../../app/config/app.config';
import {
  CHAIN_ORPHAN_RUN_MAX_AGE_MS,
  CHAIN_ORPHAN_RUN_RECOVERY_CRON,
} from '../constants/chain-cadence.constants';
import { ChainRepository } from '../repositories/chain.repository';

/**
 * Phase 05 (scoped safety-net slice) — mirrors
 * OrphanSyncRecoveryManager exactly, applied to WorkspaceChainRun.
 *
 * ChainExecutorManager.run() executes an entire chain synchronously
 * within one process/request; there is no separate worker heartbeat, so a
 * process crash mid-chain leaves the run row stuck at status=RUNNING
 * forever with no automatic recovery. This sweeps those stuck rows to
 * FAILED so they don't block forever and so ChainExecutorManager.resume()
 * (added alongside this) has a well-defined FAILED run to resume from
 * instead of a run that looks like it's still (falsely) in progress.
 */
@Injectable()
export class ChainOrphanRunRecoveryManager implements OnModuleInit {
  private readonly logger = new Logger(ChainOrphanRunRecoveryManager.name);
  private readonly enabled: boolean;

  constructor(private readonly chainRepo: ChainRepository) {
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
        this.logger.warn(`Startup orphan sweep recovered ${recovered} stuck RUNNING chain runs`);
      }
    } catch (error) {
      this.logger.error('Startup chain orphan sweep failed', this.formatError(error));
    }
  }

  @Cron(CHAIN_ORPHAN_RUN_RECOVERY_CRON, { name: 'workspace.chain.orphan_recovery' })
  async recover(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    try {
      const recovered = await this.sweep();
      if (recovered > 0) {
        this.logger.warn(`Chain orphan recovery swept ${recovered} stuck RUNNING chain runs`);
      }
    } catch (error) {
      this.logger.error('Chain orphan recovery failed', this.formatError(error));
    }
  }

  async sweep(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - CHAIN_ORPHAN_RUN_MAX_AGE_MS);
    return this.chainRepo.markOrphanedRunsAsFailed(
      cutoff,
      `Orphaned chain run recovered — exceeded ${String(CHAIN_ORPHAN_RUN_MAX_AGE_MS)}ms age threshold`,
    );
  }

  private formatError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return { message: error.message, name: error.name };
    }
    return { error: String(error) };
  }
}
