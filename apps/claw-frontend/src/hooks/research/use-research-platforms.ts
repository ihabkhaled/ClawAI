import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { researchPlatformRepository } from '@/repositories/research/research-platform.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  CreateResearchPlatformRequest,
  UpdateResearchPlatformVariables,
  UseCreateResearchPlatformReturn,
  UseDeleteResearchPlatformReturn,
  UseResearchPlatformsReturn,
  UseTestResearchPlatformReturn,
  UseUpdateResearchPlatformReturn,
} from '@/types/research-platform.types';

export function useResearchPlatforms(): UseResearchPlatformsReturn {
  const query = useQuery({
    queryKey: queryKeys.researchPlatforms.list(),
    queryFn: () => researchPlatformRepository.list(),
    staleTime: 30_000,
  });
  return { platforms: query.data ?? [], isLoading: query.isLoading, isError: query.isError };
}

export function useCreateResearchPlatform(): UseCreateResearchPlatformReturn {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (body: CreateResearchPlatformRequest) => researchPlatformRepository.create(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.researchPlatforms.all });
    },
  });
  return { mutateAsync: m.mutateAsync, isPending: m.isPending };
}

export function useUpdateResearchPlatform(): UseUpdateResearchPlatformReturn {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: ({ id, body }: UpdateResearchPlatformVariables) =>
      researchPlatformRepository.update(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.researchPlatforms.all });
    },
  });
  return {
    mutateAsync: m.mutateAsync,
    isPending: m.isPending,
    pendingId: m.isPending ? (m.variables?.id ?? null) : null,
  };
}

export function useDeleteResearchPlatform(): UseDeleteResearchPlatformReturn {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (id: string) => researchPlatformRepository.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.researchPlatforms.all });
    },
  });
  return { mutateAsync: m.mutateAsync, isPending: m.isPending };
}

/** One sample query; several rows may test at once, so pending state is tracked per row by the caller. */
export function useTestResearchPlatform(): UseTestResearchPlatformReturn {
  const m = useMutation({ mutationFn: (id: string) => researchPlatformRepository.test(id) });
  return { mutateAsync: m.mutateAsync };
}
