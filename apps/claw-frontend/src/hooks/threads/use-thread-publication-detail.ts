import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { THREAD_REVISION_TERMINAL_STATUSES } from '@/constants/thread-publication.constants';
import type { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';
import { ThreadRevisionField } from '@/enums/thread-revision-field.enum';
import { useThreadPublications } from '@/hooks/threads/use-thread-publications';
import { useTranslation } from '@/lib/i18n';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { ThreadPublicationDetailController } from '@/types/thread-publication.types';
import { downloadThreadExport } from '@/utilities/thread-export-download.utility';
import { createThreadRevisionRequest } from '@/utilities/thread-revision-request.utility';

/**
 * Everything the owner does with one publication after generation starts: follow
 * progress, cancel, edit a capped revision, approve and publish, unpublish and
 * export. The list page and the create modal never carry any of it.
 */
export function useThreadPublicationDetail(
  publicationId: string,
): ThreadPublicationDetailController {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: publications = [] } = useThreadPublications();
  const [editingRevision, setEditingRevision] = useState(false);
  const [revisionMarkdown, setRevisionMarkdown] = useState('');
  const [revisionCapUsd, setRevisionCapUsd] = useState('');
  const [revisionRequestIds, setRevisionRequestIds] = useState({
    idempotencyKey: '',
    correlationId: '',
  });
  const [activeRevisionId, setActiveRevisionId] = useState('');
  const selectedPublication = publications.find(({ id }) => id === publicationId);
  const generation = useQuery({
    queryKey: ['thread-publications', publicationId, 'generation-state'],
    queryFn: () => threadPublicationsRepository.getGenerationState(publicationId),
    enabled: publicationId !== '',
    refetchInterval: (query) =>
      query.state.data?.status === 'WAITING_FOR_REVIEW' ||
      query.state.data?.status === 'FAILED' ||
      query.state.data?.status === 'CANCELLED'
        ? false
        : 3000,
  });
  const revisionReview = useQuery({
    queryKey: ['thread-publications', publicationId, 'revisions', activeRevisionId],
    queryFn: () =>
      threadPublicationsRepository.getRevisionReviewState(publicationId, activeRevisionId),
    enabled: publicationId !== '' && activeRevisionId !== '',
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return query.state.data?.ready || THREAD_REVISION_TERMINAL_STATUSES.includes(status ?? '')
        ? false
        : 3000;
    },
  });
  const cancel = useMutation({
    mutationFn: () => threadPublicationsRepository.cancelGeneration(publicationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['thread-publications', publicationId, 'generation-state'],
      });
    },
  });
  const publish = useMutation({
    mutationFn: () => threadPublicationsRepository.publish(publicationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
      await queryClient.invalidateQueries({
        queryKey: ['thread-publications', publicationId, 'generation-state'],
      });
    },
  });
  const editRevision = useMutation({
    mutationFn: () => {
      const draft = generation.data?.draft;
      if (!draft) {
        throw new Error('The draft is unavailable');
      }
      const request = createThreadRevisionRequest({
        markdown: revisionMarkdown,
        citations: draft.citations,
        spendCapUsd: Number(revisionCapUsd),
        idempotencyKey: revisionRequestIds.idempotencyKey,
        correlationId: revisionRequestIds.correlationId,
      });
      return threadPublicationsRepository.editRevision(publicationId, request);
    },
    onSuccess: async ({ revisionId }) => {
      setActiveRevisionId(revisionId);
      setEditingRevision(false);
      setRevisionRequestIds({ idempotencyKey: '', correlationId: '' });
      publish.reset();
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
    },
  });
  const unpublish = useMutation({
    mutationFn: () => threadPublicationsRepository.unpublish(publicationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['thread-publications', 'mine'] });
      await queryClient.invalidateQueries({
        queryKey: ['thread-publications', publicationId, 'generation-state'],
      });
    },
  });

  const exportPublication = useMutation({
    mutationFn: (format: ThreadPublicationExportFormat) =>
      threadPublicationsRepository.export(publicationId, format),
    onSuccess: ({ format, content }) => downloadThreadExport(format, content),
  });

  const revisionIsTerminal = Boolean(
    revisionReview.data?.ready ||
    THREAD_REVISION_TERMINAL_STATUSES.includes(revisionReview.data?.status ?? ''),
  );

  function getRevisionReviewMessage(): string {
    if (revisionReview.isPending) {
      return t('common.loading');
    }
    if (revisionReview.data?.ready) {
      return t('chat.threadRevisionReady');
    }
    if (THREAD_REVISION_TERMINAL_STATUSES.includes(revisionReview.data?.status ?? '')) {
      return t('chat.threadRevisionNeedsChanges');
    }
    return t('chat.threadRevisionPending');
  }

  function startEditing(): void {
    editRevision.reset();
    setActiveRevisionId('');
    setRevisionMarkdown(generation.data?.draft?.markdown ?? '');
    setRevisionRequestIds({
      idempotencyKey: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
    });
    setEditingRevision(true);
  }

  function changeRevisionField(field: ThreadRevisionField, value: string): void {
    if (field === ThreadRevisionField.Markdown) {
      setRevisionMarkdown(value);
    } else {
      setRevisionCapUsd(value);
    }
    setRevisionRequestIds({
      idempotencyKey: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
    });
  }

  function startRevisionFromChangeRequest(revisionId: string): void {
    setActiveRevisionId(revisionId);
    publish.reset();
  }

  return {
    publicationId,
    selectedPublication,
    generation,
    revisionReview,
    cancel,
    publish,
    editRevision,
    unpublish,
    exportPublication,
    editingRevision,
    setEditingRevision,
    revisionMarkdown,
    revisionCapUsd,
    activeRevisionId,
    hasDraft: Boolean(generation.data?.draft),
    generationFailed: generation.data?.status === 'FAILED',
    generationCancelled: generation.data?.status === 'CANCELLED',
    publicationReady: generation.data?.publicationStatus === 'READY_FOR_REVIEW',
    revisionIsTerminal,
    revisionReviewMessage: getRevisionReviewMessage(),
    startEditing,
    changeRevisionField,
    startRevisionFromChangeRequest,
  };
}
