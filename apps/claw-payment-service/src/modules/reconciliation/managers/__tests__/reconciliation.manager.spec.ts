import { ReconciliationRunStatus } from '../../../../common/enums/reconciliation.enum';
import type { ScheduledJobRunnerService } from '../../../scheduled-jobs/services/scheduled-job-runner.service';
import type { ReconciliationRepository } from '../../repositories/reconciliation.repository';
import type { GatewayReconciliationService } from '../../services/gateway-reconciliation.service';
import type { LifecycleReconciliationService } from '../../services/lifecycle-reconciliation.service';
import type { ProviderSubscriptionReconciliationService } from '../../services/provider-subscription-reconciliation.service';
import type { TransactionReconciliationService } from '../../services/transaction-reconciliation.service';
import { ReconciliationManager } from '../reconciliation.manager';
import type { ScheduledJobCallback } from '../../../scheduled-jobs/types/scheduled-job.types';

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: () => ({ BILLING_RECONCILIATION_CRON: '0 */15 * * * *' }),
  },
}));

describe('ReconciliationManager', () => {
  let jobs: { run: jest.Mock };
  let repository: { createRun: jest.Mock; completeRun: jest.Mock };
  let gateways: { reconcile: jest.Mock };
  let lifecycle: { reconcile: jest.Mock };
  let transactions: { reconcile: jest.Mock };
  let providerSubscriptions: { reconcile: jest.Mock };
  let manager: ReconciliationManager;

  beforeEach(() => {
    jobs = {
      run: jest.fn(async (_options: unknown, callback: ScheduledJobCallback<unknown>) =>
        callback(),
      ),
    };
    repository = {
      createRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
      completeRun: jest.fn(),
    };
    gateways = {
      reconcile: jest.fn().mockResolvedValue({
        scannedCount: 2,
        repairedCount: 1,
        quarantinedCount: 1,
        unprocessedCount: 3,
      }),
    };
    lifecycle = {
      reconcile: jest.fn().mockResolvedValue({
        scannedCount: 4,
        repairedCount: 4,
        quarantinedCount: 0,
        unprocessedCount: 0,
      }),
    };
    transactions = {
      reconcile: jest.fn().mockResolvedValue({
        scannedCount: 1,
        repairedCount: 0,
        quarantinedCount: 1,
        unprocessedCount: 0,
      }),
    };
    providerSubscriptions = {
      reconcile: jest.fn().mockResolvedValue({
        scannedCount: 0,
        repairedCount: 0,
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
    );
  });

  it('persists combined counts, including partial work', async () => {
    await expect(manager.reconcile(new Date('2026-07-26T00:00:00.000Z'))).resolves.toEqual({
      scannedCount: 7,
      repairedCount: 5,
      quarantinedCount: 2,
      unprocessedCount: 3,
    });
    expect(repository.completeRun).toHaveBeenCalledWith({
      runId: 'run-1',
      status: ReconciliationRunStatus.SUCCEEDED,
      errorCode: null,
      scannedCount: 7,
      repairedCount: 5,
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
