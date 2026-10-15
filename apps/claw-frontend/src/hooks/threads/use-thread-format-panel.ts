import type { ThreadFormatPreview } from '@claw/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  THREAD_FORMAT_ACCEPT_CAP_USD,
  ThreadFormatView,
} from '@/constants/thread-format.constants';
import { useTranslation } from '@/lib/i18n';
import { threadFormatRepository } from '@/repositories/threads/thread-format.repository';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadFormatPanelController } from '@/types/thread-format.types';
import type { ThreadPublicationDetailController } from '@/types/thread-publication.types';
import {
  threadFormatErrorKey,
  threadFormatSkippedMessage,
} from '@/utilities/thread-format-message.utility';
import { createThreadRevisionRequest } from '@/utilities/thread-revision-request.utility';

/**
 * "Improve formatting with AI" for the owner: ask for a preview, compare it with the current
 * text, then use it (saved as an ordinary edit, which the Judge and Critic review again before
 * anything is published) or discard it. Each click of "Improve" gets its own idempotency key, so
 * a double click returns the same preview instead of spending twice.
 */
export function useThreadFormatPanel(
  detail: ThreadPublicationDetailController,
): ThreadFormatPanelController {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<ThreadFormatPreview | null>(null);
  const [view, setView] = useState<ThreadFormatView>(ThreadFormatView.After);
  const [accepted, setAccepted] = useState(false);
  const [requestIds, setRequestIds] = useState({ idempotencyKey: '', correlationId: '' });

  const run = useMutation({
    mutationFn: () => {
      const ids = { idempotencyKey: crypto.randomUUID(), correlationId: crypto.randomUUID() };
      setRequestIds(ids);
      return threadFormatRepository.preview(detail.publicationId, ids);
    },
    onSuccess: (result) => {
      setPreview(result);
      setView(ThreadFormatView.After);
      setAccepted(false);
    },
  });

  const accept = useMutation({
    mutationFn: () => {
      if (!preview) {
        throw new Error('There is no preview to use');
      }
      return threadPublicationsRepository.editRevision(
        detail.publicationId,
        createThreadRevisionRequest({
          markdown: preview.markdown,
          citations: preview.citations,
          spendCapUsd: THREAD_FORMAT_ACCEPT_CAP_USD,
          idempotencyKey: `format-accept:${requestIds.idempotencyKey}`,
          correlationId: requestIds.correlationId,
        }),
      );
    },
    onSuccess: async ({ revisionId }) => {
      detail.startRevisionFromChangeRequest(revisionId);
      setAccepted(true);
      setPreview(null);
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
      await queryClient.invalidateQueries({
        queryKey: ['thread-publications', detail.publicationId, 'generation-state'],
      });
    },
  });

  const failure = run.error ?? accept.error;
  const skipped = preview?.status === 'SKIPPED' ? threadFormatSkippedMessage(preview.code) : null;
  return {
    preview,
    view,
    setView,
    accepted,
    run: () => {
      accept.reset();
      run.mutate();
    },
    accept: () => {
      accept.mutate();
    },
    discard: () => {
      setPreview(null);
      run.reset();
      accept.reset();
    },
    isRunning: run.isPending,
    isAccepting: accept.isPending,
    errorText: failure ? t(threadFormatErrorKey(failure)) : null,
    skippedText: skipped ? t(skipped.key, skipped.params) : null,
    canRun: !run.isPending && !accept.isPending,
    contentLocale: preview?.contentLocale ?? 'en',
  };
}
