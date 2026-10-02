import { useCallback, useMemo } from 'react';

import { MODEL_COST_PAGE_SIZE } from '@/constants/model-cost.constants';
import { ModelPricingSource } from '@/enums/model-pricing-source.enum';
import { useIncrementalList } from '@/hooks/common/use-incremental-list';
import { useTranslation } from '@/lib/i18n';
import type { UseModelCostsPageResult } from '@/types/model-cost.types';
import { filterRowsByBilling } from '@/utilities/model-billing.utility';
import {
  buildModelCostListResetKey,
  countActiveModelCostFilters,
} from '@/utilities/model-cost-filter.utility';
import {
  countModelCostRowsBySource,
  filterModelCostRows,
  sortModelCostRowsByAttention,
} from '@/utilities/model-cost.utility';

import { useModelCostBilling } from './use-model-cost-billing';
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
  const billing = useModelCostBilling(catalog.rows);
  const dialog = useModelCostEditDialog();
  const publish = usePublishModelCost(dialog.close);

  const counts = useMemo(() => countModelCostRowsBySource(catalog.rows), [catalog.rows]);
  const filtered = useMemo(
    () =>
      sortModelCostRowsByAttention(
        filterRowsByBilling(
          filterModelCostRows(catalog.rows, filters.sourceFilter, filters.search),
          billing.billingFilter,
          billing.policy,
        ),
      ),
    [catalog.rows, filters.sourceFilter, filters.search, billing.billingFilter, billing.policy],
  );
  const list = useIncrementalList(
    filtered,
    buildModelCostListResetKey(filters.sourceFilter, billing.billingFilter, filters.search),
    MODEL_COST_PAGE_SIZE,
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
    rows: list.visible,
    filteredCount: list.totalCount,
    hasMore: list.hasMore,
    onShowMore: list.showMore,
    totalCount: catalog.rows.length,
    counts,
    needsAttentionCount:
      counts[ModelPricingSource.PROVIDER_FALLBACK] + counts[ModelPricingSource.UNPRICED],
    sourceFilter: filters.sourceFilter,
    onSourceFilterChange: filters.setSourceFilter,
    search: filters.search,
    onSearchChange: filters.setSearch,
    billingFilter: billing.billingFilter,
    onBillingFilterChange: billing.setBillingFilter,
    billingCounts: billing.counts,
    resolveBilling: billing.resolveBilling,
    isPolicyError: billing.isPolicyError,
    activeFilterCount: countActiveModelCostFilters(filters.sourceFilter, billing.billingFilter),
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
