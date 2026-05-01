import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

export type WebhookReceivedEvent = {
  deliveryId: string;
  provider: WorkspaceProvider;
  connectorId: string | null;
  externalDeliveryId: string | null;
  eventType: string | null;
  body: Record<string, unknown> | unknown[];
  occurredAt: string;
};
