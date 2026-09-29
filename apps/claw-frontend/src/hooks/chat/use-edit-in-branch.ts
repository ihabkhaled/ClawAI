'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { ROUTES } from '@/constants';
import { BranchCut } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseEditInBranchReturn } from '@/types';
import { showToast } from '@/utilities';
import { writeComposerDraft } from '@/utilities/composer-draft.utility';

/**
 * Edit without losing anything: branch the conversation just BEFORE this
 * message, put the edited text in the branch's composer, and open it.
 *
 * Nothing is sent. The person reviews the question in its new branch and
 * presses Send, so no provider call — and no charge — happens behind their
 * back, and the original conversation stays exactly as it was.
 */
export function useEditInBranch(threadId: string, messageId: string): UseEditInBranchReturn {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (_text: string) =>
      chatRepository.branchThread(threadId, messageId, BranchCut.BEFORE),
    onSuccess: (branch, text) => {
      writeComposerDraft(branch.id, text);
      void queryClient.invalidateQueries({ queryKey: queryKeys.threads.all });
      showToast.success({ description: t('chat.edit.branchOpened') });
      router.push(ROUTES.CHAT_THREAD(branch.id));
    },
    onError: (error: unknown) => {
      showToast.apiError(error, t('chat.branch.failed'));
    },
  });

  return { editInBranch: mutate, isPending };
}
