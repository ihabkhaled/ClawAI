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
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-semibold">
          {delivery.provider}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusInfo.styleClass}`}
          aria-label={statusLabel}
        >
          {statusLabel}
        </span>
        <span className="text-xs text-muted-foreground">{delivery.eventType ?? '—'}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {formatDateTimeSafe(delivery.createdAt)}
        </span>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-3">
        <div>
          <span className="font-semibold text-foreground">{t('adminWebhooks.row.deliveryId')}</span>
          :{' '}
          <code className="rounded bg-muted px-1">
            {delivery.externalDeliveryId ?? delivery.id}
          </code>
        </div>
        <div>
          <span className="font-semibold text-foreground">{t('adminWebhooks.row.connector')}</span>:{' '}
          <code className="rounded bg-muted px-1">{delivery.connectorId ?? '—'}</code>
        </div>
        <div>
          <span className="font-semibold text-foreground">{t('adminWebhooks.row.bytes')}</span>:{' '}
          {delivery.bodyBytes}
        </div>
      </div>
      {delivery.processedAt !== null ? (
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {t('adminWebhooks.row.processedAt')}
          </span>
          : {formatDateTimeSafe(delivery.processedAt)}
        </div>
      ) : null}
      {delivery.errorMessage !== null && delivery.errorMessage !== '' ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
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
