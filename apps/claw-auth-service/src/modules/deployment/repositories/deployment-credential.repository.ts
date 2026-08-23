import { Injectable } from '@nestjs/common';

import { type DeploymentCredential } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { DEPLOYMENT_CREDENTIAL_ID } from '../constants/deployment-trigger.constants';
import { type DeploymentCredentialWrite } from '../types/deployment-credential.types';

/**
 * The single production deployment-credential row. Every method pins
 * DEPLOYMENT_CREDENTIAL_ID, so the table cannot grow a second configuration
 * whichever caller writes to it.
 */
@Injectable()
export class DeploymentCredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(): Promise<DeploymentCredential | null> {
    return this.prisma.deploymentCredential.findUnique({
      where: { id: DEPLOYMENT_CREDENTIAL_ID },
    });
  }

  async upsert(data: DeploymentCredentialWrite): Promise<DeploymentCredential> {
    return this.prisma.deploymentCredential.upsert({
      where: { id: DEPLOYMENT_CREDENTIAL_ID },
      create: { id: DEPLOYMENT_CREDENTIAL_ID, ...data },
      update: data,
    });
  }

  /** Returns false when there was nothing stored, so the caller can say so. */
  async delete(): Promise<boolean> {
    const { count } = await this.prisma.deploymentCredential.deleteMany({
      where: { id: DEPLOYMENT_CREDENTIAL_ID },
    });
    return count > 0;
  }
}
