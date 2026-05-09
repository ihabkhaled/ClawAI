import { apiClient } from '../../services/shared/api-client';
import type {
  ListWebhookDeliveriesQuery,
  WebhookDelivery,
} from '../../types/webhook-delivery.types';

const BASE = '/workspace/webhooks/deliveries';

export async function listWebhookDeliveries(
  query: ListWebhookDeliveriesQuery,
): Promise<WebhookDelivery[]> {
  const params = new URLSearchParams();
  if (query.provider !== undefined && query.provider.length > 0) {
    params.set('provider', query.provider);
  }
  if (query.connectorId !== undefined && query.connectorId.length > 0) {
    params.set('connectorId', query.connectorId);
  }
  if (query.status !== undefined) {
    params.set('status', query.status);
  }
  if (query.limit !== undefined) {
    params.set('limit', String(query.limit));
  }
  const url = params.toString().length > 0 ? `${BASE}?${params.toString()}` : BASE;
  const response = await apiClient.get<WebhookDelivery[]>(url);
  return response.data;
}

export async function replayWebhookDelivery(id: string): Promise<{ deliveryId: string }> {
  const response = await apiClient.post<{ deliveryId: string }>(
    `${BASE}/${encodeURIComponent(id)}/replay`,
  );
  return response.data;
}
