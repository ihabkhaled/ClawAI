'use client';

import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import type { WebhookDeliveryRowProps } from '@/types/webhook-delivery.types';

export function WebhookDeliveryRow({
  delivery,
  onReplay,
  isReplaying,
  t,
}: WebhookDeliveryRowProps): ReactElement {
  let statusStyle = 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400';
  let statusLabel: string = t('adminWebhooks.status.idempotent');
  if (delivery.signatureValid && delivery.errorMessage === null) {
    statusStyle = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    statusLabel = t('adminWebhooks.status.accepted');
  } else if (delivery.errorMessage !== null) {
    statusStyle = 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400';
    statusLabel = t('adminWebhooks.status.rejected');
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-semibold">
          {delivery.provider}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusStyle}`}
        >
          {statusLabel}
        </span>
        <span className="text-xs text-muted-foreground">{delivery.eventType ?? '—'}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {new Date(delivery.receivedAt).toLocaleString()}
        </span>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-3">
        <div>
          <span className="font-semibold text-foreground">{t('adminWebhooks.row.deliveryId')}</span>:{' '}
          <code className="rounded bg-muted px-1">{delivery.externalDeliveryId ?? delivery.id}</code>
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
      {delivery.errorMessage !== null ? (
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
        >
          {t('adminWebhooks.replay')}
        </Button>
      </div>
    </div>
  );
}
