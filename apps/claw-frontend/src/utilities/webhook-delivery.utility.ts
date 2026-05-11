import { WEBHOOK_STATUS_STYLES } from '@/constants/admin-automation.constants';
import { WebhookDeliveryStatus } from '@/enums/webhook-delivery-status.enum';
import type { WebhookDelivery, WebhookDeliveryStatusInfo } from '@/types/webhook-delivery.types';

const STATUS_LABEL_KEYS: Record<WebhookDeliveryStatus, string> = {
  [WebhookDeliveryStatus.ACCEPTED]: 'adminWebhooks.status.accepted',
  [WebhookDeliveryStatus.REJECTED]: 'adminWebhooks.status.rejected',
  [WebhookDeliveryStatus.IDEMPOTENT]: 'adminWebhooks.status.idempotent',
};

export function deriveWebhookDeliveryStatus(delivery: WebhookDelivery): WebhookDeliveryStatus {
  if (delivery.errorMessage !== null && delivery.errorMessage !== '') {
    return WebhookDeliveryStatus.REJECTED;
  }
  if (delivery.signatureValid) {
    return WebhookDeliveryStatus.ACCEPTED;
  }
  return WebhookDeliveryStatus.IDEMPOTENT;
}

export function getWebhookDeliveryStatusInfo(delivery: WebhookDelivery): WebhookDeliveryStatusInfo {
  const status = deriveWebhookDeliveryStatus(delivery);
  return {
    status,
    styleClass: WEBHOOK_STATUS_STYLES[status],
    labelKey: STATUS_LABEL_KEYS[status],
  };
}
