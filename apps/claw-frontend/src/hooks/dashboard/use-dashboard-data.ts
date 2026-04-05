import { useQuery } from '@tanstack/react-query';

import { DASHBOARD_STAT_CARD_DEFAULTS, DASHBOARD_STALE_TIME_MS } from '@/constants/dashboard.constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { connectorRepository } from '@/repositories/connectors/connector.repository';
import { healthRepository } from '@/repositories/health/health.repository';
import { ollamaRepository } from '@/repositories/ollama/ollama.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { DashboardDataResult, DashboardStatCard } from '@/types/dashboard.types';

export function useDashboardData(): DashboardDataResult {
  const threadsQuery = useQuery({
    queryKey: queryKeys.threads.list({ limit: '1' }),
    queryFn: () => chatRepository.getThreads({ limit: '1', page: '1' }),
    staleTime: DASHBOARD_STALE_TIME_MS,
  });

  const connectorsQuery = useQuery({
    queryKey: queryKeys.connectors.list({ limit: '100' }),
    queryFn: () => connectorRepository.getConnectors({ limit: '100' }),
    staleTime: DASHBOARD_STALE_TIME_MS,
  });

  const localModelsQuery = useQuery({
    queryKey: queryKeys.localModels.lists(),
    queryFn: () => ollamaRepository.getLocalModels(),
    staleTime: DASHBOARD_STALE_TIME_MS,
  });

  const healthQuery = useQuery({
    queryKey: queryKeys.health.aggregated,
    queryFn: () => healthRepository.getAggregatedHealth(),
    staleTime: DASHBOARD_STALE_TIME_MS,
  });

  const totalThreads = threadsQuery.data?.meta.total ?? null;
  const activeConnectors =
    connectorsQuery.data?.data.filter((c) => c.isEnabled).length ?? null;
  const installedModels =
    localModelsQuery.data?.data.filter((m) => m.isInstalled).length ?? null;
  const healthSummary = healthQuery.data?.summary ?? null;

  const healthLabel =
    healthSummary !== null
      ? `${String(healthSummary.up)}/${String(healthSummary.total)}`
      : null;

  const statCards: DashboardStatCard[] = DASHBOARD_STAT_CARD_DEFAULTS.map((card, index) => {
    const values = [totalThreads, activeConnectors, installedModels, healthLabel];
    const value = values[index];
    return {
      ...card,
      value: value !== null && value !== undefined ? value : card.value,
    };
  });

  const isLoading =
    threadsQuery.isLoading ||
    connectorsQuery.isLoading ||
    localModelsQuery.isLoading ||
    healthQuery.isLoading;

  const isError =
    threadsQuery.isError ||
    connectorsQuery.isError ||
    localModelsQuery.isError ||
    healthQuery.isError;

  return {
    statCards,
    isLoading,
    isError,
    healthStatus: healthQuery.data?.status ?? null,
    healthServices: healthQuery.data?.services ?? [],
    healthSummary,
  };
}
