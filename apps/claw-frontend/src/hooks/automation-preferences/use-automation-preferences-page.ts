import { useCallback } from 'react';

import { useCanManageWorkspaceConfig } from '@/hooks/auth/use-can-manage-workspace-config';
import type {
  UpsertAutomationPreferenceRequest,
  UseAutomationPreferencesPageResult,
} from '@/types/automation-preference.types';

import {
  useAutomationPreferencesQuery,
  useUpsertAutomationPreference,
} from './use-automation-preferences';

export function useAutomationPreferencesPage(): UseAutomationPreferencesPageResult {
  const canManage = useCanManageWorkspaceConfig();
  const query = useAutomationPreferencesQuery();
  const mutation = useUpsertAutomationPreference();

  const savePreference = useCallback(
    (actionKind: string, payload: UpsertAutomationPreferenceRequest): void => {
      void mutation.mutateAsync({ actionKind, payload });
    },
    [mutation],
  );

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSaving: mutation.isPending,
    savePreference,
    canManage,
  };
}
