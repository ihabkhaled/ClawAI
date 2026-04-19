import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { discoveryRepository } from '@/repositories/ollama/discovery.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { HardwarePacksQueryResult, InstallPackMutationResult } from '@/types';

export function useHardwarePacks(): HardwarePacksQueryResult {
  const query = useQuery({
    queryKey: queryKeys.discovery.packs.all,
    queryFn: () => discoveryRepository.listPacks(),
    staleTime: 60_000,
  });

  return {
    packs: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useInstallPack(): InstallPackMutationResult {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (profile: string) => discoveryRepository.installPack(profile),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.pullJobs.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.discovery.packs.all });
    },
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
    lastResult: mutation.data,
  };
}
