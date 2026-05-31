import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { CompareResearchMode, PlanFeature } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import type { ParallelRequest, UseParallelCompareReturn } from '@/types';
import { detectPlanFeatureGate, logger, showToast } from '@/utilities';

export function useParallelCompare(): UseParallelCompareReturn {
  const { t } = useTranslation();
  const [upgradeFeature, setUpgradeFeature] = useState<PlanFeature | null>(null);

  const mutation = useMutation({
    mutationFn: (data: ParallelRequest) => {
      logger.info({
        component: 'parallel-compare',
        action: 'send-parallel-start',
        message: 'Sending parallel compare request',
        details: { modelCount: data.models.length },
      });
      return chatRepository.sendParallel(data);
    },
    onSuccess: (data) => {
      setUpgradeFeature(null);
      logger.info({
        component: 'parallel-compare',
        action: 'send-parallel-success',
        message: 'Parallel compare started, polling for results',
        details: { threadId: data.threadId },
      });
    },
    onError: (error: Error, variables) => {
      logger.error({
        component: 'parallel-compare',
        action: 'send-parallel-error',
        message: error.message,
      });
      // Detect plan-feature 403s and surface a tailored upgrade CTA instead
      // of a generic toast. Priority order mirrors the BE assertCompareAccess
      // gate order: critic > judge > research > compare. The user upgrades to
      // unlock the most specific feature they tried to use.
      const requestedFeatures: PlanFeature[] = [];
      if (variables.criticEnabled === true) {
        requestedFeatures.push(PlanFeature.ALLOW_CRITIC_REVIEW);
      }
      if (variables.judgeEnabled === true) {
        requestedFeatures.push(PlanFeature.ALLOW_JUDGE_MODE);
      }
      if (
        variables.researchMode !== undefined &&
        variables.researchMode !== CompareResearchMode.NONE
      ) {
        requestedFeatures.push(PlanFeature.ALLOW_RESEARCH_MODE);
      }
      requestedFeatures.push(PlanFeature.ALLOW_COMPARE_MODE);

      const gate = detectPlanFeatureGate(error, requestedFeatures);
      if (gate !== null) {
        setUpgradeFeature(gate);
        return;
      }
      showToast.apiError(error, t('compare.compareFailed'));
    },
  });

  const clearUpgradeFeature = useCallback((): void => {
    setUpgradeFeature(null);
  }, []);

  return {
    send: mutation.mutate,
    result: mutation.data,
    isPending: mutation.isPending,
    isError: mutation.isError,
    upgradeFeature,
    clearUpgradeFeature,
  };
}
