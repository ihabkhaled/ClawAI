import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { researchRepository } from '@/repositories/research/research.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  CreateResearchProviderRequest,
  ProviderHealthResult,
  SanitizedResearchProvider,
} from '@/types';

export function useResearchProviders(): {
  providers: SanitizedResearchProvider[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  const query = useQuery({
    queryKey: queryKeys.researchProviders.list(),
    queryFn: () => researchRepository.listProviders(),
    staleTime: 30_000,
  });
  return {
    providers: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  };
}

export function useCreateResearchProvider(): {
  mutateAsync: (data: CreateResearchProviderRequest) => Promise<SanitizedResearchProvider>;
  isPending: boolean;
  error: Error | null;
} {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (data: CreateResearchProviderRequest) => researchRepository.createProvider(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.researchProviders.all });
    },
  });
  return { mutateAsync: m.mutateAsync, isPending: m.isPending, error: m.error as Error | null };
}

export function useDeleteResearchProvider(): {
  mutate: (id: string) => void;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (id: string) => researchRepository.deleteProvider(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.researchProviders.all });
    },
  });
  return { mutate: m.mutate, isPending: m.isPending };
}

export function useTestResearchProvider(): {
  mutate: (id: string, options?: { onSuccess?: (result: ProviderHealthResult) => void }) => void;
  isPending: boolean;
  lastResult: ProviderHealthResult | undefined;
} {
  const m = useMutation({
    mutationFn: (id: string) => researchRepository.testProvider(id),
  });
  return {
    mutate: (id, options) => m.mutate(id, options),
    isPending: m.isPending,
    lastResult: m.data,
  };
}
