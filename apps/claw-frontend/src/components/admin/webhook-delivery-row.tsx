'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import type { WebhookDeliveryRowProps } from '@/types/webhook-delivery.types';
import { formatDateTimeSafe } from '@/utilities';
import { getWebhookDeliveryStatusInfo } from '@/utilities/webhook-delivery.utility';

export function WebhookDeliveryRow({
  delivery,
  onReplay,
  isReplaying,
  t,
}: WebhookDeliveryRowProps): ReactElement {
  const statusInfo = getWebhookDeliveryStatusInfo(delivery);
  const statusLabel = t(statusInfo.labelKey);
  return (
    <div className="border-border bg-card flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <span className="border-border bg-muted/40 rounded-full border px-2 py-0.5 text-xs font-semibold">
          {delivery.provider}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusInfo.styleClass}`}
          aria-label={statusLabel}
        >
          {statusLabel}
        </span>
        <span className="text-muted-foreground text-xs">{delivery.eventType ?? '—'}</span>
        <span className="text-muted-foreground ml-auto text-xs">
          {formatDateTimeSafe(delivery.createdAt)}
        </span>
      </div>
      <div className="text-muted-foreground grid grid-cols-1 gap-1 text-xs md:grid-cols-3">
        <div>
          <span className="text-foreground font-semibold">{t('adminWebhooks.row.deliveryId')}</span>
          :{' '}
          <code className="bg-muted rounded px-1">
            {delivery.externalDeliveryId ?? delivery.id}
          </code>
        </div>
        <div>
          <span className="text-foreground font-semibold">{t('adminWebhooks.row.connector')}</span>:{' '}
          <code className="bg-muted rounded px-1">{delivery.connectorId ?? '—'}</code>
        </div>
        <div>
          <span className="text-foreground font-semibold">{t('adminWebhooks.row.bytes')}</span>:{' '}
          {delivery.bodyBytes}
        </div>
      </div>
      {delivery.processedAt !== null ? (
        <div className="text-muted-foreground text-xs">
          <span className="text-foreground font-semibold">
            {t('adminWebhooks.row.processedAt')}
          </span>
          : {formatDateTimeSafe(delivery.processedAt)}
        </div>
      ) : null}
      {delivery.errorMessage !== null && delivery.errorMessage !== '' ? (
        <p className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-2 py-1 text-xs">
          {delivery.errorMessage}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onReplay(delivery.id)}
          disabled={isReplaying}
          aria-label={t('adminWebhooks.replay')}
          aria-busy={isReplaying}
        >
          {isReplaying ? t('adminWebhooks.replaying') : t('adminWebhooks.replay')}
        </Button>
      </div>
    </div>
  );
}
