import { useCallback, useMemo, useState } from 'react';

import { EMPTY_EXPLORER_FILTERS } from '@/constants/observability-explorer.constants';
import { USAGE_DEFAULT_HOURS } from '@/constants/usage-analytics.constants';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import type { UsageRangeSelection } from '@/types/admin-usage-analytics.types';
import type {
  ExplorerFilters,
  ObservabilityInitialState,
  UseObservabilityFiltersReturn,
} from '@/types/observability-explorer.types';
import { buildExplorerParams, selectionToHours } from '@/utilities/observability-explorer.utility';
import { validateSelection } from '@/utilities/usage-analytics.utility';

const DEFAULT_SELECTION: UsageRangeSelection = {
  preset: UsageRangePreset.Week,
  hours: USAGE_DEFAULT_HOURS,
  customFrom: '',
  customTo: '',
};

/**
 * Period and filters shared by every section of the Observability page (and
 * reused, with its own state, by the per-user dialog).
 *
 * Rolling presets and the provider / model / workflow / billing selects apply at
 * once. Hours and custom dates are a DRAFT sent on Apply, so typing "1", "12",
 * "120" fires one query, not three; an invalid draft is never sent.
 */
export function useObservabilityFilters(
  initial?: ObservabilityInitialState,
): UseObservabilityFiltersReturn {
  const [draft, setDraft] = useState<UsageRangeSelection>(initial?.selection ?? DEFAULT_SELECTION);
  const [applied, setApplied] = useState<UsageRangeSelection>(
    initial?.selection ?? DEFAULT_SELECTION,
  );
  const [filters, setFilters] = useState<ExplorerFilters>(
    initial?.filters ?? EMPTY_EXPLORER_FILTERS,
  );

  const issue = useMemo(() => validateSelection(draft), [draft]);

  const setPreset = useCallback((preset: UsageRangePreset): void => {
    setDraft((current) => ({ ...current, preset }));
    if (preset !== UsageRangePreset.Hours && preset !== UsageRangePreset.Custom) {
      setApplied((current) => ({ ...current, preset }));
    }
  }, []);
  const setHours = useCallback((value: string): void => {
    setDraft((current) => ({ ...current, hours: Number(value) }));
  }, []);
  const setCustomFrom = useCallback((value: string): void => {
    setDraft((current) => ({ ...current, customFrom: value }));
  }, []);
  const setCustomTo = useCallback((value: string): void => {
    setDraft((current) => ({ ...current, customTo: value }));
  }, []);
  const setFilter = useCallback((name: keyof ExplorerFilters, value: string): void => {
    setFilters((current) => ({ ...current, [name]: value }));
  }, []);
  const clearFilters = useCallback((): void => {
    setFilters(EMPTY_EXPLORER_FILTERS);
  }, []);
  const apply = useCallback((): void => {
    if (issue === null) {
      setApplied(draft);
    }
  }, [draft, issue]);

  const scope = useMemo(
    () => ({
      selection: applied,
      filters,
      buildParams: () => buildExplorerParams(applied, filters, new Date()),
      buildRangeParams: () => buildExplorerParams(applied, EMPTY_EXPLORER_FILTERS, new Date()),
      buildHours: (maxHours: number) => selectionToHours(applied, new Date(), maxHours),
    }),
    [applied, filters],
  );

  return {
    draft,
    filters,
    issue,
    scope,
    setPreset,
    setHours,
    setCustomFrom,
    setCustomTo,
    setFilter,
    apply,
    clearFilters,
  };
}
