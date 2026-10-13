'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { useContextSaveProposalStore } from '@/stores/context-save-proposal.store';
import type { ContextSaveChoiceRequest, UseContextSaveCardReturn } from '@/types';
import { invalidateThreadMessages, showToast } from '@/utilities';

/**
 * The "which pack?" answer for one chat save (ADR-134). The server claims the
 * save atomically, so a double click saves once; on success the thread's
 * messages are refetched and the card re-renders as saved from the stored
 * record — the same thing a reload shows. Also drives a proposal's card
 * (ADR-168): reopen the dialog, or say "not now".
 */
export function useContextSaveCard(messageId: string, threadId: string): UseContextSaveCardReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: (choice: ContextSaveChoiceRequest) =>
      chatRepository.chooseContextSavePack(messageId, choice),
    onSuccess: () => {
      invalidateThreadMessages(queryClient, threadId);
      showToast.success({ description: t('chat.contextSave.packSaved') });
    },
    onError: (error: unknown) => {
      invalidateThreadMessages(queryClient, threadId);
      showToast.apiError(error, t('chat.contextSave.failedTitle'));
    },
  });
  // "Not now" on a proposal: the server forgets it, the card goes away.
  const dismissMutation = useMutation({
    mutationFn: () => chatRepository.dismissContextSave(messageId),
    onSuccess: () => invalidateThreadMessages(queryClient, threadId),
    onError: (error: unknown) => showToast.apiError(error, t('chat.contextSave.failedTitle')),
  });
  const openProposal = useContextSaveProposalStore((state) => state.open);
  return {
    review: () => openProposal(messageId),
    dismiss: () => dismissMutation.mutate(),
    isDismissing: dismissMutation.isPending,
    choosePack: (packId: string) => mutate({ packId }),
    chooseNewPack: () => mutate({ newPack: true }),
    isPending,
  };
}
