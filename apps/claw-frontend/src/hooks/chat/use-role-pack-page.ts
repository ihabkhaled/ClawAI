import { useCallback, useState } from 'react';

import { ROLE_PACK_CONTENT_MIN_LENGTH } from '@/constants';
import { RolePackName } from '@/enums/role-pack.enum';
import { useRolePackPoll } from '@/hooks/chat/use-role-pack-poll';
import { useSendRolePack } from '@/hooks/chat/use-send-role-pack';
import { useTranslation } from '@/lib/i18n';
import type { RolePack, UseRolePackPageReturn } from '@/types';

export function useRolePackPage(): UseRolePackPageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [pack, setPack] = useState<RolePack>(RolePackName.CodingTeam);

  const { mutate, data: sendResult, isPending, isError } = useSendRolePack();

  const threadId = sendResult?.threadId ?? null;
  const { rolePackResult, isPolling, isRolePackReady, isRolePackError, handleViewInThread } =
    useRolePackPoll(threadId);

  const canSend = content.trim().length >= ROLE_PACK_CONTENT_MIN_LENGTH && !isPending && !isPolling;

  const handleSend = useCallback((): void => {
    if (!canSend) {
      return;
    }
    mutate({ content: content.trim(), pack });
  }, [canSend, mutate, content, pack]);

  return {
    t,
    content,
    setContent,
    pack,
    setPack,
    handleSend,
    canSend,
    isPending,
    isError,
    isRolePackError,
    rolePackResult,
    isPolling,
    isRolePackReady,
    handleViewInThread,
  };
}
