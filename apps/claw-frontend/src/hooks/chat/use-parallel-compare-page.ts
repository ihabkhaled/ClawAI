import { useCallback, useState } from 'react';

import { MIN_PARALLEL_MODELS, MAX_PARALLEL_MODELS } from '@/constants';
import { useParallelCompare } from '@/hooks/chat/use-parallel-compare';
import { useTranslation } from '@/lib/i18n';
import type { UseParallelComparePageReturn } from '@/types';

export function useParallelComparePage(): UseParallelComparePageReturn {
  const { t } = useTranslation();
  const [selectedModels, setSelectedModels] = useState<Array<{ provider: string; model: string }>>(
    [],
  );
  const [prompt, setPrompt] = useState('');
  const { send, result, isPending, isError } = useParallelCompare();

  const selectionError =
    selectedModels.length > 0 && selectedModels.length < MIN_PARALLEL_MODELS
      ? t('compare.minModels', { min: MIN_PARALLEL_MODELS })
      : null;

  const canSend =
    selectedModels.length >= MIN_PARALLEL_MODELS &&
    selectedModels.length <= MAX_PARALLEL_MODELS &&
    prompt.trim().length > 0 &&
    !isPending;

  const handleToggleModel = useCallback(
    (provider: string, model: string, checked: boolean) => {
      setSelectedModels((prev) => {
        if (checked) {
          if (prev.length >= MAX_PARALLEL_MODELS) {
            return prev;
          }
          return [...prev, { provider, model }];
        }
        return prev.filter((m) => m.provider !== provider || m.model !== model);
      });
    },
    [],
  );

  const handleSend = useCallback(() => {
    if (!canSend) {
      return;
    }
    send({ threadId: '', content: prompt.trim(), models: selectedModels });
  }, [canSend, send, prompt, selectedModels]);

  return {
    t,
    selectedModels,
    prompt,
    setPrompt,
    handleToggleModel,
    handleSend,
    result,
    isPending,
    isError,
    canSend,
    selectionError,
  };
}
