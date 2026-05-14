import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma, WorkspaceObject } from '../../../generated/prisma';
import type { PaginatedWorkspaceObjects, WorkspaceSearchFilters } from '../types/workspace.types';

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

  // v3 round 8 — connector-only filter (no userId scoping). For grantee
  // callers where ConnectorAccessService.can(...VIEW) has already
  // authorized the request. Caller MUST run the access check first;
  // this method intentionally trusts its inputs.
  async findByConnectorIdForAuthorizedUser(
    connectorId: string,
    page: number,
    pageSize: number,
    type?: string,
  ): Promise<PaginatedWorkspaceObjects> {
    const where: Prisma.WorkspaceObjectWhereInput = { connectorId };
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

  // v3 round 11 — id-only lookup (no userId filter). For grantee callers
  // where ConnectorAccessService has already authorized access to the
  // object's connector. Caller MUST run the access check first.
  async findByIdForAuthorizedUser(id: string): Promise<WorkspaceObject | null> {
    return this.prisma.workspaceObject.findUnique({
      where: { id },
      include: { sourceLinks: true },
    });
  }

  async countByConnectorId(connectorId: string): Promise<number> {
    return this.prisma.workspaceObject.count({ where: { connectorId } });
  }

  async deleteByConnectorId(connectorId: string): Promise<void> {
    await this.prisma.workspaceObject.deleteMany({ where: { connectorId } });
  }

  async search(
    userId: string,
    query: string,
    limit: number,
    filters?: WorkspaceSearchFilters,
  ): Promise<WorkspaceObject[]> {
    const where: Prisma.WorkspaceObjectWhereInput = {
      userId,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ],
    };
    if (filters?.types !== undefined && filters.types.length > 0) {
      where.type = { in: filters.types as WorkspaceObject['type'][] };
    }
    if (filters?.providers !== undefined && filters.providers.length > 0) {
      where.provider = { in: filters.providers as WorkspaceObject['provider'][] };
    }
    return this.prisma.workspaceObject.findMany({
      where,
      orderBy: { externalUpdatedAt: 'desc' },
      take: limit,
    });
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
