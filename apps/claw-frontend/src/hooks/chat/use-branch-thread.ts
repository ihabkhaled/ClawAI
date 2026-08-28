'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseBranchThreadReturn } from '@/types';
import { showToast } from '@/utilities';

/**
 * Forks the conversation at one message into a thread of its own.
 *
 * The counterpart to editing: an edit truncates the thread it belongs to,
 * while a branch leaves the original untouched and explores beside it. That is
 * why this one needs no warning — nothing is lost.
 *
 * Navigates to the branch on success, because a copy the person cannot see is
 * indistinguishable from nothing having happened.
 */
export function useBranchThread(threadId: string): UseBranchThreadReturn {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (fromMessageId: string) => chatRepository.branchThread(threadId, fromMessageId),
    onSuccess: (branch) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.threads.all });
      showToast.success({ description: t('chat.branch.succeeded') });
      router.push(ROUTES.CHAT_THREAD(branch.id));
    },
    onError: (error: unknown) => {
      showToast.apiError(error, t('chat.branch.failed'));
    },
  });

  return { branchFrom: mutate, isPending };
}
