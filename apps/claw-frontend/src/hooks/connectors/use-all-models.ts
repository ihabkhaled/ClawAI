import { useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { ConnectorProvider } from '@/enums';
import { connectorRepository } from '@/repositories/connectors/connector.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ConnectorModel } from '@/types';
import { logger } from '@/utilities';

import { useConnectors } from './use-connectors';

export function useAllModels() {
  const { connectors, isLoading: isLoadingConnectors } = useConnectors();
  const [providerFilter, setProviderFilter] = useState<ConnectorProvider | null>(null);
  const [lifecycleFilter, setLifecycleFilter] = useState('');

  const modelQueries = useQueries({
    queries: connectors.map((connector) => ({
      queryKey: queryKeys.connectors.models(connector.id),
      queryFn: () => {
        logger.debug({ component: 'connectors', action: 'fetch-connector-models', message: 'Fetching models for connector', details: { connectorId: connector.id } });
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

  return {
    models: filteredModels,
    totalModels: allModels.length,
    isLoading: isLoadingConnectors || isLoadingModels,
    isError,
    providerFilter,
    setProviderFilter,
    lifecycleFilter,
    setLifecycleFilter,
  };
}
