import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/repositories/shared/query-keys';
import {
  listAutomationPreferences,
  upsertAutomationPreference,
} from '@/repositories/workspace/automation-preferences.repository';
import type {
  AutomationPreferenceView,
  UpsertAutomationPreferenceRequest,
} from '@/types/automation-preference.types';

export function useAutomationPreferencesQuery(): {
  data: AutomationPreferenceView[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: queryKeys.automationPreferences.list(),
    queryFn: () => listAutomationPreferences(),
    staleTime: 30_000,
  });
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useUpsertAutomationPreference(): {
  mutateAsync: (params: {
    actionKind: string;
    payload: UpsertAutomationPreferenceRequest;
  }) => Promise<AutomationPreferenceView>;
  isPending: boolean;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (params: { actionKind: string; payload: UpsertAutomationPreferenceRequest }) =>
      upsertAutomationPreference(params.actionKind, params.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.automationPreferences.list() });
    },
  });
  return {
    mutateAsync: (params) => mutation.mutateAsync(params),
    isPending: mutation.isPending,
  };
}
