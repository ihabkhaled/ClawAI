import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { discoveryRepository } from '@/repositories/ollama/discovery.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  ApproveCandidateMutationResult,
  ApproveCandidateRequest,
  BulkApproveMutationResult,
  BulkApproveRequest,
  BulkApproveResponse,
  CandidateListFilters,
  CandidateListResponse,
  CandidatesQueryResult,
  DiscoveryCandidate,
  MutationCallbacks,
  RejectCandidateMutationResult,
  RejectCandidateRequest,
} from '@/types';

export function useDiscoveryCandidates(filters: CandidateListFilters = {}): CandidatesQueryResult {
  const filterKey = filters as unknown as Record<string, unknown>;
  const query = useQuery<CandidateListResponse>({
    queryKey: queryKeys.discovery.candidates.list(filterKey),
    queryFn: () => discoveryRepository.listCandidates(filters),
    refetchInterval: 5_000,
  });

  return {
    candidates: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? 1,
    pageSize: query.data?.pageSize ?? 20,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useApproveCandidate(): ApproveCandidateMutationResult {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveCandidateRequest }) =>
      discoveryRepository.approveCandidate(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.discovery.candidates.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
    },
  });
  return {
    mutate: (
      input: { id: string; data: ApproveCandidateRequest },
      options?: MutationCallbacks<DiscoveryCandidate>,
    ) => {
      mutation.mutate(input, {
        onSuccess: options?.onSuccess,
        onError: options?.onError,
      });
    },
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}

export function useRejectCandidate(): RejectCandidateMutationResult {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectCandidateRequest }) =>
      discoveryRepository.rejectCandidate(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.discovery.candidates.all });
    },
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
  };
}

export function useBulkApproveCandidates(): BulkApproveMutationResult {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: BulkApproveRequest) => discoveryRepository.bulkApprove(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.discovery.candidates.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
    },
  });
  return {
    mutate: (data: BulkApproveRequest, options?: MutationCallbacks<BulkApproveResponse>) => {
      mutation.mutate(data, {
        onSuccess: options?.onSuccess,
        onError: options?.onError,
      });
    },
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
    lastResult: mutation.data,
  };
}
