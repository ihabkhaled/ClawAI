'use client';

import { Pencil } from 'lucide-react';
import type { ReactElement } from 'react';

import { ModelCostSourceBadge } from '@/components/admin/model-costs/model-cost-source-badge';
import { DataTable } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BadgeVariant } from '@/enums/badge-variant.enum';
import type { DataTableColumn } from '@/types/component.types';
import type { ModelCostCatalogRow, ModelCostTableProps } from '@/types/model-cost.types';
import { formatMicroUsdPerMillionAsUsd } from '@/utilities/model-cost.utility';

/**
 * Every exposed model with the rate the wallet would actually charge for it.
 *
 * Rates are rendered from integer micro-USD at the last possible moment and
 * shown in tabular figures so a column of $0.075 and $10.00 stays comparable
 * at a glance. A missing rate renders as a dash, never as $0.00 — an unpriced
 * model is refused, not free.
 */
export function ModelCostTable({ rows, onEdit, t }: ModelCostTableProps): ReactElement {
  const columns: DataTableColumn<ModelCostCatalogRow>[] = [
    {
      key: 'model',
      header: t('adminModelCosts.table.model'),
      render: (row) => (
        <div className="min-w-0">
          <span className="block font-medium break-all">{row.displayName ?? row.modelKey}</span>
          <span className="text-muted-foreground block text-xs break-all">{row.modelKey}</span>
        </div>
      ),
    },
    {
      key: 'provider',
      header: t('adminModelCosts.table.provider'),
      render: (row) => <span className="break-all">{row.provider}</span>,
    },
    {
      key: 'input',
      header: t('adminModelCosts.table.inputRate'),
      className: 'text-end',
      render: (row) => (
        <bdi className="tabular-nums">
          {formatMicroUsdPerMillionAsUsd(row.inputPerMillionMicroUsd) ??
            t('adminModelCosts.table.noRate')}
        </bdi>
      ),
    },
    {
      key: 'output',
      header: t('adminModelCosts.table.outputRate'),
      className: 'text-end',
      render: (row) => (
        <bdi className="tabular-nums">
          {formatMicroUsdPerMillionAsUsd(row.outputPerMillionMicroUsd) ??
            t('adminModelCosts.table.noRate')}
        </bdi>
      ),
    },
    {
      key: 'cachedInput',
      header: t('adminModelCosts.table.cachedInputRate'),
      className: 'text-end',
      render: (row) => (
        <bdi className="tabular-nums">
          {formatMicroUsdPerMillionAsUsd(row.cachedInputPerMillionMicroUsd) ??
            t('adminModelCosts.table.noRate')}
        </bdi>
      ),
    },
    {
      key: 'pricingSource',
      header: t('adminModelCosts.table.pricingSource'),
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          <ModelCostSourceBadge source={row.pricingSource} t={t} />
          {row.isAdminOverride ? (
            <Badge variant={BadgeVariant.OUTLINE}>{t('adminModelCosts.table.override')}</Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'version',
      header: t('adminModelCosts.table.version'),
      className: 'text-end',
      render: (row) => (
        <bdi className="tabular-nums">
          {row.version === 0 ? t('adminModelCosts.table.noVersion') : `v${row.version}`}
        </bdi>
      ),
    },
    {
      key: 'actions',
      header: t('adminModelCosts.table.actions'),
      className: 'text-end',
      render: (row) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onEdit(row)}
          aria-label={t('adminModelCosts.table.editFor', { model: row.modelKey })}
        >
          <Pencil className="me-1 h-3.5 w-3.5" aria-hidden="true" />
          {t('adminModelCosts.table.edit')}
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      keyExtractor={(row) => `${row.provider}:${row.modelKey}`}
      emptyMessage={t('adminModelCosts.table.empty')}
      mobileTitleKey="model"
    />
  );
}
