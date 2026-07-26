import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ReconciliationRunStatus } from '../../../common/enums/reconciliation.enum';
import type {
  CompleteReconciliationRunInput,
  ReconciliationFindingInput,
} from '../types/reconciliation.types';
import type { ReconciliationRun } from '../../../generated/prisma';

@Injectable()
export class ReconciliationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRun(): Promise<ReconciliationRun> {
    return this.prisma.reconciliationRun.create({
      data: { status: ReconciliationRunStatus.RUNNING },
    });
  }

  async recordFinding(input: ReconciliationFindingInput): Promise<void> {
    await this.prisma.reconciliationDivergence.create({
      data: {
        runId: input.runId,
        entityType: input.entityType,
        entityId: input.entityId,
        gateway: input.gateway,
        classification: input.classification,
        localStatus: input.localStatus,
        providerStatus: input.providerStatus,
        resolution: input.resolution,
        repairedAt: input.repairedAt,
      },
    });
  }

  async completeRun(input: CompleteReconciliationRunInput): Promise<void> {
    await this.prisma.reconciliationRun.update({
      where: { id: input.runId },
      data: {
        status: input.status,
        scannedCount: input.scannedCount,
        repairedCount: input.repairedCount,
        quarantinedCount: input.quarantinedCount,
        unprocessedCount: input.unprocessedCount,
        completedAt: new Date(),
        errorCode: input.errorCode,
      },
    });
  }
}
