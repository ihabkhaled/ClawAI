import { useCallback, useState } from 'react';

import { MAX_PARALLEL_MODELS, MIN_PARALLEL_MODELS } from '@/constants';
import { useParallelCompare } from '@/hooks/chat/use-parallel-compare';

export function useInThreadCompare(threadId: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState<Array<{ provider: string; model: string }>>(
    [],
  );
  const { send, result, isPending, isError } = useParallelCompare();

  const toggleOpen = useCallback(() => setIsOpen((v) => !v), []);

  const handleToggleModel = useCallback((provider: string, model: string, checked: boolean) => {
    setSelectedModels((prev) => {
      if (checked) {
        return prev.length >= MAX_PARALLEL_MODELS ? prev : [...prev, { provider, model }];
      }
      return prev.filter((m) => m.provider !== provider || m.model !== model);
    });
  }, []);

  const canSend = selectedModels.length >= MIN_PARALLEL_MODELS && !isPending;

  const handleCompare = useCallback(
    (prompt: string) => {
      if (!canSend || prompt.trim().length === 0) {
        return;
      }
      send({ threadId, content: prompt.trim(), models: selectedModels });
    },
    [canSend, send, threadId, selectedModels],
  );

  return {
    isOpen,
    toggleOpen,
    selectedModels,
    handleToggleModel,
    handleCompare,
    result,
    isPending,
    isError,
    canSend,
  };
}
