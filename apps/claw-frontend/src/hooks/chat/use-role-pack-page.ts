import { useCallback, useMemo, useState } from 'react';

import { ROLE_PACK_CONTENT_MIN_LENGTH } from '@/constants';
import { RolePackName } from '@/enums/role-pack.enum';
import { useRolePackPoll } from '@/hooks/chat/use-role-pack-poll';
import { useRolePackStages } from '@/hooks/chat/use-role-pack-stages';
import { useSendRolePack } from '@/hooks/chat/use-send-role-pack';
import { useTranslation } from '@/lib/i18n';
import type { AdvancedModuleModelSelection, RolePack, UseRolePackPageReturn } from '@/types';
import { buildAdvancedModelSelectionPayload } from '@/utilities';

export function useRolePackPage(): UseRolePackPageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [pack, setPack] = useState<RolePack>(RolePackName.CodingTeam);
  const [selectedModel, setSelectedModel] = useState<AdvancedModuleModelSelection>(null);

  const { mutate, data: sendResult, isPending, isError, error: sendError } = useSendRolePack();

  const threadId = sendResult?.threadId ?? null;
  const { rolePackResult, isPolling, isRolePackReady, isRolePackError, handleViewInThread } =
    useRolePackPoll(threadId);

  const stagesEnabled = isPending || isPolling || (threadId !== null && !isRolePackReady);
  const { stages } = useRolePackStages(threadId, stagesEnabled);

  const trimmedLength = content.trim().length;
  const canSend = trimmedLength >= ROLE_PACK_CONTENT_MIN_LENGTH && !isPending && !isPolling;
  const canSubmit = canSend && selectedModel !== null;

  const handleSend = useCallback((): void => {
    if (!canSubmit) {
      return;
    }
    mutate({
      content: content.trim(),
      pack,
      ...buildAdvancedModelSelectionPayload(selectedModel),
    });
  }, [canSubmit, mutate, content, pack, selectedModel]);

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
  };
}
