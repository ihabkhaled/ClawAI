import { useCallback, useMemo } from 'react';

import { MODEL_EXPOSURE_PAGE_SIZE } from '@/constants/model-exposure.constants';
import { useIncrementalList } from '@/hooks/common/use-incremental-list';
import { useTranslation } from '@/lib/i18n';
import type { ConnectorModelRow, UseModelExposurePanelResult } from '@/types/model-exposure.types';
import {
  buildModelExposureListResetKey,
  buildModelExposureRowViews,
  fromModelExposureFilterOption,
  hasActiveModelExposureFilters,
  resolveSelectAllState,
} from '@/utilities/model-exposure.utility';

import { useModelExposureSection } from './use-model-exposure-section';
import { useModelExposureUnexposeConfirm } from './use-model-exposure-unexpose-confirm';
import { useProviderCreditPolicy } from './use-provider-credit-policy';

/** Controller for the Model exposure panel: one hook for the whole section. */
export function useModelExposurePanel(connectorId: string): UseModelExposurePanelResult {
  const { t, locale } = useTranslation();
  const exposure = useModelExposureSection(connectorId);
  const credit = useProviderCreditPolicy();
  const unexposeConfirm = useModelExposureUnexposeConfirm(exposure.applyTo);
  const { visibleRows, selected, setFilter, applyTo, clearSelection, selectAllVisible } = exposure;
  const list = useIncrementalList(
    visibleRows,
    buildModelExposureListResetKey(exposure.filters),
    MODEL_EXPOSURE_PAGE_SIZE,
  );
  const items = useMemo(
    () => buildModelExposureRowViews(list.visible, selected, credit.policy, locale),
    [list.visible, selected, credit.policy, locale],
  );
  const selectAllState = resolveSelectAllState(visibleRows, selected);

  const onToggleSelectAll = useCallback(
    () => (selectAllState === true ? clearSelection() : selectAllVisible()),
    [selectAllState, clearSelection, selectAllVisible],
  );
  const onExposeRow = useCallback(
    (row: ConnectorModelRow) => void applyTo([row.modelKey], true),
    [applyTo],
  );

  return {
    t,
    items,
    rowCount: exposure.rows.length,
    filteredCount: list.totalCount,
    hasMore: list.hasMore,
    onShowMore: list.showMore,
    filters: exposure.filters,
    hasActiveFilters: hasActiveModelExposureFilters(exposure.filters),
    onSearchChange: (value) => setFilter('search', value),
    onExposureFilterChange: (value) =>
      setFilter('exposedOnly', fromModelExposureFilterOption(value)),
    onResetFilters: exposure.resetFilters,
    selectedCount: selected.size,
    selectAllState,
    onToggleSelectAll,
    onToggleRow: exposure.toggle,
    onSelectAllVisible: selectAllVisible,
    onClearSelection: clearSelection,
    exposedCount: exposure.exposedCount,
    unexposedCount: exposure.unexposedCount,
    impact: exposure.impact,
    isLoading: exposure.isLoading,
    isSaving: exposure.isSaving,
    errorMessage: exposure.errorMessage,
    isPolicyError: credit.isError,
    onApply: (exposed) => void exposure.apply(exposed),
    onExposeRow,
    unexposeConfirm,
  };
}
