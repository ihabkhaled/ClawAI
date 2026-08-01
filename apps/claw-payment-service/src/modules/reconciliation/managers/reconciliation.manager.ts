import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { ReconciliationRunStatus } from '../../../common/enums/reconciliation.enum';
import { ScheduledJobRunnerService } from '../../scheduled-jobs/services/scheduled-job-runner.service';
import {
  RECONCILIATION_CRON,
  RECONCILIATION_FAILURE_CODE,
  RECONCILIATION_JOB_NAME,
  RECONCILIATION_LOCK_KEY,
  RECONCILIATION_LOCK_TTL_SECONDS,
} from '../constants/reconciliation.constants';
import { ReconciliationRepository } from '../repositories/reconciliation.repository';
import { GatewayReconciliationService } from '../services/gateway-reconciliation.service';
import { LifecycleReconciliationService } from '../services/lifecycle-reconciliation.service';
import { ProviderSubscriptionReconciliationService } from '../services/provider-subscription-reconciliation.service';
import { TransactionReconciliationService } from '../services/transaction-reconciliation.service';
import { PlanRetirementReconciliationService } from '../services/plan-retirement-reconciliation.service';
import type { ReconciliationCounts } from '../types/reconciliation.types';

@Injectable()
export class ReconciliationManager {
  private readonly logger = new Logger(ReconciliationManager.name);

  constructor(
    private readonly jobs: ScheduledJobRunnerService,
    private readonly repository: ReconciliationRepository,
    private readonly gateways: GatewayReconciliationService,
    private readonly transactions: TransactionReconciliationService,
    private readonly providerSubscriptions: ProviderSubscriptionReconciliationService,
    private readonly lifecycle: LifecycleReconciliationService,
    private readonly planRetirements: PlanRetirementReconciliationService,
  ) {}

  @Cron(RECONCILIATION_CRON())
  async scheduledReconciliation(): Promise<void> {
    await this.reconcile();
  }

  async reconcile(now: Date = new Date()): Promise<ReconciliationCounts | null> {
    try {
      return await this.jobs.run(
        {
          jobName: RECONCILIATION_JOB_NAME,
          lockKey: RECONCILIATION_LOCK_KEY,
          lockTtlSeconds: RECONCILIATION_LOCK_TTL_SECONDS,
        },
        async () => this.execute(now),
      );
    } catch {
      this.logger.error(`reconcile: failed code=${RECONCILIATION_FAILURE_CODE}`);
      return null;
    }
  }

  private async execute(now: Date): Promise<ReconciliationCounts> {
    const run = await this.repository.createRun();
    try {
      const gateways = await this.gateways.reconcile(run.id, now);
      const transactions = await this.transactions.reconcile(run.id);
      const providerSubscriptions = await this.providerSubscriptions.reconcile(run.id);
      const lifecycle = await this.lifecycle.reconcile(run.id, now);
      const planRetirements = await this.planRetirements.reconcile();
      const counts = ReconciliationManager.combine([
        gateways,
        transactions,
        providerSubscriptions,
        lifecycle,
        planRetirements,
      ]);
      await this.repository.completeRun({
        runId: run.id,
        status: ReconciliationRunStatus.SUCCEEDED,
        errorCode: null,
        ...counts,
      });
      this.logCompletion(run.id, counts);
      return counts;
    } catch (error) {
      await this.failRun(run.id);
      throw error;
    }
  }

  private async failRun(runId: string): Promise<void> {
    await this.repository.completeRun({
      runId,
      status: ReconciliationRunStatus.FAILED,
      errorCode: RECONCILIATION_FAILURE_CODE,
      scannedCount: 0,
      repairedCount: 0,
      quarantinedCount: 0,
      unprocessedCount: 0,
    });
  }

  private logCompletion(runId: string, counts: ReconciliationCounts): void {
    const partial = counts.unprocessedCount > 0 ? ' partial=true' : '';
    this.logger.log(
      `reconcile: run=${runId} scanned=${String(counts.scannedCount)} ` +
        `repaired=${String(counts.repairedCount)} quarantined=${String(
          counts.quarantinedCount,
        )} unprocessed=${String(counts.unprocessedCount)}${partial}`,
    );
  }

  private static combine(counts: ReconciliationCounts[]): ReconciliationCounts {
    return counts.reduce(
      (total, current) => ({
        scannedCount: total.scannedCount + current.scannedCount,
        repairedCount: total.repairedCount + current.repairedCount,
        quarantinedCount: total.quarantinedCount + current.quarantinedCount,
        unprocessedCount: total.unprocessedCount + current.unprocessedCount,
      }),
      { scannedCount: 0, repairedCount: 0, quarantinedCount: 0, unprocessedCount: 0 },
    );
  }
}
