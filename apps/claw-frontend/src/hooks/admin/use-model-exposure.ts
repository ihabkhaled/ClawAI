'use client';

import { useCallback, useMemo, useState } from 'react';

import { EMPTY_MODEL_EXPOSURE_FILTERS } from '@/constants/model-exposure.constants';
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
import {
  chunkModelKeys,
  describeModelExposureError,
  removeKeys,
} from '@/utilities/model-exposure.utility';

export function useModelExposure(connectorId: string): UseModelExposureResult {
  const [rows, setRows] = useState<ConnectorModelRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ModelExposureFilters>({
    ...EMPTY_MODEL_EXPOSURE_FILTERS,
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fetched = await fetchConnectorModels(connectorId);
      setRows(fetched);
    } catch (err) {
      setErrorMessage(describeModelExposureError(err));
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

  // Applies to an explicit key list: the bulk bar passes the selection, a
  // row's action menu passes one key. Only the applied keys leave the
  // selection, so a single-row action keeps the operator's bulk selection.
  const applyTo = useCallback(
    async (modelKeys: string[], exposed: boolean) => {
      // Must not fire with an empty key list.
      if (modelKeys.length === 0) {
        return;
      }
      setIsSaving(true);
      setErrorMessage(null);
      // The backend caps one request at MODEL_EXPOSURE_BATCH_SIZE models so a
      // single call can't rewrite an entire catalog unaudited. "Select all
      // shown" can pick far more than that (a connector can carry hundreds
      // of models), so a bulk apply goes out as sequential batches instead
      // of one oversized request.
      const batches = chunkModelKeys(modelKeys);
      let appliedKeys = 0;
      try {
        for (const batch of batches) {
          await setModelExposure(connectorId, { modelKeys: batch, exposed });
          appliedKeys += batch.length;
        }
        // After a successful apply, reload from the server rather than
        // mutating local state, so the screen shows what the server actually
        // did rather than what was requested.
        const refreshed = await fetchConnectorModels(connectorId);
        setRows(refreshed);
        setSelected((prev) => removeKeys(prev, modelKeys));
      } catch (err) {
        // A batch partway through failing still applied everything before
        // it — say so, and leave the remaining selection intact so the
        // operator can retry just what didn't land.
        const prefix =
          appliedKeys > 0 ? `Applied ${String(appliedKeys)} model(s) before this failed — ` : '';
        setErrorMessage(`${prefix}${describeModelExposureError(err)}`);
        if (appliedKeys > 0) {
          const refreshed = await fetchConnectorModels(connectorId).catch(() => null);
          if (refreshed !== null) {
            setRows(refreshed);
          }
        }
      } finally {
        setIsSaving(false);
      }
    },
    [connectorId],
  );

  const apply = useCallback(
    (exposed: boolean) => applyTo(Array.from(selected), exposed),
    [applyTo, selected],
  );

  const resetFilters = useCallback(() => setFilters({ ...EMPTY_MODEL_EXPOSURE_FILTERS }), []);

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
    applyTo,
    resetFilters,
  };
}
