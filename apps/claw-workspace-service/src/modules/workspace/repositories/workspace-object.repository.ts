import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma, WorkspaceObject } from '../../../generated/prisma';
import type { PaginatedWorkspaceObjects } from '../types/workspace.types';

@Injectable()
export class WorkspaceObjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    connectorId: string,
    _userId: string,
    _provider: string,
    data: Prisma.WorkspaceObjectCreateInput,
  ): Promise<WorkspaceObject> {
    return this.prisma.workspaceObject.upsert({
      where: { connectorId_externalId: { connectorId, externalId: data.externalId } },
      create: data,
      update: {
        title: data.title,
        content: data.content,
        url: data.url,
        authorId: data.authorId,
        metadata: data.metadata,
        externalUpdatedAt: data.externalUpdatedAt,
        updatedAt: new Date(),
      },
    });
  }

  async findByConnectorId(
    connectorId: string,
    userId: string,
    page: number,
    pageSize: number,
    type?: string,
  ): Promise<PaginatedWorkspaceObjects> {
    const where: Prisma.WorkspaceObjectWhereInput = { connectorId, userId };
    if (type !== undefined) {
      where.type = type as WorkspaceObject['type'];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.workspaceObject.findMany({
        where,
        orderBy: { externalUpdatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.workspaceObject.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async findAllByUserId(
    userId: string,
    page: number,
    pageSize: number,
    type?: string,
  ): Promise<PaginatedWorkspaceObjects> {
    const where: Prisma.WorkspaceObjectWhereInput = { userId };
    if (type !== undefined) {
      where.type = type as WorkspaceObject['type'];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.workspaceObject.findMany({
        where,
        orderBy: { externalUpdatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.workspaceObject.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async findById(id: string, userId: string): Promise<WorkspaceObject | null> {
    return this.prisma.workspaceObject.findFirst({
      where: { id, userId },
      include: { sourceLinks: true },
    });
  }

  async countByConnectorId(connectorId: string): Promise<number> {
    return this.prisma.workspaceObject.count({ where: { connectorId } });
  }

  async deleteByConnectorId(connectorId: string): Promise<void> {
    await this.prisma.workspaceObject.deleteMany({ where: { connectorId } });
  }

  async createLink(
    sourceObjectId: string,
    externalRef: string,
    linkType: string,
    targetObjectId?: string,
    confidence?: number,
  ): Promise<void> {
    await this.prisma.workspaceObjectLink.create({
      data: {
        sourceObjectId,
        targetObjectId,
        externalRef,
        linkType,
        confidence: confidence ?? 1.0,
      },
    });
  }
}
