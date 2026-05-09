'use client';

import type { ReactElement } from 'react';

import { WebhookDeliveryRow } from '@/components/admin/webhook-delivery-row';
import { PageHeader } from '@/components/common/page-header';
import { Input } from '@/components/ui/input';
import { useWebhookDeliveriesPage } from '@/hooks/admin/use-webhook-deliveries';
import { useTranslation } from '@/lib/i18n';

export default function AdminWebhookDeliveriesPage(): ReactElement {
  const { t } = useTranslation();
  const { deliveries, isLoading, isError, error, filter, setFilter, isReplaying, onReplay } =
    useWebhookDeliveriesPage();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={t('adminWebhooks.page.title')}
        description={t('adminWebhooks.page.description')}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={filter.provider ?? ''}
          onChange={(e) => setFilter({ ...filter, provider: e.target.value })}
          placeholder={t('adminWebhooks.filter.providerPlaceholder')}
          aria-label={t('adminWebhooks.filter.providerPlaceholder')}
          className="max-w-xs"
        />
        <Input
          value={filter.connectorId ?? ''}
          onChange={(e) => setFilter({ ...filter, connectorId: e.target.value })}
          placeholder={t('adminWebhooks.filter.connectorPlaceholder')}
          aria-label={t('adminWebhooks.filter.connectorPlaceholder')}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('adminWebhooks.page.loading')}</p>
      ) : null}

      {isError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error?.message ?? t('adminWebhooks.page.error')}
        </p>
      ) : null}

      {!isLoading && !isError && deliveries.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {t('adminWebhooks.page.empty')}
        </p>
      ) : null}

      {deliveries.length > 0 ? (
        <div className="flex flex-col gap-2">
          {deliveries.map((d) => (
            <WebhookDeliveryRow
              key={d.id}
              delivery={d}
              onReplay={onReplay}
              isReplaying={isReplaying}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
