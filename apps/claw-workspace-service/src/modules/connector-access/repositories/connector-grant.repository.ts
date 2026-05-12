import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  Prisma,
  WorkspaceConnectorAccessLevel,
  WorkspaceConnectorGrant,
} from '../../../generated/prisma';

@Injectable()
export class ConnectorGrantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findForUserConnector(
    userId: string,
    connectorId: string,
  ): Promise<WorkspaceConnectorGrant | null> {
    return this.prisma.workspaceConnectorGrant.findUnique({
      where: { connectorId_userId: { connectorId, userId } },
    });
  }

  async listForConnector(connectorId: string): Promise<WorkspaceConnectorGrant[]> {
    return this.prisma.workspaceConnectorGrant.findMany({
      where: { connectorId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listForUser(userId: string): Promise<WorkspaceConnectorGrant[]> {
    return this.prisma.workspaceConnectorGrant.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsert(
    connectorId: string,
    userId: string,
    grantedBy: string,
    accessLevel: WorkspaceConnectorAccessLevel,
  ): Promise<WorkspaceConnectorGrant> {
    const data: Prisma.WorkspaceConnectorGrantUncheckedCreateInput = {
      connectorId,
      userId,
      grantedBy,
      accessLevel,
    };
    return this.prisma.workspaceConnectorGrant.upsert({
      where: { connectorId_userId: { connectorId, userId } },
      create: data,
      update: { accessLevel, grantedBy },
    });
  }

  async deleteOne(connectorId: string, userId: string): Promise<void> {
    await this.prisma.workspaceConnectorGrant.deleteMany({
      where: { connectorId, userId },
    });
  }
}
