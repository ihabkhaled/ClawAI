import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import { workspaceProviderRegistryRepository } from '@/repositories/workspace/provider-registry.repository';
import type {
  CreateProviderAppConfigRequest,
  UpdateProviderAppConfigRequest,
  UseCreateProviderAppConfigReturn,
  UseDeleteProviderAppConfigReturn,
  UseInitOAuthReturn,
  UseProviderAppConfigsReturn,
  UseTestConnectionReturn,
  UseUpdateProviderAppConfigReturn,
} from '@/types';

export function useProviderAppConfigs(provider?: string): UseProviderAppConfigsReturn {
  const query = useQuery({
    queryKey: queryKeys.workspaceProviderAppConfigs.list(provider),
    queryFn: () => workspaceProviderRegistryRepository.listAppConfigs(provider),
    staleTime: 10_000,
  });

  return {
    configs: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useCreateProviderAppConfig(): UseCreateProviderAppConfigReturn {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: CreateProviderAppConfigRequest) =>
      workspaceProviderRegistryRepository.createAppConfig(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.workspaceProviderAppConfigs.all });
    },
  });
  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}

export function useUpdateProviderAppConfig(): UseUpdateProviderAppConfigReturn {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProviderAppConfigRequest }) =>
      workspaceProviderRegistryRepository.updateAppConfig(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.workspaceProviderAppConfigs.all });
    },
  });
  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}

export function useDeleteProviderAppConfig(): UseDeleteProviderAppConfigReturn {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) => workspaceProviderRegistryRepository.deleteAppConfig(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.workspaceProviderAppConfigs.all });
    },
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}

export function useTestConnection(): UseTestConnectionReturn {
  const mutation = useMutation({
    mutationFn: (input: { provider: string; providerAppConfigId: string }) =>
      workspaceProviderRegistryRepository.testAppConfigConnection(input),
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
    lastResult: mutation.data,
  };
}

export function useInitOAuth(): UseInitOAuthReturn {
  const mutation = useMutation({
    mutationFn: (input: {
      provider: string;
      providerAppConfigId: string;
      redirectUri: string;
      scopes?: string[];
    }) => workspaceProviderRegistryRepository.initOAuth(input),
  });
  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}
