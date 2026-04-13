import { useCallback, useState } from 'react';

import { VERIFIER_CONTENT_MIN_LENGTH } from '@/constants';
import { useSendVerify } from '@/hooks/chat/use-send-verify';
import { useVerifyPoll } from '@/hooks/chat/use-verify-poll';
import { useTranslation } from '@/lib/i18n';
import type { UseVerifyPageReturn } from '@/types';

export function useVerifyPage(): UseVerifyPageReturn {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [maxRevisions, setMaxRevisions] = useState(1);

  const { send, result, isPending, isError } = useSendVerify();

  const threadId = result?.threadId ?? null;
  const { verifyResult, isPolling, isVerifyReady, isVerifyError, handleViewInThread } =
    useVerifyPoll(threadId);

  const canSend = content.trim().length >= VERIFIER_CONTENT_MIN_LENGTH && !isPending && !isPolling;

  const handleSend = useCallback((): void => {
    if (!canSend) {
      return;
    }
    send({
      content: content.trim(),
      maxRevisions,
    });
  }, [canSend, send, content, maxRevisions]);

  return {
    t,
    content,
    setContent,
    maxRevisions,
    setMaxRevisions,
    handleSend,
    canSend,
    isPending,
    isError,
    verifyResult,
    isPolling,
    isVerifyReady,
    isVerifyError,
    handleViewInThread,
  };
}
