'use client';

import { useMemo } from 'react';

import { useRegenerateWithModel } from '@/hooks/chat/use-regenerate-with-model';
import type { ModelPickerProps, PickedModelRecoveryProps, PickedModelRecoveryState } from '@/types';
import type { TranslateFunction } from '@/types/i18n.types';
import { chooseRecoverySuggestions } from '@/utilities/picked-model-fallback.utility';

/**
 * What the "every model failed" reply offers: up to three one-click retries and
 * the full model picker behind "Choose another model". Both end in the same
 * regenerate call as "Try again with…", so the plan check and the credit gate
 * are the server's, exactly as for a new message.
 */
export function usePickedModelRecovery(
  { suggested, failedProvider, failedModel, onPick }: PickedModelRecoveryProps,
  t: TranslateFunction,
): PickedModelRecoveryState {
  const picker = useRegenerateWithModel({ onPick });
  const failed = useMemo(
    () =>
      failedProvider !== null && failedModel !== null
        ? { provider: failedProvider, model: failedModel }
        : null,
    [failedProvider, failedModel],
  );
  const suggestions = useMemo(
    () => chooseRecoverySuggestions(suggested, picker.groups, failed),
    [suggested, picker.groups, failed],
  );
  const pickerProps: ModelPickerProps = {
    ...picker,
    autoOption: undefined,
    placeholder: t('pickedModel.chooseAnother'),
    ariaLabel: t('pickedModel.chooseAnother'),
    triggerClassName: 'h-9 w-auto gap-1 px-3 text-sm',
    useShortTriggerLabel: false,
  };
  return { suggestions, pickerProps };
}
