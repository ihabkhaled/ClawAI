import { useEffect, useState } from 'react';

import { ThreadPublicationCommunityAction } from '@/enums/thread-publication-community-action.enum';
import { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
import { useThreadPublicMutation } from '@/hooks/threads/use-thread-public-mutation';
import type {
  ThreadCommunityActionState,
  ThreadReportReason,
} from '@/types/thread-publication.types';

export function useThreadPublicActions(slug: string): ThreadCommunityActionState {
  const [comment, setComment] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ThreadReportReason>(
    ThreadPublicationReportReason.Other,
  );
  const [reportDetails, setReportDetails] = useState('');
  const mutation = useThreadPublicMutation(slug);

  useEffect(() => {
    if (!mutation.isSuccess) {
      return;
    }
    if (mutation.variables.kind === ThreadPublicationCommunityAction.Comment) {
      setComment('');
    }
    if (mutation.variables.kind === ThreadPublicationCommunityAction.ChangeRequest) {
      setSuggestion('');
    }
    if (mutation.variables.kind === ThreadPublicationCommunityAction.Report) {
      setReportTarget(null);
      setReportDetails('');
    }
  }, [mutation.isSuccess, mutation.variables]);

  return {
    comment,
    suggestion,
    reportTarget,
    reportReason,
    reportDetails,
    isSubmitting: mutation.isPending,
    actionComplete: mutation.isSuccess,
    actionFailed: mutation.isError,
    setComment,
    setSuggestion,
    setReportTarget,
    setReportReason,
    setReportDetails,
    submitComment: () =>
      mutation.mutate({ kind: ThreadPublicationCommunityAction.Comment, content: comment.trim() }),
    submitChangeRequest: () =>
      mutation.mutate({
        kind: ThreadPublicationCommunityAction.ChangeRequest,
        suggestion: suggestion.trim(),
      }),
    submitReport: () =>
      mutation.mutate({
        kind: ThreadPublicationCommunityAction.Report,
        ...(reportTarget ? { commentId: reportTarget } : {}),
        reason: reportReason,
        ...(reportDetails.trim() ? { details: reportDetails.trim() } : {}),
      }),
    setReaction: (value) =>
      mutation.mutate({ kind: ThreadPublicationCommunityAction.Reaction, value }),
  };
}
