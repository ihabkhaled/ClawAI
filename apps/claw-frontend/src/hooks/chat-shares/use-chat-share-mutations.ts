import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { CHAT_SHARE_ACTIONS } from '@/constants/chat-share.constants';
import { useLocale } from '@/hooks/use-locale';
import { useTranslation } from '@/lib/i18n';
import { chatSharesRepository } from '@/repositories/chat-shares/chat-shares.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseChatShareMutationsReturn } from '@/types/chat-share-hook.types';
import { resolveChatShareErrorKey } from '@/utilities/chat-share-error.utility';
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
  const { locale } = useLocale();
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

  /**
   * `messageKey` is the generic "this action failed" line. When the backend
   * named a specific cause, that wins: "this conversation has no messages yet"
   * tells the owner what to do, "Could not publish this chat" does not.
   *
   * The resolved message is also passed to the toast as its fallback, because
   * `apiError` would otherwise print `error.message` — which for a
   * BusinessException is the raw key `chat.share.errors.EMPTY_THREAD`.
   */
  const fail = useCallback(
    (mutationError: unknown, messageKey: string): void => {
      const message = t(resolveChatShareErrorKey(mutationError, messageKey));
      setPendingAction(null);
      setError(message);
      showToast.apiError(mutationError, message);
    },
    [t],
  );

  const publishMutation = useMutation({
    mutationFn: (allowIndexing: boolean) =>
      chatSharesRepository.publish(threadId as string, {
        allowIndexing,
        // The backend declares this `z.literal(true)` — it is a precondition the
        // request asserts, not a preference it reports. Omitting it was a 400 on
        // every publish attempt, which left the whole feature unusable: no share
        // was ever created, so every follow-up call 404'd.
        //
        // The dialog independently refuses to call this until the user has ticked
        // the acknowledgement, so asserting it here is not a bypass of that gate.
        acknowledgedPublicWarning: true,
        contentLocale: locale,
      }),
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
