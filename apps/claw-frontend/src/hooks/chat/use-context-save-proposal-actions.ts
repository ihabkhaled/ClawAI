'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ContextSaveStatus } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { useContextSaveProposalStore } from '@/stores/context-save-proposal.store';
import type {
  ContextSaveProposalConfirmRequest,
  UseContextSaveProposalActionsReturn,
} from '@/types';
import { invalidateThreadMessages, showToast } from '@/utilities';
import { proposalErrorText, proposalFailureText } from '@/utilities/context-save-proposal.utility';

/**
 * Confirm or dismiss one proposed save (ADR-168). The server claims the record
 * atomically, so a double click saves once. A confirm can answer 200 and still
 * not be finished: when one half saved and the other did not, the record comes
 * back PROPOSED with a reason. Only a SAVED record gets the "Saved" toast and
 * closes the dialog; anything else keeps it open with the reason as text and the
 * proposal reduced to what is left, so a retry never re-sends what already saved.
 *
 * The reason is held in the proposal store, keyed by message id: the refetch
 * after a failure can unmount and remount the dialog, and a reason kept in the
 * dialog's own state would vanish with it. The next attempt clears it.
 */
export function useContextSaveProposalActions(
  messageId: string,
  threadId: string,
  onDone: () => void,
): UseContextSaveProposalActionsReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const errorMessage = useContextSaveProposalStore((state) => state.errors[messageId] ?? null);
  const setError = useContextSaveProposalStore((state) => state.setError);
  const clearError = useContextSaveProposalStore((state) => state.clearError);

  const confirmMutation = useMutation({
    mutationFn: (request: ContextSaveProposalConfirmRequest) =>
      chatRepository.confirmContextSave(messageId, request),
    onSuccess: (record) => {
      invalidateThreadMessages(queryClient, threadId);
      if (record.status === ContextSaveStatus.SAVED) {
        showToast.success({ description: t('chat.contextSave.proposal.saved') });
        onDone();
        return;
      }
      if (record.status === ContextSaveStatus.PROPOSED) {
        setError(messageId, proposalErrorText(record.proposalError, t));
        return;
      }
      // Dismissed or claimed elsewhere: nothing is left to retry here.
      onDone();
    },
    // The server may have put the record back to PROPOSED; show what is stored.
    onError: (error: unknown) => {
      invalidateThreadMessages(queryClient, threadId);
      setError(messageId, proposalFailureText(error, t));
    },
  });

  const dismissMutation = useMutation({
    mutationFn: () => chatRepository.dismissContextSave(messageId),
    onSuccess: () => {
      invalidateThreadMessages(queryClient, threadId);
      onDone();
    },
    onError: (error: unknown) => setError(messageId, proposalFailureText(error, t)),
  });

  return {
    confirm: (request) => {
      clearError(messageId);
      confirmMutation.mutate(request);
    },
    dismiss: () => {
      clearError(messageId);
      dismissMutation.mutate();
    },
    isConfirming: confirmMutation.isPending,
    isDismissing: dismissMutation.isPending,
    errorMessage,
  };
}
