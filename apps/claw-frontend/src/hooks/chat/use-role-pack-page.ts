import { useCallback, useMemo, useState } from 'react';

import { ROLE_PACK_CONTENT_MIN_LENGTH } from '@/constants';
import { RolePackName } from '@/enums/role-pack.enum';
import { useOrchestrationComposer } from '@/hooks/chat/use-orchestration-composer';
import { useRolePackPoll } from '@/hooks/chat/use-role-pack-poll';
import { useRolePackStages } from '@/hooks/chat/use-role-pack-stages';
import { useSendRolePack } from '@/hooks/chat/use-send-role-pack';
import { useTranslation } from '@/lib/i18n';
import type { AdvancedModuleModelSelection, RolePack, UseRolePackPageReturn } from '@/types';
import { buildAdvancedModelSelectionPayload } from '@/utilities';
import { hasSendableInput } from '@/utilities/composer-send.utility';

export function useRolePackPage(): UseRolePackPageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [pack, setPack] = useState<RolePack>(RolePackName.CodingTeam);
  const [selectedModel, setSelectedModel] = useState<AdvancedModuleModelSelection>(null);
  const composer = useOrchestrationComposer();

  const { mutate, data: sendResult, isPending, isError, error: sendError } = useSendRolePack();

  const threadId = sendResult?.threadId ?? null;
  const { rolePackResult, isPolling, isRolePackReady, isRolePackError, handleViewInThread } =
    useRolePackPoll(threadId);

  const stagesEnabled = isPending || isPolling || (threadId !== null && !isRolePackReady);
  const { stages } = useRolePackStages(threadId, stagesEnabled);

  const canSend =
    hasSendableInput(content, composer.selectedFileIds.length, ROLE_PACK_CONTENT_MIN_LENGTH) &&
    !isPending &&
    !isPolling;
  const canSubmit = canSend && selectedModel !== null;

  const handleSend = useCallback((): void => {
    if (!canSubmit) {
      return;
    }
    mutate({
      content: content.trim(),
      pack,
      ...buildAdvancedModelSelectionPayload(selectedModel),
      ...(composer.selectedFileIds.length > 0 ? { fileIds: composer.selectedFileIds } : {}),
      // Web research. Empty object when the mode is NONE, so "no research"
      // reaches the DTO as an absent field, exactly like `fileIds`.
      ...composer.researchPayload,
    });
    composer.clear();
  }, [canSubmit, mutate, content, pack, selectedModel, composer]);

  const errorMessage = useMemo<string | null>(() => {
    if (isError) {
      return sendError?.message ?? t('rolePack.sendFailed');
    }
    if (isRolePackError) {
      return t('rolePack.sendFailed');
    }
    return null;
  }, [isError, isRolePackError, sendError, t]);

  return {
    t,
    content,
    setContent,
    pack,
    setPack,
    selectedModel,
    setSelectedModel,
    handleSend,
    canSend,
    canSubmit,
    isPending,
    isError,
    isRolePackError,
    rolePackResult,
    isPolling,
    isRolePackReady,
    handleViewInThread,
    stages,
    errorMessage,
    composer,
  };
}
