import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { DigestScope } from '@/enums/digest-scope.enum';
import { queryKeys } from '@/repositories/shared/query-keys';
import {
  getDigestPreferences,
  getTodayDigest,
  listDigests,
  triggerMyDigest,
  updateDigestPreferences,
} from '@/repositories/workspace/digest.repository';
import type {
  UpsertDigestPreferenceRequest,
  UseDigestPageResult,
} from '@/types/workspace-digest.types';

export function useDigestPage(): UseDigestPageResult {
  const queryClient = useQueryClient();
  const todayQ = useQuery({
    queryKey: queryKeys.workspaceDigest.today(),
    queryFn: () => getTodayDigest(),
    staleTime: 30_000,
  });
  const historyQ = useQuery({
    queryKey: queryKeys.workspaceDigest.list(DigestScope.DAILY),
    queryFn: () => listDigests(DigestScope.DAILY, 14),
    staleTime: 60_000,
  });
  const prefQ = useQuery({
    queryKey: queryKeys.workspaceDigest.preferences(),
    queryFn: () => getDigestPreferences(),
    staleTime: 60_000,
  });

  const triggerMutation = useMutation({
    mutationFn: (scope: DigestScope) => triggerMyDigest(scope),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDigest.all });
    },
  });
  const prefMutation = useMutation({
    mutationFn: (payload: UpsertDigestPreferenceRequest) => updateDigestPreferences(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDigest.preferences() });
    },
  });

  const trigger = useCallback(
    (scope: DigestScope): void => {
      void triggerMutation.mutateAsync(scope);
    },
    [triggerMutation],
  );

  const savePreference = useCallback(
    (next: UpsertDigestPreferenceRequest): void => {
      void prefMutation.mutateAsync(next);
    },
    [prefMutation],
  );

  return {
    today: todayQ.data ?? null,
    history: historyQ.data ?? [],
    preference: prefQ.data ?? null,
    isLoading: todayQ.isLoading || historyQ.isLoading || prefQ.isLoading,
    isError: todayQ.isError || historyQ.isError || prefQ.isError,
    error: ((todayQ.error ?? historyQ.error ?? prefQ.error) as Error | null) ?? null,
    isTriggering: triggerMutation.isPending,
    isSavingPref: prefMutation.isPending,
    trigger,
    savePreference,
  };
}
