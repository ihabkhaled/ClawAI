import { useCallback, useState } from 'react';

import { REPAIR_CONTENT_MIN_LENGTH } from '@/constants';
import type { RepairType } from '@/enums/repair-type.enum';
import { useRepairPoll } from '@/hooks/chat/use-repair-poll';
import { useSendRepair } from '@/hooks/chat/use-send-repair';
import { useTranslation } from '@/lib/i18n';
import type { AdvancedModuleModelSelection, UseRepairPageReturn } from '@/types';
import { buildAdvancedModelSelectionPayload } from '@/utilities';

export function useRepairPage(): UseRepairPageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [selectedRepairTypes, setSelectedRepairTypes] = useState<RepairType[]>([]);
  const [selectedModel, setSelectedModel] = useState<AdvancedModuleModelSelection>(null);

  const { send, result, isPending, isError } = useSendRepair();

  const threadId = result?.threadId ?? null;
  const { repairMessage, isPolling, isRepairReady, isRepairError, handleViewInThread } =
    useRepairPoll(threadId);

  const handleToggleRepairType = useCallback((type: RepairType): void => {
    setSelectedRepairTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  }, []);

  const canSend =
    content.trim().length >= REPAIR_CONTENT_MIN_LENGTH &&
    selectedRepairTypes.length > 0 &&
    !isPending &&
    !isPolling;

  const handleSend = useCallback((): void => {
    if (!canSend) {
      return;
    }
    send({
      content: content.trim(),
      repairTypes: selectedRepairTypes,
      targetProvider: selectedModel?.provider,
      targetModel: selectedModel?.model,
      ...buildAdvancedModelSelectionPayload(selectedModel),
    });
  }, [canSend, send, content, selectedRepairTypes, selectedModel]);

  return {
    t,
    content,
    setContent,
    selectedRepairTypes,
    handleToggleRepairType,
    selectedModel,
    setSelectedModel,
    handleSend,
    isPending,
    isError,
    isRepairError,
    canSend,
    repairMessage,
    isPolling,
    isRepairReady,
    handleViewInThread,
  };
}
