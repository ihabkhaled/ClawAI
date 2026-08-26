import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  Prisma,
  WorkspaceEvent,
  WorkspaceEventProcessingStatus,
} from '../../../generated/prisma';
import type {
  CreateWorkspaceEventInput,
  ListWorkspaceEventFilters,
} from '../types/workspace-event-repository.types';

@Injectable()
export class WorkspaceEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent create keyed on (provider, idempotencyKey) — the unique
   * index this relies on is defined in schema.prisma. A duplicate insert
   * (same webhook delivery mapped twice, e.g. via manual replay) resolves
   * to the existing row instead of throwing, mirroring
   * WebhookDeliveryRepository's dedupe-by-externalDeliveryId pattern one
   * layer up.
   */
  async createIfNew(
    input: CreateWorkspaceEventInput,
  ): Promise<{ event: WorkspaceEvent; created: boolean }> {
    const existing = await this.prisma.workspaceEvent.findUnique({
      where: {
        provider_idempotencyKey: { provider: input.provider, idempotencyKey: input.idempotencyKey },
      },
    });
    if (existing !== null) {
      return { event: existing, created: false };
    }
    const event = await this.prisma.workspaceEvent.create({
      data: {
        connectorId: input.connectorId,
        provider: input.provider,
        eventType: input.eventType,
        resourceType: input.resourceType,
        resourceExternalId: input.resourceExternalId,
        occurredAt: input.occurredAt,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey,
        payload: input.payload,
        payloadHash: input.payloadHash,
        sourceDeliveryId: input.sourceDeliveryId,
      },
    });
    return { event, created: true };
  }

  async markStatus(
    id: string,
    status: WorkspaceEventProcessingStatus,
    processingError: string | null = null,
  ): Promise<void> {
    await this.prisma.workspaceEvent.update({
      where: { id },
      data: { processingStatus: status, processingError },
    });
  }

  async list(filters: ListWorkspaceEventFilters): Promise<WorkspaceEvent[]> {
    const where: Prisma.WorkspaceEventWhereInput = {};
    if (filters.provider !== undefined) where.provider = filters.provider;
    if (filters.eventType !== undefined) where.eventType = filters.eventType;
    if (filters.connectorId !== undefined) where.connectorId = filters.connectorId;
    return this.prisma.workspaceEvent.findMany({
      where,
      take: filters.limit ?? 50,
      orderBy: { receivedAt: 'desc' },
    });
  }
}
