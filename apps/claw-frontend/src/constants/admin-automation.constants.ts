import { AiActionPolicyKind } from '@/enums/ai-action-policy-kind.enum';
import { WebhookDeliveryStatus } from '@/enums/webhook-delivery-status.enum';

/**
 * Stream 10/13 — Visual styling for AiActionPolicy.kind badges in the admin
 * automation pages. Colour pairs with the translated label so colour is never
 * the sole signal.
 */
export const POLICY_KIND_STYLES: Record<AiActionPolicyKind, string> = {
  [AiActionPolicyKind.DENY]: 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400',
  [AiActionPolicyKind.ALLOW]: 'border-border bg-muted/40',
  [AiActionPolicyKind.AUTO_APPROVE]:
    'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

/**
 * Stream 11.4 — Visual styling for WebhookDelivery status badges shown in the
 * webhook-deliveries admin page.
 */
export const WEBHOOK_STATUS_STYLES: Record<WebhookDeliveryStatus, string> = {
  [WebhookDeliveryStatus.ACCEPTED]:
    'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  [WebhookDeliveryStatus.REJECTED]:
    'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400',
  [WebhookDeliveryStatus.IDEMPOTENT]:
    'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
};
