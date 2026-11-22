import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useAdminLivePolicyForm } from '@/hooks/admin/live/use-admin-live-policy-form';
import { useTranslation } from '@/lib/i18n';
import { liveAdminRepository } from '@/repositories/live/live-admin.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseAdminLivePolicyResult } from '@/types/live-admin.types';
import { showToast } from '@/utilities';

/** The versioned policy: read, save a new version, roll back to an older one (confirmed). */
export function useAdminLivePolicy(): UseAdminLivePolicyResult {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [rollbackVersion, setRollbackVersion] = useState<number | null>(null);
  const query = useQuery({
    queryKey: queryKeys.live.adminPolicy(),
    queryFn: () => liveAdminRepository.getPolicy(),
  });
  const activePolicy = query.data?.active ?? null;
  const form = useAdminLivePolicyForm(activePolicy);
  // PUT and rollback answer with the new version only, so the version list is refetched.
  const onSaved = (key: string) => (): void => {
    void client.invalidateQueries({ queryKey: queryKeys.live.adminPolicy() });
    showToast.success({ description: t(key) });
  };
  const saveMutation = useMutation({
    mutationFn: liveAdminRepository.savePolicy,
    onSuccess: onSaved('live.admin.saved'),
    onError: (error: Error) => showToast.apiError(error, t('live.admin.saveError')),
  });
  const rollbackMutation = useMutation({
    mutationFn: liveAdminRepository.rollbackPolicy,
    onSuccess: onSaved('live.admin.rolledBack'),
    onError: (error: Error) => showToast.apiError(error, t('live.admin.rollbackError')),
    onSettled: () => setRollbackVersion(null),
  });
  const { build, values } = form;
  const { mutate: saveMutate } = saveMutation;
  const { mutate: rollbackMutate } = rollbackMutation;
  const save = useCallback((): void => {
    const result = build();
    if (result?.config) {
      saveMutate({ config: result.config, note: values?.note ?? '' });
    }
  }, [build, saveMutate, values?.note]);

  return {
    policy: query.data ?? null,
    activePolicy,
    isPolicyLoading: query.isLoading,
    isPolicyError: query.isError,
    form,
    isSaving: saveMutation.isPending,
    save,
    rollbackVersion,
    isRollingBack: rollbackMutation.isPending,
    askRollback: setRollbackVersion,
    confirmRollback: () => (rollbackVersion === null ? undefined : rollbackMutate(rollbackVersion)),
  };
}
