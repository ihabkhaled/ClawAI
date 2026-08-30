import { useCallback, useMemo } from 'react';

import { ModelPricingSource } from '@/enums/model-pricing-source.enum';
import { useTranslation } from '@/lib/i18n';
import type { UseModelCostsPageResult } from '@/types/model-cost.types';
import {
  countModelCostRowsBySource,
  filterModelCostRows,
  sortModelCostRowsByAttention,
} from '@/utilities/model-cost.utility';

import { useModelCostCatalog } from './use-model-cost-catalog';
import { useModelCostEditDialog } from './use-model-cost-edit-dialog';
import { useModelCostFilters } from './use-model-cost-filters';
import { usePublishModelCost } from './use-publish-model-cost';

/**
 * Controller for /admin/smart-router/model-costs.
 *
 * Counts come from the WHOLE catalogue, never from the filtered rows: the
 * banner's job is to say how much work is left, and filtering to PUBLISHED
 * must not report that zero models are on a fallback.
 */
export function useModelCostsPage(): UseModelCostsPageResult {
  const { t } = useTranslation();
  const catalog = useModelCostCatalog();
  const filters = useModelCostFilters();
  const dialog = useModelCostEditDialog();
  const publish = usePublishModelCost(dialog.close);

  const counts = useMemo(() => countModelCostRowsBySource(catalog.rows), [catalog.rows]);
  const rows = useMemo(
    () =>
      sortModelCostRowsByAttention(
        filterModelCostRows(catalog.rows, filters.sourceFilter, filters.search),
      ),
    [catalog.rows, filters.sourceFilter, filters.search],
  );

  const onDialogOpenChange = useCallback(
    (open: boolean): void => {
      publish.reset();
      dialog.setOpen(open);
    },
    [publish, dialog],
  );

  return {
    t,
    rows,
    totalCount: catalog.rows.length,
    counts,
    needsAttentionCount:
      counts[ModelPricingSource.PROVIDER_FALLBACK] + counts[ModelPricingSource.UNPRICED],
    sourceFilter: filters.sourceFilter,
    onSourceFilterChange: filters.setSourceFilter,
    search: filters.search,
    onSearchChange: filters.setSearch,
    isLoading: catalog.isLoading,
    isFetching: catalog.isFetching,
    isError: catalog.isError,
    error: catalog.error,
    onRetry: catalog.refetch,
    editing: dialog.editing,
    isDialogOpen: dialog.isOpen,
    onEdit: dialog.open,
    onDialogOpenChange,
    onSubmit: publish.publish,
    isPublishing: publish.isPending,
    publishError: publish.error,
  };
}
