import type { WebhookDeliveryStatus } from '../enums/webhook-delivery-status.enum';

import type { TranslateFunction } from './i18n.types';

export type WebhookDelivery = {
  id: string;
  provider: string;
  connectorId: string | null;
  externalDeliveryId: string | null;
  eventType: string | null;
  signatureValid: boolean;
  signature: string | null;
  errorMessage: string | null;
  ipAddress: string | null;
  bodyBytes: number;
  createdAt: string;
  processedAt: string | null;
};

export type WebhookDeliveryFilter = {
  provider?: string;
  connectorId?: string;
  signatureValid?: boolean;
};

export type ListWebhookDeliveriesQuery = WebhookDeliveryFilter & {
  limit?: number;
};

export type WebhookDeliveryRowProps = {
  delivery: WebhookDelivery;
  onReplay: (id: string) => void;
  isReplaying: boolean;
  t: TranslateFunction;
};

export type UseWebhookDeliveriesPageResult = {
  deliveries: WebhookDelivery[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  filter: WebhookDeliveryFilter;
  setFilter: (next: WebhookDeliveryFilter) => void;
  isReplaying: boolean;
  replayingId: string | null;
  onReplay: (id: string) => void;
  mutationError: Error | null;
  clearMutationError: () => void;
  onRetry: () => void;
};

export type WebhookDeliveryStatusInfo = {
  status: WebhookDeliveryStatus;
  styleClass: string;
  labelKey: string;
};
