import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import {
  DEPLOYMENT_REF_PATTERN,
  DEPLOYMENT_REPOSITORY_PATTERN,
  DEPLOYMENT_TOKEN_MIN_LENGTH,
} from '@/constants/deployment.constants';
import { useTranslation } from '@/lib/i18n';
import { deploymentRepository } from '@/repositories/admin/deployment.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  DeploymentCredentialInput,
  UseDeploymentCredentialsFormResult,
} from '@/types/deployment-page.types';
import { showToast } from '@/utilities';

/**
 * The credentials form. The token is write-only: it is never fetched, and the
 * field is cleared as soon as a save lands so it does not linger in memory or
 * in a React DevTools tree.
 *
 * An empty token on a save means "keep the stored one", which is what lets an
 * operator correct a repository or ref without re-pasting a secret.
 */
export function useDeploymentCredentialsForm(
  hasStoredCredentials: boolean,
): UseDeploymentCredentialsFormResult {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [repository, setRepository] = useState('');
  const [ref, setRef] = useState('');
  const [token, setToken] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const invalidate = useCallback((): void => {
    void client.invalidateQueries({ queryKey: queryKeys.adminDeployment.all });
  }, [client]);

  const saveMutation = useMutation({
    mutationFn: (input: DeploymentCredentialInput) => deploymentRepository.saveCredentials(input),
    onSuccess: () => {
      showToast.success({ description: t('adminDeployment.credentialsSaved') });
      setToken('');
      setIsEditing(false);
      invalidate();
    },
    onError: (error: Error) => showToast.apiError(error, t('adminDeployment.credentialsSaveError')),
  });

  const clearMutation = useMutation({
    mutationFn: () => deploymentRepository.clearCredentials(),
    onSuccess: () => {
      showToast.success({ description: t('adminDeployment.credentialsCleared') });
      setToken('');
      setIsEditing(false);
      invalidate();
    },
    onError: (error: Error) =>
      showToast.apiError(error, t('adminDeployment.credentialsClearError')),
  });

  const trimmedToken = token.trim();
  const canSave =
    DEPLOYMENT_REPOSITORY_PATTERN.test(repository.trim()) &&
    DEPLOYMENT_REF_PATTERN.test(ref.trim()) &&
    // A token is required only when nothing is stored yet; otherwise blank
    // means keep, and anything typed must be long enough to be a real token.
    (trimmedToken.length === 0
      ? hasStoredCredentials
      : trimmedToken.length >= DEPLOYMENT_TOKEN_MIN_LENGTH);

  return {
    repository,
    setRepository,
    ref,
    setRef,
    token,
    setToken,
    isEditing,
    startEditing: useCallback((): void => setIsEditing(true), []),
    cancelEditing: useCallback((): void => {
      setIsEditing(false);
      setToken('');
    }, []),
    isSaving: saveMutation.isPending,
    isClearing: clearMutation.isPending,
    canSave,
    save: useCallback((): void => {
      if (!canSave) {
        return;
      }
      saveMutation.mutate({
        repository: repository.trim(),
        ref: ref.trim(),
        ...(trimmedToken.length > 0 ? { token: trimmedToken } : {}),
      });
    }, [canSave, repository, ref, trimmedToken, saveMutation]),
    clear: useCallback((): void => clearMutation.mutate(), [clearMutation]),
  };
}
