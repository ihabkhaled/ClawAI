import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { RECONCILE_INTERVAL_MS } from '../constants/processing.constants';
import { ProcessingRunRepository } from '../repositories/processing-run.repository';
import type { RunWorker } from '../workers/run-worker';
import { RunWorkerFactory } from './run-worker-factory.service';

/**
 * Every 2 s, claims runs whose lease expired (PENDING/ACTIVE/DELAYED/STOPPING), up to
 * LIVE_WORKER_MAX_CONCURRENCY workers per replica (section 3). A crashed replica's runs
 * are taken over within one lease (15 s). On shutdown the workers stop and the leases are
 * released so another replica picks the runs up at once.
 */
@Injectable()
export class RunReconcilerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RunReconcilerService.name);
  private readonly owner = `${hostname()}:${String(process.pid)}:${randomUUID().slice(0, 8)}`;
  private readonly workers = new Map<string, RunWorker>();
  private timer: NodeJS.Timeout | undefined;
  private ticking = false;

  constructor(
    private readonly runs: ProcessingRunRepository,
    private readonly factory: RunWorkerFactory,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), RECONCILE_INTERVAL_MS);
    this.timer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    for (const worker of this.workers.values()) worker.stop();
    await this.runs.releaseLeases(this.owner).catch(() => {});
  }

  get activeWorkers(): number {
    return this.workers.size;
  }

  /** One reconcile pass; overlapping passes are skipped. */
  async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const limit = AppConfig.get().LIVE_WORKER_MAX_CONCURRENCY;
      while (this.workers.size < limit) {
        const claim = await this.runs.claimNext(this.owner);
        if (!claim) break;
        const worker = await this.factory.create(claim);
        if (!worker) continue;
        this.workers.set(claim.id, worker);
        void worker.run().finally(() => this.workers.delete(claim.id));
      }
    } catch {
      this.logger.warn('live run reconcile pass failed');
    } finally {
      this.ticking = false;
    }
  }
}
