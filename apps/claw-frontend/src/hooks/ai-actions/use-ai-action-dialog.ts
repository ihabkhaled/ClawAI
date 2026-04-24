import { useCallback, useState } from 'react';

import { AUTO_GROUP_PROVIDER, AUTO_MODEL } from '@/constants/ai-actions.constants';
import type { AiActionKind, AiActionPrivacyClass } from '@/enums/ai-action-kind.enum';
import { useAvailableModelsForAction } from '@/hooks/ai-actions/use-available-models-for-action';
import { useRunAiAction } from '@/hooks/ai-actions/use-run-ai-action';
import type { AiActionResult, UseAiActionDialogResult } from '@/types/ai-action.types';
import { buildSelectionKey, resolvePreferredModel } from '@/utilities/ai-action-model.utility';

export function useAiActionDialog(input: {
  actionKind: AiActionKind;
  privacyClass: AiActionPrivacyClass;
  initialContext: string;
  onGenerated?: (result: AiActionResult) => void;
  onClose: () => void;
}): UseAiActionDialogResult {
  const { groupedModels, isLoading: isLoadingModels } = useAvailableModelsForAction(
    input.actionKind,
  );
  const { result, run, reset, isPending, error } = useRunAiAction();
  const [selectedKey, setSelectedKey] = useState<string>(
    buildSelectionKey(AUTO_GROUP_PROVIDER, AUTO_MODEL.model),
  );
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback((): void => {
    setCopied(false);
    run({
      actionKind: input.actionKind,
      privacyClass: input.privacyClass,
      context: input.initialContext,
      preferredModel: resolvePreferredModel(selectedKey, groupedModels),
    });
  }, [run, input.actionKind, input.privacyClass, input.initialContext, selectedKey, groupedModels]);

  const handleCopy = useCallback((): void => {
    if (result === null) {
      return;
    }
    void navigator.clipboard.writeText(result.content).then(() => {
      setCopied(true);
    });
  }, [result]);

  const handleClose = useCallback((): void => {
    reset();
    setCopied(false);
    input.onClose();
  }, [reset, input]);

  if (result !== null && input.onGenerated !== undefined) {
    input.onGenerated(result);
  }

  return {
    groupedModels,
    isLoadingModels,
    selectedKey,
    setSelectedKey,
    result,
    isPending,
    error,
    copied,
    handleGenerate,
    handleCopy,
    handleClose,
  };
}
