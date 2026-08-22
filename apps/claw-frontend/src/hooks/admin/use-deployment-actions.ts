import { DeploymentTriggerMode } from '@claw/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { DEPLOYMENT_SHA_PATTERN } from '@/constants/deployment.constants';
import { useTranslation } from '@/lib/i18n';
import { deploymentRepository } from '@/repositories/admin/deployment.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  DeploymentTriggerInput,
  UseDeploymentActionsResult,
} from '@/types/deployment-page.types';
import { showToast } from '@/utilities';

/**
 * The manual lane: dispatch a rollout, clear a stuck one, and pause or resume
 * the automatic lane. Every mutation refetches the status so the page shows
 * what the box now reports rather than what the button implied.
 */
export function useDeploymentActions(): UseDeploymentActionsResult {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [targetSha, setTargetSha] = useState('');
  const [pendingMode, setPendingMode] = useState<DeploymentTriggerMode | null>(null);
  const invalidate = useCallback((): void => {
    void client.invalidateQueries({ queryKey: queryKeys.adminDeployment.all });
  }, [client]);

  const triggerMutation = useMutation({
    mutationFn: (input: DeploymentTriggerInput) => deploymentRepository.trigger(input),
    onMutate: (input) => setPendingMode(input.mode),
    onSuccess: () => {
      showToast.success({ description: t('adminDeployment.triggerStarted') });
      setTargetSha('');
      invalidate();
    },
    onError: (error: Error) => showToast.apiError(error, t('adminDeployment.triggerError')),
    onSettled: () => setPendingMode(null),
  });

  const resetMutation = useMutation({
    mutationFn: () => deploymentRepository.reset(),
    onSuccess: (result) => {
      showToast.success({
        description: result.reset
          ? t('adminDeployment.resetCleared')
          : t('adminDeployment.resetNothingToClear'),
      });
      invalidate();
    },
    onError: (error: Error) => showToast.apiError(error, t('adminDeployment.resetError')),
  });

  const automationMutation = useMutation({
    mutationFn: (enabled: boolean) => deploymentRepository.setAutomation(enabled),
    onSuccess: (flags) => {
      showToast.success({
        description: flags.automaticDeployEnabled
          ? t('adminDeployment.automaticResumed')
          : t('adminDeployment.automaticPaused'),
      });
      invalidate();
    },
    onError: (error: Error) => showToast.apiError(error, t('adminDeployment.automaticError')),
  });

  const isShaValid = DEPLOYMENT_SHA_PATTERN.test(targetSha.trim());
  const isBusy =
    triggerMutation.isPending || resetMutation.isPending || automationMutation.isPending;

  return {
    targetSha,
    setTargetSha,
    isShaValid,
    pendingMode,
    isResetting: resetMutation.isPending,
    isSwitchingAutomation: automationMutation.isPending,
    isBusy,
    deployLatest: useCallback(
      (): void => triggerMutation.mutate({ mode: DeploymentTriggerMode.LATEST }),
      [triggerMutation],
    ),
    redeploy: useCallback(
      (): void => triggerMutation.mutate({ mode: DeploymentTriggerMode.REDEPLOY }),
      [triggerMutation],
    ),
    deploySha: useCallback((): void => {
      const sha = targetSha.trim();
      if (!DEPLOYMENT_SHA_PATTERN.test(sha)) {
        return;
      }
      triggerMutation.mutate({ mode: DeploymentTriggerMode.SHA, targetSha: sha });
    }, [targetSha, triggerMutation]),
    reset: useCallback((): void => resetMutation.mutate(), [resetMutation]),
    setAutomaticDeploy: useCallback(
      (enabled: boolean): void => automationMutation.mutate(enabled),
      [automationMutation],
    ),
  };
}
