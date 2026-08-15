import { Injectable, Logger } from '@nestjs/common';
import { DeploymentActivationState } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { CLOUD_ROUTER_ELIGIBLE_PRIVACY_CLASSES } from '../constants/cloud-router-eligibility.constants';
import type { EligibleDeploymentRecord } from '../types/model-deployment.types';

@Injectable()
export class ModelDeploymentRepository {
  private readonly logger = new Logger(ModelDeploymentRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deployments the cloud router may ever select, before ranking.
   *
   * Hard policy only — privacy class and activation state — no scoring.
   * CloudRouterManager's chain walk already handles ordering and fallback
   * over whatever this returns.
   */
  async findEligibleForCloudRouting(): Promise<EligibleDeploymentRecord[]> {
    const rows = await this.prisma.modelDeployment.findMany({
      where: {
        privacyClass: { in: [...CLOUD_ROUTER_ELIGIBLE_PRIVACY_CLASSES] },
        activationState: DeploymentActivationState.ACTIVE,
      },
      select: { id: true, provider: true, providerModelId: true },
    });
    this.logger.debug(`findEligibleForCloudRouting: ${String(rows.length)} eligible deployment(s)`);
    return rows;
  }
}
