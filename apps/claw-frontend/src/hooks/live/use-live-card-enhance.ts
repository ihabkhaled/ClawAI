import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useAvailableModels } from '@/hooks/chat/use-available-models';
import { useTranslation } from '@/lib/i18n';
import { liveRepository } from '@/repositories/live/live.repository';
import type { UseLiveCardEnhanceResult } from '@/types/live.types';
import { showToast } from '@/utilities';
import { decodeModelValue, groupedModelsToPickerGroups } from '@/utilities/model-selector.utility';

/** Enhance one card: pick a model, see the estimate (`confirm: false`), then confirm and pay. */
export function useLiveCardEnhance(eventId: string): UseLiveCardEnhanceResult {
  const { t } = useTranslation();
  const { groupedModels, isLoading } = useAvailableModels();
  const groups = groupedModelsToPickerGroups(
    groupedModels,
    undefined,
    t('chat.modelSelector.notOnPlan'),
  );
  const [modelValue, setModelValueState] = useState<string | null>(null);
  const estimateMutation = useMutation({
    mutationFn: (model: { provider: string; model: string }) =>
      liveRepository.enhanceEvent(eventId, {
        modelId: model.model,
        provider: model.provider,
        confirm: false,
      }),
    onError: (error: Error) => showToast.apiError(error, t('live.card.enhanceError')),
  });
  const confirmMutation = useMutation({
    mutationFn: (model: { provider: string; model: string }) =>
      liveRepository.enhanceEvent(eventId, {
        modelId: model.model,
        provider: model.provider,
        confirm: true,
      }),
    onError: (error: Error) => showToast.apiError(error, t('live.card.enhanceError')),
  });
  // The backend needs the provider too (model ids may themselves contain a slash).
  const picked = modelValue === null ? null : decodeModelValue(modelValue);
  const { mutate: estimateMutate, reset: resetEstimate } = estimateMutation;
  const { mutate: confirmMutate } = confirmMutation;

  const setModelValue = useCallback(
    (value: string | null): void => {
      setModelValueState(value);
      resetEstimate();
    },
    [resetEstimate],
  );
  return {
    groups,
    isLoadingModels: isLoading,
    modelValue,
    estimateMicroUsd:
      estimateMutation.data?.confirmed === false ? estimateMutation.data.estimatedMicroUsd : null,
    content: confirmMutation.data?.confirmed === true ? confirmMutation.data.body : null,
    isEstimating: estimateMutation.isPending,
    isEnhancing: confirmMutation.isPending,
    setModelValue,
    estimate: () => (picked === null ? undefined : estimateMutate(picked)),
    confirm: () => (picked === null ? undefined : confirmMutate(picked)),
  };
}
