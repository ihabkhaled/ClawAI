import { useQueries } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ModelCatalogViewMode } from '@/enums';
import type { ConnectorProvider } from '@/enums';
import { connectorRepository } from '@/repositories/connectors/connector.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ConnectorModel } from '@/types';
import { logger, readPersistedModelViewMode, writePersistedModelViewMode } from '@/utilities';

import { useConnectors } from './use-connectors';

export function useAllModels() {
  const { connectors, isLoading: isLoadingConnectors } = useConnectors();
  const [providerFilter, setProviderFilter] = useState<ConnectorProvider | null>(null);
  const [lifecycleFilter, setLifecycleFilter] = useState('');
  const [viewMode, setViewModeInternal] = useState<ModelCatalogViewMode>(ModelCatalogViewMode.TABLE);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<Set<string>>(() => new Set());

  // Hydrate the persisted view mode after mount so SSR + client agree on the
  // initial render. We can't read localStorage during useState() because the
  // first render happens on the server.
  useEffect(() => {
    setViewModeInternal(readPersistedModelViewMode());
  }, []);

  const setViewMode = useCallback((mode: ModelCatalogViewMode): void => {
    setViewModeInternal(mode);
    writePersistedModelViewMode(mode);
  }, []);

  const modelQueries = useQueries({
    queries: connectors.map((connector) => ({
      queryKey: queryKeys.connectors.models(connector.id),
      queryFn: () => {
        logger.debug({
          component: 'connectors',
          action: 'fetch-connector-models',
          message: 'Fetching models for connector',
          details: { connectorId: connector.id },
        });
        return connectorRepository.getModels(connector.id);
      },
      enabled: connectors.length > 0,
    })),
  });

  const isLoadingModels = modelQueries.some((q) => q.isLoading);
  const isError = modelQueries.some((q) => q.isError);

  const allModels: ConnectorModel[] = useMemo(() => {
    const models: ConnectorModel[] = [];
    for (const query of modelQueries) {
      if (query.data) {
        models.push(...query.data);
      }
    }
    return models;
  }, [modelQueries]);

  const filteredModels = useMemo(() => {
    let result = allModels;
    if (providerFilter) {
      result = result.filter((m) => m.provider === providerFilter);
    }
    if (lifecycleFilter) {
      result = result.filter((m) => m.lifecycle === lifecycleFilter);
    }
    return result;
  }, [allModels, providerFilter, lifecycleFilter]);

  const toggleCompareMode = useCallback((): void => {
    setIsCompareMode((prev) => {
      // Leaving compare mode also clears the selection so the next time the
      // user flips it on they start fresh — sticky selection across toggles
      // is a recurring source of "why is X already checked?" UI bug reports.
      if (prev) {
        setCompareSelection(new Set());
      }
      return !prev;
    });
  }, []);

  const toggleCompareModel = useCallback((modelId: string): void => {
    setCompareSelection((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  }, []);

  const clearCompareSelection = useCallback((): void => {
    setCompareSelection(new Set());
  }, []);

  const clearAllFilters = useCallback((): void => {
    setProviderFilter(null);
    setLifecycleFilter('');
  }, []);

  const selectedModels = useMemo(
    () => allModels.filter((m) => compareSelection.has(m.id)),
    [allModels, compareSelection],
  );

  return {
    models: filteredModels,
    totalModels: allModels.length,
    isLoading: isLoadingConnectors || isLoadingModels,
    isError,
    providerFilter,
    setProviderFilter,
    lifecycleFilter,
    setLifecycleFilter,
    viewMode,
    setViewMode,
    isCompareMode,
    toggleCompareMode,
    compareSelection,
    toggleCompareModel,
    clearCompareSelection,
    clearAllFilters,
    selectedModels,
  };
}
