'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseMessageEditReturn } from '@/types';
import { showToast } from '@/utilities';

/**
 * Rewrites one prompt and runs the thread again from that point.
 *
 * The dialog exists because the action is destructive in a way a button label
 * cannot carry: everything below the edited message is deleted server-side,
 * since those were answers to a question that no longer exists. A reader has to
 * be told that before it happens, not after.
 *
 * The draft is seeded on open rather than held permanently: reopening after a
 * cancel should show the message as it stands, not the abandoned attempt.
 */
export function useMessageEdit(
  messageId: string,
  content: string,
  onRerunStarted?: () => void,
): UseMessageEditReturn {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isOpen, setOpen] = useState(false);
  const [draft, setDraft] = useState(content);

  const { mutate, isPending } = useMutation({
    mutationFn: (next: string) => chatRepository.editMessage(messageId, next),
    onSuccess: () => {
      setOpen(false);
      // Both lists: the thread's messages changed, and the thread row's
      // preview and timestamp changed with them.
      void queryClient.invalidateQueries({ queryKey: queryKeys.threads.all });
      // A successful edit starts a run, exactly as sending or regenerating
      // does, and the page has to be told so it subscribes and polls for the
      // answer. Without this the run is invisible: the reply lands in the
      // database and shows up only when something else happens to refetch.
      onRerunStarted?.();
      showToast.success({ description: t('chat.edit.succeeded') });
    },
    onError: (error: unknown) => {
      showToast.apiError(error, t('chat.edit.failed'));
    },
  });

  const open = useCallback((): void => {
    setDraft(content);
    setOpen(true);
  }, [content]);

  const save = useCallback((): void => {
    const trimmed = draft.trim();
    if (trimmed.length === 0 || trimmed === content.trim()) {
      setOpen(false);
      return;
    }
    mutate(trimmed);
  }, [content, draft, mutate]);

  return {
    isOpen,
    open,
    close: () => setOpen(false),
    draft,
    setDraft,
    save,
    isPending,
    // An unchanged or empty draft is a no-op, and the server refuses it anyway.
    canSave: draft.trim().length > 0 && draft.trim() !== content.trim(),
  };
}
