import { vi, type Mock } from 'vitest';
import { ReconciliationRunStatus } from '../../../../common/enums/reconciliation.enum';
import type { ScheduledJobRunnerService } from '../../../scheduled-jobs/services/scheduled-job-runner.service';
import type { ReconciliationRepository } from '../../repositories/reconciliation.repository';
import type { GatewayReconciliationService } from '../../services/gateway-reconciliation.service';
import type { LifecycleReconciliationService } from '../../services/lifecycle-reconciliation.service';
import type { ProviderSubscriptionReconciliationService } from '../../services/provider-subscription-reconciliation.service';
import type { TransactionReconciliationService } from '../../services/transaction-reconciliation.service';
import type { PlanRetirementReconciliationService } from '../../services/plan-retirement-reconciliation.service';
import { ReconciliationManager } from '../reconciliation.manager';
import type { ScheduledJobCallback } from '../../../scheduled-jobs/types/scheduled-job.types';

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: () => ({ BILLING_RECONCILIATION_CRON: '0 */15 * * * *' }),
  },
}));

describe('ReconciliationManager', () => {
  let jobs: { run: Mock };
  let repository: { createRun: Mock; completeRun: Mock };
  let gateways: { reconcile: Mock };
  let lifecycle: { reconcile: Mock };
  let transactions: { reconcile: Mock };
  let providerSubscriptions: { reconcile: Mock };
  let planRetirements: { reconcile: Mock };
  let manager: ReconciliationManager;

  beforeEach(() => {
    jobs = {
      run: vi.fn(async (_options: unknown, callback: ScheduledJobCallback<unknown>) =>
        callback(),
      ),
    };
    repository = {
      createRun: vi.fn().mockResolvedValue({ id: 'run-1' }),
      completeRun: vi.fn(),
    };
    gateways = {
      reconcile: vi.fn().mockResolvedValue({
        scannedCount: 2,
        repairedCount: 1,
        quarantinedCount: 1,
        unprocessedCount: 3,
      }),
    };
    lifecycle = {
      reconcile: vi.fn().mockResolvedValue({
        scannedCount: 4,
        repairedCount: 4,
        quarantinedCount: 0,
        unprocessedCount: 0,
      }),
    };
    transactions = {
      reconcile: vi.fn().mockResolvedValue({
        scannedCount: 1,
        repairedCount: 0,
        quarantinedCount: 1,
        unprocessedCount: 0,
      }),
    };
    providerSubscriptions = {
      reconcile: vi.fn().mockResolvedValue({
        scannedCount: 0,
        repairedCount: 0,
        quarantinedCount: 0,
        unprocessedCount: 0,
      }),
    };
    planRetirements = {
      reconcile: vi.fn().mockResolvedValue({
        scannedCount: 2,
        repairedCount: 1,
        quarantinedCount: 0,
        unprocessedCount: 0,
      }),
    };
    manager = new ReconciliationManager(
      jobs as unknown as ScheduledJobRunnerService,
      repository as unknown as ReconciliationRepository,
      gateways as unknown as GatewayReconciliationService,
      transactions as unknown as TransactionReconciliationService,
      providerSubscriptions as unknown as ProviderSubscriptionReconciliationService,
      lifecycle as unknown as LifecycleReconciliationService,
      planRetirements as unknown as PlanRetirementReconciliationService,
    );
  });

  it('persists combined counts, including partial work', async () => {
    await expect(manager.reconcile(new Date('2026-07-26T00:00:00.000Z'))).resolves.toEqual({
      scannedCount: 9,
      repairedCount: 6,
      quarantinedCount: 2,
      unprocessedCount: 3,
    });
    expect(repository.completeRun).toHaveBeenCalledWith({
      runId: 'run-1',
      status: ReconciliationRunStatus.SUCCEEDED,
      errorCode: null,
      scannedCount: 9,
      repairedCount: 6,
      quarantinedCount: 2,
      unprocessedCount: 3,
    });
  });

  it('does not create a run when the lock is contended or lost before execution', async () => {
    jobs.run.mockResolvedValueOnce(null);

    await expect(manager.reconcile()).resolves.toBeNull();
    expect(repository.createRun).not.toHaveBeenCalled();
  });

  it('marks a durable run failed with a sanitized code', async () => {
    gateways.reconcile.mockRejectedValueOnce(new Error('provider body must not be stored'));

    await expect(manager.reconcile()).resolves.toBeNull();
    expect(repository.completeRun).toHaveBeenCalledWith({
      runId: 'run-1',
      status: ReconciliationRunStatus.FAILED,
      errorCode: 'RECONCILIATION_RUN_FAILED',
      scannedCount: 0,
      repairedCount: 0,
      quarantinedCount: 0,
      unprocessedCount: 0,
    });
  });
});
