'use client';

import type { ReactElement } from 'react';

import { WebhookDeliveryRow } from '@/components/admin/webhook-delivery-row';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SIGNATURE_FILTER_ANY,
  SIGNATURE_FILTER_INVALID,
  SIGNATURE_FILTER_VALID,
} from '@/constants/admin-webhooks.constants';
import { useWebhookDeliveriesPage } from '@/hooks/admin/use-webhook-deliveries';
import { useTranslation } from '@/lib/i18n';

export default function AdminWebhookDeliveriesPage(): ReactElement {
  const { t } = useTranslation();
  const {
    deliveries,
    isLoading,
    isError,
    error,
    filter,
    setFilter,
    replayingId,
    onReplay,
    mutationError,
    clearMutationError,
    onRetry,
  } = useWebhookDeliveriesPage();

  const hasFilters =
    (filter.provider !== undefined && filter.provider.length > 0) ||
    (filter.connectorId !== undefined && filter.connectorId.length > 0) ||
    filter.signatureValid !== undefined;

  let signatureSelectValue: string = SIGNATURE_FILTER_ANY;
  if (filter.signatureValid === true) {
    signatureSelectValue = SIGNATURE_FILTER_VALID;
  } else if (filter.signatureValid === false) {
    signatureSelectValue = SIGNATURE_FILTER_INVALID;
  }

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
        <Select
          value={signatureSelectValue}
          onValueChange={(value: string) => {
            if (value === SIGNATURE_FILTER_VALID) {
              setFilter({ ...filter, signatureValid: true });
            } else if (value === SIGNATURE_FILTER_INVALID) {
              setFilter({ ...filter, signatureValid: false });
            } else {
              setFilter({ ...filter, signatureValid: undefined });
            }
          }}
        >
          <SelectTrigger
            className="max-w-xs"
            aria-label={t('adminWebhooks.filter.signaturePlaceholder')}
          >
            <SelectValue placeholder={t('adminWebhooks.filter.signaturePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SIGNATURE_FILTER_ANY}>
              {t('adminWebhooks.filter.signatureAny')}
            </SelectItem>
            <SelectItem value={SIGNATURE_FILTER_VALID}>
              {t('adminWebhooks.filter.signatureValid')}
            </SelectItem>
            <SelectItem value={SIGNATURE_FILTER_INVALID}>
              {t('adminWebhooks.filter.signatureInvalid')}
            </SelectItem>
          </SelectContent>
        </Select>
        {hasFilters ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setFilter({})}
            aria-label={t('adminWebhooks.filter.clear')}
          >
            {t('adminWebhooks.filter.clear')}
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('adminWebhooks.page.loading')}</p>
      ) : null}

      {isError ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span>{error?.message ?? t('adminWebhooks.page.error')}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRetry}
            aria-label={t('adminAutomation.retry')}
          >
            {t('adminAutomation.retry')}
          </Button>
        </div>
      ) : null}

      {mutationError !== null ? (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <span>{mutationError.message || t('adminWebhooks.replayFailed')}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={clearMutationError}
            aria-label={t('adminAutomation.dismiss')}
          >
            {t('adminAutomation.dismiss')}
          </Button>
        </div>
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
              isReplaying={replayingId === d.id}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
