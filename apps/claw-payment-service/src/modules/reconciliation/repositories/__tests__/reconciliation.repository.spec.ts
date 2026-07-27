import {
  ReconciliationClassification,
  ReconciliationEntityType,
  ReconciliationResolution,
  ReconciliationRunStatus,
} from '../../../../common/enums/reconciliation.enum';
import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ReconciliationRepository } from '../reconciliation.repository';

describe('ReconciliationRepository', () => {
  let run: { create: jest.Mock; update: jest.Mock };
  let divergence: { create: jest.Mock };
  let repository: ReconciliationRepository;

  beforeEach(() => {
    run = {
      create: jest.fn().mockResolvedValue({ id: 'run-1' }),
      update: jest.fn(),
    };
    divergence = { create: jest.fn() };
    repository = new ReconciliationRepository({
      reconciliationRun: run,
      reconciliationDivergence: divergence,
    } as unknown as PrismaService);
  });

  it('opens a durable running row before gateway work begins', async () => {
    await repository.createRun();

    expect(run.create).toHaveBeenCalledWith({
      data: { status: ReconciliationRunStatus.RUNNING },
    });
  });

  it('stores only classified state facts for a divergence', async () => {
    const repairedAt = new Date('2026-07-26T00:00:00.000Z');
    await repository.recordFinding({
      runId: 'run-1',
      entityType: ReconciliationEntityType.CHECKOUT_SESSION,
      entityId: 'checkout-1',
      gateway: 'PAYPAL',
      classification: ReconciliationClassification.LOCAL_PENDING_PROVIDER_PAID,
      localStatus: 'AWAITING_PAYMENT',
      providerStatus: 'COMPLETED',
      resolution: ReconciliationResolution.REPAIRED,
      repairedAt,
    });

    expect(divergence.create).toHaveBeenCalledWith({
      data: {
        runId: 'run-1',
        entityType: ReconciliationEntityType.CHECKOUT_SESSION,
        entityId: 'checkout-1',
        gateway: 'PAYPAL',
        classification: ReconciliationClassification.LOCAL_PENDING_PROVIDER_PAID,
        localStatus: 'AWAITING_PAYMENT',
        providerStatus: 'COMPLETED',
        resolution: ReconciliationResolution.REPAIRED,
        repairedAt,
      },
    });
  });

  it('persists final counts and a sanitized failure code', async () => {
    await repository.completeRun({
      runId: 'run-1',
      status: ReconciliationRunStatus.FAILED,
      scannedCount: 2,
      repairedCount: 0,
      quarantinedCount: 2,
      unprocessedCount: 10,
      errorCode: 'RECONCILIATION_RUN_FAILED',
    });

    expect(run.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: expect.objectContaining({
        status: ReconciliationRunStatus.FAILED,
        scannedCount: 2,
        errorCode: 'RECONCILIATION_RUN_FAILED',
        completedAt: expect.any(Date),
      }),
    });
  });
});
