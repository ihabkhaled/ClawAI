import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { CHAT_SHARE_ACTIONS } from '@/constants/chat-share.constants';
import { useTranslation } from '@/lib/i18n';
import { chatSharesRepository } from '@/repositories/chat-shares/chat-shares.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseChatShareMutationsReturn } from '@/types/chat-share-hook.types';
import { showToast } from '@/utilities/toast.utility';

/**
 * The five share mutations.
 *
 * Each one reports its own name through `pendingAction` rather than a shared
 * `isMutating` boolean, so pressing "update shared version" does not grey out the
 * copy button and the revoke control at the same time.
 *
 * Every mutation surfaces failure twice: a toast (immediate) and a persistent
 * `error` string the dialog renders as a banner. A silent failure here is
 * particularly bad — an owner who clicks "make private" and sees nothing happen
 * will assume their conversation is private when it is not.
 */
export function useChatShareMutations(threadId: string | null): UseChatShareMutationsReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const settle = useCallback(
    async (successKey: string): Promise<void> => {
      setError(null);
      setPendingAction(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.chatShares.all });
      showToast.success({ description: t(successKey) });
    },
    [queryClient, t],
  );

  const fail = useCallback(
    (mutationError: unknown, messageKey: string): void => {
      const message = t(messageKey);
      setPendingAction(null);
      setError(message);
      showToast.apiError(mutationError, message);
    },
    [t],
  );

  const publishMutation = useMutation({
    mutationFn: (allowIndexing: boolean) =>
      chatSharesRepository.publish(threadId as string, { allowIndexing }),
    onSuccess: () => settle('chatShare.toast.published'),
    onError: (mutationError: unknown) => fail(mutationError, 'chatShare.toast.publishFailed'),
  });

  const indexingMutation = useMutation({
    mutationFn: (allowIndexing: boolean) =>
      chatSharesRepository.updateIndexing(threadId as string, { allowIndexing }),
    onSuccess: () => settle('chatShare.toast.indexingUpdated'),
    onError: (mutationError: unknown) => fail(mutationError, 'chatShare.toast.indexingFailed'),
  });

  const refreshMutation = useMutation({
    mutationFn: () => chatSharesRepository.refresh(threadId as string),
    onSuccess: () => settle('chatShare.toast.refreshed'),
    onError: (mutationError: unknown) => fail(mutationError, 'chatShare.toast.refreshFailed'),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => chatSharesRepository.regenerateUrl(threadId as string),
    onSuccess: () => settle('chatShare.toast.urlRegenerated'),
    onError: (mutationError: unknown) => fail(mutationError, 'chatShare.toast.regenerateFailed'),
  });

  const revokeMutation = useMutation({
    mutationFn: () => chatSharesRepository.revoke(threadId as string),
    onSuccess: () => settle('chatShare.toast.revoked'),
    onError: (mutationError: unknown) => fail(mutationError, 'chatShare.toast.revokeFailed'),
  });

  const publish = useCallback(
    (allowIndexing: boolean) => {
      setPendingAction(CHAT_SHARE_ACTIONS.PUBLISH);
      publishMutation.mutate(allowIndexing);
    },
    [publishMutation],
  );

  const setIndexing = useCallback(
    (allowIndexing: boolean) => {
      setPendingAction(CHAT_SHARE_ACTIONS.INDEXING);
      indexingMutation.mutate(allowIndexing);
    },
    [indexingMutation],
  );

  const refresh = useCallback(() => {
    setPendingAction(CHAT_SHARE_ACTIONS.REFRESH);
    refreshMutation.mutate();
  }, [refreshMutation]);

  const regenerateUrl = useCallback(() => {
    setPendingAction(CHAT_SHARE_ACTIONS.REGENERATE);
    regenerateMutation.mutate();
  }, [regenerateMutation]);

  const revoke = useCallback(() => {
    setPendingAction(CHAT_SHARE_ACTIONS.REVOKE);
    revokeMutation.mutate();
  }, [revokeMutation]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    publish,
    setIndexing,
    refresh,
    regenerateUrl,
    revoke,
    pendingAction,
    error,
    clearError,
  };
}
