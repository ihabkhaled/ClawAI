import type { Prisma, WorkspaceProvider } from '../../../generated/prisma';

export type CreateWebhookDeliveryInput = {
  connectorId: string | null;
  provider: WorkspaceProvider;
  externalDeliveryId: string | null;
  eventType: string | null;
  signatureValid: boolean;
  signature: string | null;
  rawPayload: Prisma.InputJsonValue;
  errorMessage: string | null;
  ipAddress: string | null;
  bodyBytes: number;
};

export type ListWebhookDeliveriesFilters = {
  provider?: WorkspaceProvider;
  signatureValid?: boolean;
  connectorId?: string;
  limit: number;
  cursor?: string;
};
