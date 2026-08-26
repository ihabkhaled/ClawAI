import type { Prisma, WorkspaceObjectType, WorkspaceProvider } from '../../../generated/prisma';

export type CreateWorkspaceEventInput = {
  connectorId: string | null;
  provider: WorkspaceProvider;
  eventType: string;
  resourceType: WorkspaceObjectType | null;
  resourceExternalId: string | null;
  occurredAt: Date | null;
  correlationId: string;
  idempotencyKey: string;
  payload: Prisma.InputJsonValue;
  payloadHash: string;
  sourceDeliveryId: string | null;
};

export type ListWorkspaceEventFilters = {
  provider?: WorkspaceProvider;
  eventType?: string;
  connectorId?: string;
  limit?: number;
};
