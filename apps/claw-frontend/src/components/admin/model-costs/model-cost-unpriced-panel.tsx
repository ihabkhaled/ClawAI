'use client';

import { CircleDollarSign, SearchX } from 'lucide-react';
import type { ReactElement } from 'react';

import { ModelBillingCell } from '@/components/admin/model-billing/model-billing-cell';
import { ModelCostSourceBadge } from '@/components/admin/model-costs/model-cost-source-badge';
import { DataTable } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { BadgeVariant } from '@/enums/badge-variant.enum';
import type { DataTableColumn } from '@/types/component.types';
import type { ModelCostUnpricedPanelProps, UnpricedModelRow } from '@/types/model-cost.types';
import { unpricedRowToCatalogRow } from '@/utilities/model-cost-unpriced.utility';

/**
 * Exposed models still waiting on a real price. Models from a connector that
 * routing has no registry row for are listed too, flagged "Not in registry":
 * they are exactly the ones nobody would otherwise notice.
 */
export function ModelCostUnpricedPanel({
  unpriced,
  onPrice,
  resolveBilling,
  t,
}: ModelCostUnpricedPanelProps): ReactElement {
  const columns: DataTableColumn<UnpricedModelRow>[] = [
    {
      key: 'model',
      header: t('adminModelCosts.unpriced.model'),
      render: (row) => (
        <div className="flex min-w-0 flex-col items-start gap-1">
          <span className="block font-medium break-all">{row.displayName ?? row.modelKey}</span>
          <span className="text-muted-foreground block text-xs break-all">{row.modelKey}</span>
          {row.inRegistry ? null : (
            <Badge
              variant={BadgeVariant.OUTLINE}
              title={t('adminModelCosts.unpriced.notInRegistryHint')}
              data-testid="not-in-registry"
            >
              {t('adminModelCosts.unpriced.notInRegistry')}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'provider',
      header: t('adminModelCosts.unpriced.provider'),
      render: (row) => <span className="break-words">{row.provider}</span>,
    },
    {
      key: 'state',
      header: t('adminModelCosts.unpriced.state'),
      render: (row) => <ModelCostSourceBadge source={row.pricingSource} t={t} />,
    },
    {
      key: 'billing',
      header: t('adminModelCosts.unpriced.billing'),
      render: (row) => (
        <ModelBillingCell
          billing={resolveBilling(unpricedRowToCatalogRow(row))}
          provider={row.provider}
          t={t}
        />
      ),
    },
    {
      key: 'actions',
      header: t('adminModelCosts.unpriced.actions'),
      className: 'text-end',
      render: (row) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="touch:min-h-11"
          onClick={() => onPrice(row)}
          aria-label={t('adminModelCosts.unpriced.setPriceFor', { model: row.modelKey })}
        >
          {t('adminModelCosts.unpriced.setPrice')}
        </Button>
      ),
    },
  ];

  const isSearching = unpriced.search.trim() !== '';
  const isSettled = !unpriced.isLoading && !unpriced.isError;

  return (
    <div className="flex min-w-0 flex-col gap-4" data-testid="model-cost-unpriced-panel">
      <Input
        type="search"
        value={unpriced.search}
        placeholder={t('adminModelCosts.unpriced.searchPlaceholder')}
        aria-label={t('adminModelCosts.unpriced.searchPlaceholder')}
        onChange={(event) => unpriced.onSearchChange(event.target.value)}
        className="min-w-0 sm:max-w-sm"
      />

      {unpriced.isLoading ? <Skeleton className="h-64 w-full" /> : null}

      {unpriced.isError ? (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
          role="alert"
        >
          <span>{unpriced.error?.message ?? t('adminModelCosts.unpriced.error')}</span>
          <Button type="button" size="sm" variant="outline" onClick={unpriced.onRetry}>
            {t('adminModelCosts.unpriced.retry')}
          </Button>
        </div>
      ) : null}

      {isSettled && unpriced.total === 0 ? (
        <EmptyState
          icon={isSearching ? SearchX : CircleDollarSign}
          title={
            isSearching
              ? t('adminModelCosts.unpriced.noMatchTitle')
              : t('adminModelCosts.unpriced.emptyTitle')
          }
          description={
            isSearching
              ? t('adminModelCosts.unpriced.noMatchDescription')
              : t('adminModelCosts.unpriced.emptyDescription')
          }
        />
      ) : null}

      {isSettled && unpriced.total > 0 ? (
        <>
          <p className="text-muted-foreground text-sm tabular-nums">
            {t('adminModelCosts.unpriced.summary', { total: unpriced.total })}
          </p>
          <DataTable
            columns={columns}
            data={unpriced.rows}
            keyExtractor={(row) => `${row.provider}:${row.modelKey}`}
            mobileTitleKey="model"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="touch:min-h-11"
              disabled={unpriced.page <= 1}
              onClick={unpriced.onPreviousPage}
            >
              {t('adminModelCosts.unpriced.previous')}
            </Button>
            <span className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
              {t('adminModelCosts.unpriced.pageOf', {
                page: unpriced.page,
                pages: unpriced.totalPages,
              })}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="touch:min-h-11"
              disabled={unpriced.page >= unpriced.totalPages}
              onClick={unpriced.onNextPage}
            >
              {t('adminModelCosts.unpriced.next')}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
