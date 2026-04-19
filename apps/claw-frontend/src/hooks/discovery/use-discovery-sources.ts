import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { discoveryRepository } from '@/repositories/ollama/discovery.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  CreateDiscoverySourceRequest,
  DiscoverySourceMutationResult,
  DiscoverySourcesQueryResult,
  UpdateDiscoverySourceRequest,
} from '@/types';

export function useDiscoverySources(): DiscoverySourcesQueryResult {
  const query = useQuery({
    queryKey: queryKeys.discovery.sources.all,
    queryFn: () => discoveryRepository.listSources(),
    staleTime: 30_000,
  });

  return {
    sources: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useCreateDiscoverySource(): DiscoverySourceMutationResult<CreateDiscoverySourceRequest> {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: CreateDiscoverySourceRequest) => discoveryRepository.createSource(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.discovery.sources.all });
    },
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}

export function useUpdateDiscoverySource(): DiscoverySourceMutationResult<{
  id: string;
  data: UpdateDiscoverySourceRequest;
}> {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDiscoverySourceRequest }) =>
      discoveryRepository.updateSource(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.discovery.sources.all });
    },
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}

export function useDeleteDiscoverySource(): DiscoverySourceMutationResult<string> {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) => discoveryRepository.deleteSource(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.discovery.sources.all });
    },
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}
