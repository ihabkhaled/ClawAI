'use client';

import { useCallback, useMemo, useState } from 'react';

import { ConnectorModelExposure } from '@/enums/connector-model-exposure.enum';
import {
  fetchConnectorModels,
  filterModels,
  setModelExposure,
} from '@/services/admin/model-exposure.service';
import type {
  ConnectorModelRow,
  ModelExposureFilters,
  UseModelExposureResult,
} from '@/types/model-exposure.types';

export function useModelExposure(connectorId: string): UseModelExposureResult {
  const [rows, setRows] = useState<ConnectorModelRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ModelExposureFilters>({
    search: '',
    provider: null,
    exposedOnly: null,
    kind: null,
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fetched = await fetchConnectorModels(connectorId);
      setRows(fetched);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setIsLoading(false);
    }
  }, [connectorId]);

  const setFilter = useCallback(
    <K extends keyof ModelExposureFilters>(key: K, value: ModelExposureFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const visibleRows = useMemo(() => filterModels(rows, filters), [rows, filters]);

  const exposedCount = useMemo(
    () => rows.filter((r) => r.exposure === ConnectorModelExposure.EXPOSED).length,
    [rows],
  );
  const unexposedCount = rows.length - exposedCount;

  // A model whose lifecycle is REMOVED is never selectable. filterModels
  // already drops those from visibleRows; do not add them back here.
  const toggle = useCallback((modelKey: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(modelKey)) {
        next.delete(modelKey);
      } else {
        next.add(modelKey);
      }
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const row of visibleRows) {
        next.add(row.modelKey);
      }
      return next;
    });
  }, [visibleRows]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // For an unexpose, the keys currently EXPOSED among the selection, so the
  // screen can state what is about to be taken away BEFORE the operator
  // confirms rather than after.
  const impact = useMemo(
    () =>
      rows
        .filter((r) => selected.has(r.modelKey) && r.exposure === ConnectorModelExposure.EXPOSED)
        .map((r) => r.modelKey),
    [rows, selected],
  );

  const apply = useCallback(
    async (exposed: boolean) => {
      // apply() must not fire with an empty selection.
      if (selected.size === 0) {
        return;
      }
      setIsSaving(true);
      setErrorMessage(null);
      try {
        await setModelExposure(connectorId, {
          modelKeys: Array.from(selected),
          exposed,
        });
        // After a successful apply, reload from the server rather than
        // mutating local state, so the screen shows what the server actually
        // did rather than what was requested.
        const refreshed = await fetchConnectorModels(connectorId);
        setRows(refreshed);
        clearSelection();
      } catch (err) {
        // Any failure sets errorMessage and leaves the selection intact so
        // the operator can retry without re-picking.
        setErrorMessage(err instanceof Error ? err.message : 'Failed to apply');
      } finally {
        setIsSaving(false);
      }
    },
    [connectorId, selected, clearSelection],
  );

  return {
    rows,
    visibleRows,
    isLoading,
    isSaving,
    errorMessage,
    filters,
    setFilter,
    selected,
    toggle,
    selectAllVisible,
    clearSelection,
    exposedCount,
    unexposedCount,
    impact,
    load,
    apply,
  };
}
